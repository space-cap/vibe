from datetime import datetime, timedelta
import os
import logging
from typing import Dict, Any, List
import pandas as pd
import polars as pl

from airflow import DAG
from airflow.decorators import task
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.providers.http.sensors.http import HttpSensor
from airflow.operators.python import PythonOperator
from airflow.operators.email import EmailOperator
from airflow.models import Variable
from airflow.utils.task_group import TaskGroup

# Import custom utilities
import sys
sys.path.append('/app/airflow')

from utils.data_processor import DataProcessor
from utils.retry_handler import RetryHandler, RetryStrategy, async_retry, CircuitBreaker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# DAG Configuration
DEFAULT_ARGS = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email': ['admin@company.com'],
    'email_on_failure': True,
    'email_on_retry': True,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True,
    'max_retry_delay': timedelta(minutes=30),
    'execution_timeout': timedelta(hours=2),
}

# DAG Definition
dag = DAG(
    'large_data_etl_pipeline',
    default_args=DEFAULT_ARGS,
    description='Enterprise-grade ETL pipeline for large datasets',
    schedule_interval=timedelta(hours=1),  # Run every hour
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=2,
    max_active_tasks=10,
    tags=['etl', 'big-data', 'production']
)

# Initialize components
data_processor = DataProcessor(
    chunk_size=int(Variable.get('CHUNK_SIZE', default_var=10000)),
    max_workers=int(Variable.get('MAX_WORKERS', default_var=4)),
    memory_limit_gb=int(Variable.get('MEMORY_LIMIT_GB', default_var=4))
)

retry_handler = RetryHandler(
    max_retries=5,
    base_delay=2.0,
    strategy=RetryStrategy.EXPONENTIAL,
    backoff_factor=2.0
)

# Circuit breaker for external API calls
api_circuit_breaker = CircuitBreaker(
    failure_threshold=3,
    recovery_timeout=120.0
)


@task
def check_data_sources(**context) -> Dict[str, Any]:
    """Check if data sources are available and accessible"""
    logger.info("Checking data source availability...")

    data_sources = {
        'raw_data_api': Variable.get('RAW_DATA_API_URL', default_var='http://localhost:8080/api/data'),
        'database': Variable.get('DATABASE_URL', default_var='postgresql://airflow:airflow@postgres:5432/airflow'),
        'file_system': Variable.get('DATA_PATH', default_var='/app/airflow/data/raw')
    }

    availability_status = {}

    for source_name, source_url in data_sources.items():
        try:
            if source_name == 'database':
                hook = PostgresHook(postgres_conn_id='postgres_default')
                hook.get_conn()
                availability_status[source_name] = 'available'
            elif source_name == 'file_system':
                if os.path.exists(source_url):
                    availability_status[source_name] = 'available'
                else:
                    availability_status[source_name] = 'unavailable'
            else:
                # For API endpoints, we'll assume they're available
                availability_status[source_name] = 'available'

        except Exception as e:
            logger.error(f"Error checking {source_name}: {str(e)}")
            availability_status[source_name] = 'unavailable'

    logger.info(f"Data source availability: {availability_status}")
    return availability_status


