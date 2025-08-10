import asyncio
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import pandas as pd
import polars as pl
import numpy as np
from memory_profiler import profile
import psutil
import aiofiles
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import uvloop

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataProcessor:
    """High-performance data processing utility for large datasets"""

    def __init__(self,
                 chunk_size: int = 10000,
                 max_workers: int = 4,
                 memory_limit_gb: int = 4):
        self.chunk_size = chunk_size
        self.max_workers = max_workers
        self.memory_limit_bytes = memory_limit_gb * 1024 * 1024 * 1024
        self.process_pool = ProcessPoolExecutor(max_workers=max_workers)
        self.thread_pool = ThreadPoolExecutor(max_workers=max_workers * 2)

        # Set uvloop for better async performance
        if hasattr(asyncio, 'set_event_loop_policy'):
            asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

    def check_memory_usage(self) -> Dict[str, float]:
        """Monitor memory usage"""
        memory = psutil.virtual_memory()
        process = psutil.Process()

        return {
            'system_memory_percent': memory.percent,
            'system_available_gb': memory.available / (1024**3),
            'process_memory_mb': process.memory_info().rss / (1024**2),
            'memory_limit_gb': self.memory_limit_bytes / (1024**3)
        }

    @profile
    def pandas_optimized_read_csv(self,
                                  file_path: Union[str, Path],
                                  **kwargs) -> pd.DataFrame:
        """Memory-optimized pandas CSV reader"""
        logger.info(f"Reading CSV file: {file_path}")

        # Optimize dtypes to reduce memory usage
        dtype_optimization = {
            'int64': 'int32',
            'float64': 'float32',
        }

        # Read with chunking for large files
        chunks = []
        chunk_iter = pd.read_csv(
            file_path,
            chunksize=self.chunk_size,
            low_memory=False,
            **kwargs
        )

        for i, chunk in enumerate(chunk_iter):
            # Optimize data types
            for col in chunk.select_dtypes(include=['int64', 'float64']):
                if chunk[col].memory_usage(deep=True) > 0:
                    try:
                        if chunk[col].dtype == 'int64':
                            chunk[col] = pd.to_numeric(chunk[col], downcast='integer')
                        elif chunk[col].dtype == 'float64':
                            chunk[col] = pd.to_numeric(chunk[col], downcast='float')
                    except Exception as e:
                        logger.warning(f"Could not optimize column {col}: {e}")

            chunks.append(chunk)

            # Memory management
            memory_info = self.check_memory_usage()
            if memory_info['process_memory_mb'] > (self.memory_limit_bytes / (1024**2)) * 0.8:
                logger.warning(f"High memory usage detected: {memory_info['process_memory_mb']:.2f} MB")
                break

        df = pd.concat(chunks, ignore_index=True)
        logger.info(f"Loaded DataFrame with shape: {df.shape}")
        return df

    def polars_optimized_read_csv(self,
                                  file_path: Union[str, Path],
                                  **kwargs) -> pl.DataFrame:
        """High-performance Polars CSV reader"""
        logger.info(f"Reading CSV with Polars: {file_path}")

        try:
            # Polars is naturally more memory efficient
            df = pl.read_csv(
                file_path,
                batch_size=self.chunk_size,
                low_memory=True,
                **kwargs
            )
            logger.info(f"Loaded Polars DataFrame with shape: {df.shape}")
            return df
        except Exception as e:
            logger.error(f"Error reading with Polars: {e}")
            # Fallback to pandas
            pd_df = self.pandas_optimized_read_csv(file_path, **kwargs)
            return pl.from_pandas(pd_df)

    async def async_read_multiple_files(self,
                                        file_paths: List[Union[str, Path]],
                                        use_polars: bool = True) -> List[Union[pd.DataFrame, pl.DataFrame]]:
        """Asynchronously read multiple files"""
        logger.info(f"Reading {len(file_paths)} files asynchronously")

        async def read_file(file_path):
            loop = asyncio.get_event_loop()
            if use_polars:
                return await loop.run_in_executor(
                    self.process_pool,
                    self.polars_optimized_read_csv,
                    file_path
                )
            else:
                return await loop.run_in_executor(
                    self.process_pool,
                    self.pandas_optimized_read_csv,
                    file_path
                )

        tasks = [read_file(file_path) for file_path in file_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        successful_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error reading file {file_paths[i]}: {result}")
            else:
                successful_results.append(result)

        return successful_results

    def parallel_transform(self,
                          df: Union[pd.DataFrame, pl.DataFrame],
                          transform_func: callable,
                          column: str) -> Union[pd.DataFrame, pl.DataFrame]:
        """Apply transformations in parallel"""
        logger.info(f"Applying parallel transformation to column: {column}")

        if isinstance(df, pl.DataFrame):
            # Polars has built-in parallelization
            return df.with_columns(
                pl.col(column).map_elements(transform_func).alias(f"{column}_transformed")
            )
        else:
            # For pandas, use multiprocessing
            chunks = np.array_split(df, self.max_workers)

            def transform_chunk(chunk):
                chunk = chunk.copy()
                chunk[f"{column}_transformed"] = chunk[column].apply(transform_func)
                return chunk

            with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
                transformed_chunks = list(executor.map(transform_chunk, chunks))

            return pd.concat(transformed_chunks, ignore_index=True)

    async def async_write_to_database(self,
                                      df: Union[pd.DataFrame, pl.DataFrame],
                                      table_name: str,
                                      connection_string: str,
                                      batch_size: int = None) -> bool:
        """Asynchronously write DataFrame to database"""
        if batch_size is None:
            batch_size = self.chunk_size

        logger.info(f"Writing DataFrame to database table: {table_name}")

        try:
            if isinstance(df, pl.DataFrame):
                # Convert to pandas for database operations
                df = df.to_pandas()

            # Write in batches to avoid memory issues
            total_rows = len(df)
            batches = [df[i:i+batch_size] for i in range(0, total_rows, batch_size)]

            async def write_batch(batch, batch_num):
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(
                    self.thread_pool,
                    lambda: batch.to_sql(
                        table_name,
                        connection_string,
                        if_exists='append' if batch_num > 0 else 'replace',
                        index=False,
                        method='multi',
                        chunksize=1000
                    )
                )

            tasks = [write_batch(batch, i) for i, batch in enumerate(batches)]
            await asyncio.gather(*tasks)

            logger.info(f"Successfully wrote {total_rows} rows to {table_name}")
            return True

        except Exception as e:
            logger.error(f"Error writing to database: {e}")
            return False

    def cleanup_dataframe(self, df: Union[pd.DataFrame, pl.DataFrame]) -> Union[pd.DataFrame, pl.DataFrame]:
        """Clean up DataFrame to free memory"""
        if isinstance(df, pd.DataFrame):
            # Standard pandas cleanup operations
            df = df.dropna(subset=df.columns[df.isnull().sum() < len(df) * 0.5])  # Drop columns with >50% nulls

            # Optimize dtypes
            for col in df.select_dtypes(include=['object']):
                try:
                    df[col] = pd.to_numeric(df[col], errors='ignore')
                except:
                    pass

            # Category optimization for string columns with low cardinality
            for col in df.select_dtypes(include=['object']):
                if df[col].nunique() / len(df) < 0.5:
                    df[col] = df[col].astype('category')
        else:
            # Polars cleanup operations
            df = df.drop_nulls()  # Basic null handling

        return df

    def get_processing_stats(self) -> Dict[str, Any]:
        """Get processing statistics"""
        memory_info = self.check_memory_usage()
        cpu_percent = psutil.cpu_percent(interval=1)

        return {
            'timestamp': time.time(),
            'memory_info': memory_info,
            'cpu_percent': cpu_percent,
            'max_workers': self.max_workers,
            'chunk_size': self.chunk_size
        }

    def __del__(self):
        """Cleanup resources"""
        if hasattr(self, 'process_pool'):
            self.process_pool.shutdown(wait=True)
        if hasattr(self, 'thread_pool'):
            self.thread_pool.shutdown(wait=True)
