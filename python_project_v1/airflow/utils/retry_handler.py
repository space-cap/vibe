import asyncio
import logging
import time
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
from functools import wraps
import random
from enum import Enum

logger = logging.getLogger(__name__)


class RetryStrategy(Enum):
    """Retry strategies for different scenarios"""
    FIXED = "fixed"
    EXPONENTIAL = "exponential"
    LINEAR = "linear"
    JITTER = "jitter"


class RetryHandler:
    """Advanced retry handler with multiple strategies and error recovery"""

    def __init__(self,
                 max_retries: int = 3,
                 base_delay: float = 1.0,
                 max_delay: float = 300.0,
                 strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
                 backoff_factor: float = 2.0,
                 jitter: bool = True):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.strategy = strategy
        self.backoff_factor = backoff_factor
        self.jitter = jitter
        self.retry_stats = {}

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay based on retry strategy"""
        if self.strategy == RetryStrategy.FIXED:
            delay = self.base_delay
        elif self.strategy == RetryStrategy.LINEAR:
            delay = self.base_delay * attempt
        elif self.strategy == RetryStrategy.EXPONENTIAL:
            delay = self.base_delay * (self.backoff_factor ** (attempt - 1))
        elif self.strategy == RetryStrategy.JITTER:
            delay = self.base_delay * (self.backoff_factor ** (attempt - 1))
            delay = delay * (0.5 + random.random() * 0.5)  # Add jitter
        else:
            delay = self.base_delay

        # Add random jitter if enabled
        if self.jitter and self.strategy != RetryStrategy.JITTER:
            jitter_amount = delay * 0.1 * random.random()
            delay += jitter_amount

        return min(delay, self.max_delay)

    def should_retry(self, exception: Exception, attempt: int) -> bool:
        """Determine if we should retry based on exception type and attempt count"""
        if attempt >= self.max_retries:
            return False

        # Define retryable exceptions
        retryable_exceptions = (
            ConnectionError,
            TimeoutError,
            IOError,
            OSError,
        )

        # Don't retry on certain exceptions
        non_retryable_exceptions = (
            KeyboardInterrupt,
            SystemExit,
            MemoryError,
            SyntaxError,
            TypeError,
            ValueError  # Usually indicates bad data, not transient error
        )

        if isinstance(exception, non_retryable_exceptions):
            logger.info(f"Not retrying due to non-retryable exception: {type(exception).__name__}")
            return False

        if isinstance(exception, retryable_exceptions):
            return True

        # For unknown exceptions, retry with caution
        logger.warning(f"Unknown exception type, will retry: {type(exception).__name__}")
        return True

    def retry_sync(self,
                   func: Callable,
                   *args,
                   operation_name: str = None,
                   **kwargs) -> Any:
        """Synchronous retry decorator"""
        if operation_name is None:
            operation_name = func.__name__

        last_exception = None

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Attempting {operation_name} (attempt {attempt}/{self.max_retries})")
                result = func(*args, **kwargs)

                if attempt > 1:
                    logger.info(f"Success on attempt {attempt} for {operation_name}")

                # Record success stats
                self._record_attempt(operation_name, attempt, True, None)
                return result

            except Exception as e:
                last_exception = e
                logger.warning(f"Attempt {attempt} failed for {operation_name}: {str(e)}")

                if not self.should_retry(e, attempt):
                    self._record_attempt(operation_name, attempt, False, e)
                    break

                if attempt < self.max_retries:
                    delay = self.calculate_delay(attempt)
                    logger.info(f"Retrying {operation_name} in {delay:.2f} seconds...")
                    time.sleep(delay)

                self._record_attempt(operation_name, attempt, False, e)

        logger.error(f"All retry attempts failed for {operation_name}")
        raise last_exception

    async def retry_async(self,
                          func: Callable,
                          *args,
                          operation_name: str = None,
                          **kwargs) -> Any:
        """Asynchronous retry decorator"""
        if operation_name is None:
            operation_name = func.__name__

        last_exception = None

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Attempting {operation_name} (attempt {attempt}/{self.max_retries})")

                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)

                if attempt > 1:
                    logger.info(f"Success on attempt {attempt} for {operation_name}")

                # Record success stats
                self._record_attempt(operation_name, attempt, True, None)
                return result

            except Exception as e:
                last_exception = e
                logger.warning(f"Attempt {attempt} failed for {operation_name}: {str(e)}")

                if not self.should_retry(e, attempt):
                    self._record_attempt(operation_name, attempt, False, e)
                    break

                if attempt < self.max_retries:
                    delay = self.calculate_delay(attempt)
                    logger.info(f"Retrying {operation_name} in {delay:.2f} seconds...")
                    await asyncio.sleep(delay)

                self._record_attempt(operation_name, attempt, False, e)

        logger.error(f"All retry attempts failed for {operation_name}")
        raise last_exception

    def _record_attempt(self,
                        operation_name: str,
                        attempt: int,
                        success: bool,
                        exception: Optional[Exception]):
        """Record retry attempt statistics"""
        if operation_name not in self.retry_stats:
            self.retry_stats[operation_name] = {
                'total_attempts': 0,
                'successful_operations': 0,
                'failed_operations': 0,
                'exception_counts': {},
                'average_attempts_to_success': 0
            }

        stats = self.retry_stats[operation_name]
        stats['total_attempts'] += 1

        if success:
            stats['successful_operations'] += 1
            # Update average attempts to success
            current_avg = stats['average_attempts_to_success']
            n_success = stats['successful_operations']
            stats['average_attempts_to_success'] = (current_avg * (n_success - 1) + attempt) / n_success

        if exception:
            exc_type = type(exception).__name__
            stats['exception_counts'][exc_type] = stats['exception_counts'].get(exc_type, 0) + 1

            if attempt == self.max_retries:  # Final failure
                stats['failed_operations'] += 1

    def get_retry_stats(self) -> Dict[str, Any]:
        """Get retry statistics"""
        return {
            'retry_configuration': {
                'max_retries': self.max_retries,
                'base_delay': self.base_delay,
                'max_delay': self.max_delay,
                'strategy': self.strategy.value,
                'backoff_factor': self.backoff_factor,
                'jitter': self.jitter
            },
            'operations': dict(self.retry_stats)
        }

    def reset_stats(self):
        """Reset retry statistics"""
        self.retry_stats.clear()


# Decorators for easy use
def retry(max_retries: int = 3,
          base_delay: float = 1.0,
          strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
          operation_name: str = None):
    """Synchronous retry decorator"""
    def decorator(func):
        retry_handler = RetryHandler(
            max_retries=max_retries,
            base_delay=base_delay,
            strategy=strategy
        )

        @wraps(func)
        def wrapper(*args, **kwargs):
            return retry_handler.retry_sync(
                func, *args,
                operation_name=operation_name or func.__name__,
                **kwargs
            )
        return wrapper
    return decorator


def async_retry(max_retries: int = 3,
                base_delay: float = 1.0,
                strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
                operation_name: str = None):
    """Asynchronous retry decorator"""
    def decorator(func):
        retry_handler = RetryHandler(
            max_retries=max_retries,
            base_delay=base_delay,
            strategy=strategy
        )

        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await retry_handler.retry_async(
                func, *args,
                operation_name=operation_name or func.__name__,
                **kwargs
            )
        return wrapper
    return decorator


class CircuitBreaker:
    """Circuit breaker pattern for preventing cascade failures"""

    def __init__(self,
                 failure_threshold: int = 5,
                 recovery_timeout: float = 60.0,
                 expected_exception: Tuple[Exception, ...] = (Exception,)):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception

        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if self.state == 'OPEN':
                if time.time() - self.last_failure_time > self.recovery_timeout:
                    self.state = 'HALF_OPEN'
                    logger.info("Circuit breaker moving to HALF_OPEN state")
                else:
                    raise Exception("Circuit breaker is OPEN")

            try:
                result = func(*args, **kwargs)
                self._on_success()
                return result
            except self.expected_exception as e:
                self._on_failure()
                raise e

        return wrapper

    def _on_success(self):
        """Handle successful operation"""
        self.failure_count = 0
        if self.state == 'HALF_OPEN':
            self.state = 'CLOSED'
            logger.info("Circuit breaker CLOSED after successful operation")

    def _on_failure(self):
        """Handle failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'
            logger.warning(f"Circuit breaker OPEN after {self.failure_count} failures")


# Global retry handler instance
default_retry_handler = RetryHandler()