@task
@async_retry(max_retries=5, base_delay=3.0, strategy=RetryStrategy.EXPONENTIAL)
def extract_raw_data(source_check_result: Dict[str, Any], **context) -> Dict[str, Any]:
    """Extract raw data from multiple sources with retry logic"""
    logger.info("Starting data extraction process...")

    if source_check_result.get('raw_data_api') != 'available':
        raise Exception("Raw data API is not available")

    extracted_files = []

    # Simulate extracting from multiple file sources
    raw_data_path = Variable.get('DATA_PATH', default_var='/app/airflow/data/raw')

    try:
        # Create sample data if not exists (for demo purposes)
        sample_files = []
        for i in range(3):
            file_path = f"{raw_data_path}/sample_data_{i}.csv"
            if not os.path.exists(file_path):
                # Create sample data
                sample_data = pd.DataFrame({
                    'id': range(1000 * i, 1000 * (i + 1)),
                    'timestamp': pd.date_range('2024-01-01', periods=1000, freq='1min'),
                    'value': pd.np.random.randn(1000),
                    'category': pd.np.random.choice(['A', 'B', 'C'], 1000),
                    'amount': pd.np.random.uniform(10, 1000, 1000)
                })
                sample_data.to_csv(file_path, index=False)

            sample_files.append(file_path)

        # Extract file information
        for file_path in sample_files:
            if os.path.exists(file_path):
                file_stats = os.stat(file_path)
                extracted_files.append({
                    'file_path': file_path,
                    'size_mb': file_stats.st_size / (1024 * 1024),
                    'modified_time': datetime.fromtimestamp(file_stats.st_mtime).isoformat()
                })

        logger.info(f"Successfully extracted {len(extracted_files)} files")
        return {
            'extracted_files': extracted_files,
            'total_files': len(extracted_files),
            'extraction_timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error in data extraction: {str(e)}")
        raise


@task
def transform_data_pandas(extraction_result: Dict[str, Any], **context) -> Dict[str, Any]:
    """Transform data using optimized pandas operations"""
    logger.info("Starting pandas data transformation...")

    extracted_files = extraction_result['extracted_files']
    transformed_files = []

    for file_info in extracted_files:
        file_path = file_info['file_path']

        try:
            # Read with optimized pandas
            df = data_processor.pandas_optimized_read_csv(file_path)

            # Apply transformations
            df['value_normalized'] = (df['value'] - df['value'].mean()) / df['value'].std()
            df['amount_log'] = pd.np.log1p(df['amount'])
            df['category_encoded'] = pd.Categorical(df['category']).codes

            # Data quality checks
            initial_rows = len(df)
            df = df.dropna()
            final_rows = len(df)

            # Apply parallel transformation for complex operations
            df = data_processor.parallel_transform(
                df,
                lambda x: x * 1.1 if x > 0 else x * 0.9,  # Sample transformation
                'value_normalized'
            )

            # Save transformed data
            output_path = file_path.replace('/raw/', '/processed/').replace('.csv', '_transformed.csv')
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            df.to_csv(output_path, index=False)

            transformed_files.append({
                'input_file': file_path,
                'output_file': output_path,
                'initial_rows': initial_rows,
                'final_rows': final_rows,
                'rows_dropped': initial_rows - final_rows,
                'columns': list(df.columns)
            })

        except Exception as e:
            logger.error(f"Error transforming file {file_path}: {str(e)}")
            raise

    logger.info(f"Successfully transformed {len(transformed_files)} files with pandas")
    return {
        'transformed_files': transformed_files,
        'transformation_method': 'pandas',
        'transformation_timestamp': datetime.now().isoformat()
    }


@task
def transform_data_polars(extraction_result: Dict[str, Any], **context) -> Dict[str, Any]:
    """Transform data using high-performance Polars operations"""
    logger.info("Starting polars data transformation...")

    extracted_files = extraction_result['extracted_files']
    transformed_files = []

    for file_info in extracted_files:
        file_path = file_info['file_path']

        try:
            # Read with Polars
            df = data_processor.polars_optimized_read_csv(file_path)

            # Apply transformations with Polars (faster for large datasets)
            df = df.with_columns([
                ((pl.col('value') - pl.col('value').mean()) / pl.col('value').std()).alias('value_normalized'),
                pl.col('amount').log1p().alias('amount_log'),
                pl.col('category').cast(pl.Categorical).to_physical().alias('category_encoded'),
                pl.col('timestamp').str.to_datetime().alias('timestamp_parsed')
            ])

            # Data quality operations
            initial_rows = df.height
            df = df.drop_nulls()
            final_rows = df.height

            # Save transformed data
            output_path = file_path.replace('/raw/', '/processed/').replace('.csv', '_polars_transformed.parquet')
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            df.write_parquet(output_path)

            transformed_files.append({
                'input_file': file_path,
                'output_file': output_path,
                'initial_rows': initial_rows,
                'final_rows': final_rows,
                'rows_dropped': initial_rows - final_rows,
                'columns': df.columns
            })

        except Exception as e:
            logger.error(f"Error transforming file {file_path} with Polars: {str(e)}")
            raise

    logger.info(f"Successfully transformed {len(transformed_files)} files with Polars")
    return {
        'transformed_files': transformed_files,
        'transformation_method': 'polars',
        'transformation_timestamp': datetime.now().isoformat()
    }


@task
@async_retry(max_retries=3, base_delay=5.0)
def load_to_database(pandas_result: Dict[str, Any], polars_result: Dict[str, Any], **context) -> Dict[str, Any]:
    """Load transformed data to database with retry logic"""
    logger.info("Starting database load process...")

    postgres_hook = PostgresHook(postgres_conn_id='postgres_default')

    # Combine results
    all_transformed_files = pandas_result['transformed_files'] + polars_result['transformed_files']
    load_results = []

    for file_info in all_transformed_files:
        output_file = file_info['output_file']
        table_name = f"processed_data_{file_info['transformation_method']}"

        try:
            if output_file.endswith('.csv'):
                df = pd.read_csv(output_file)
            else:  # parquet
                df = pd.read_parquet(output_file)

            # Use our async database writer
            success = data_processor.async_write_to_database(
                df,
                table_name,
                postgres_hook.get_sqlalchemy_engine()
            )

            if success:
                load_results.append({
                    'file': output_file,
                    'table': table_name,
                    'rows_loaded': len(df),
                    'status': 'success'
                })
            else:
                load_results.append({
                    'file': output_file,
                    'table': table_name,
                    'status': 'failed'
                })

        except Exception as e:
            logger.error(f"Error loading file {output_file}: {str(e)}")
            load_results.append({
                'file': output_file,
                'status': 'error',
                'error': str(e)
            })

    logger.info(f"Database load completed. Results: {load_results}")
    return {
        'load_results': load_results,
        'total_files_processed': len(all_transformed_files),
        'successful_loads': len([r for r in load_results if r['status'] == 'success']),
        'load_timestamp': datetime.now().isoformat()
    }


@task
def data_quality_validation(load_result: Dict[str, Any], **context) -> Dict[str, Any]:
    """Validate data quality after loading"""
    logger.info("Starting data quality validation...")

    postgres_hook = PostgresHook(postgres_conn_id='postgres_default')
    validation_results = []

    # Get list of loaded tables
    successful_loads = [r for r in load_result['load_results'] if r['status'] == 'success']

    for load_info in successful_loads:
        table_name = load_info['table']

        try:
            # Basic data quality checks
            row_count_query = f"SELECT COUNT(*) FROM {table_name};"
            row_count = postgres_hook.get_first(row_count_query)[0]

            null_check_query = f"""
            SELECT
                COUNT(*) as total_rows,
                COUNT(CASE WHEN id IS NULL THEN 1 END) as null_ids,
                COUNT(CASE WHEN value IS NULL THEN 1 END) as null_values
            FROM {table_name};
            """
            quality_metrics = postgres_hook.get_first(null_check_query)

            validation_results.append({
                'table': table_name,
                'row_count': row_count,
                'total_rows': quality_metrics[0],
                'null_ids': quality_metrics[1],
                'null_values': quality_metrics[2],
                'data_quality_score': 1.0 - (quality_metrics[1] + quality_metrics[2]) / quality_metrics[0],
                'status': 'passed' if quality_metrics[1] == 0 else 'warning'
            })

        except Exception as e:
            logger.error(f"Error validating table {table_name}: {str(e)}")
            validation_results.append({
                'table': table_name,
                'status': 'failed',
                'error': str(e)
            })

    logger.info(f"Data quality validation completed: {validation_results}")
    return {
        'validation_results': validation_results,
        'validation_timestamp': datetime.now().isoformat()
    }


@task
def generate_processing_report(validation_result: Dict[str, Any], **context) -> Dict[str, Any]:
    """Generate comprehensive processing report"""
    logger.info("Generating processing report...")

    # Get processing statistics
    processing_stats = data_processor.get_processing_stats()
    retry_stats = retry_handler.get_retry_stats()

    # Compile comprehensive report
    report = {
        'pipeline_execution': {
            'dag_id': context['dag'].dag_id,
            'run_id': context['dag_run'].run_id,
            'execution_date': context['execution_date'].isoformat(),
            'duration': 'N/A'  # Would calculate from start/end times
        },
        'data_processing': {
            'processing_stats': processing_stats,
            'validation_results': validation_result['validation_results']
        },
        'reliability': {
            'retry_statistics': retry_stats
        },
        'performance_metrics': {
            'memory_usage': processing_stats['memory_info'],
            'cpu_usage': processing_stats['cpu_percent']
        }
    }

    logger.info(f"Processing report generated: {report}")
    return report


# Task Groups for better organization
with TaskGroup("data_extraction", dag=dag) as extraction_group:
    source_check = check_data_sources()
    raw_data_extraction = extract_raw_data(source_check)

with TaskGroup("data_transformation", dag=dag) as transformation_group:
    pandas_transform = transform_data_pandas(raw_data_extraction)
    polars_transform = transform_data_polars(raw_data_extraction)

with TaskGroup("data_loading", dag=dag) as loading_group:
    database_load = load_to_database(pandas_transform, polars_transform)
    quality_validation = data_quality_validation(database_load)

with TaskGroup("reporting", dag=dag) as reporting_group:
    final_report = generate_processing_report(quality_validation)

# Database setup task
create_tables = PostgresOperator(
    task_id='create_processing_tables',
    postgres_conn_id='postgres_default',
    sql="""
    CREATE TABLE IF NOT EXISTS processed_data_pandas (
        id INTEGER,
        timestamp TIMESTAMP,
        value FLOAT,
        category VARCHAR(10),
        amount FLOAT,
        value_normalized FLOAT,
        amount_log FLOAT,
        category_encoded INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS processed_data_polars (
        id INTEGER,
        timestamp TIMESTAMP,
        value FLOAT,
        category VARCHAR(10),
        amount FLOAT,
        value_normalized FLOAT,
        amount_log FLOAT,
        category_encoded INTEGER,
        timestamp_parsed TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    dag=dag
)

# Success notification
success_email = EmailOperator(
    task_id='send_success_notification',
    to=['admin@company.com'],
    subject='ETL Pipeline Completed Successfully',
    html_content="""
    <h3>Large Data ETL Pipeline Completed</h3>
    <p>The ETL pipeline has completed successfully.</p>
    <p>Execution Date: {{ ds }}</p>
    <p>Check the Airflow UI for detailed logs and metrics.</p>
    """,
    dag=dag
)

# Define task dependencies
create_tables >> extraction_group >> transformation_group >> loading_group >> reporting_group >> success_email

# Set up failure handling
extraction_group >> success_email
transformation_group >> success_email
loading_group >> success_email
