import logging
import sys
from typing import Any, Dict

import structlog

from app.core.config import settings


def setup_logging():
    """Configure structured logging with structlog"""

    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.LOG_LEVEL.upper()),
    )

    # Configure structlog
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="ISO"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]

    # Add appropriate renderer based on format setting
    if settings.LOG_FORMAT.lower() == "json":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=False))

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        context_class=dict,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance"""
    return structlog.get_logger(name)


class StructuredLogger:
    """Structured logger wrapper for enterprise logging"""

    def __init__(self, name: str = None):
        self.logger = get_logger(name)

    def info(self, message: str, **kwargs: Any):
        """Log info level message with structured data"""
        self.logger.info(message, **kwargs)

    def error(self, message: str, **kwargs: Any):
        """Log error level message with structured data"""
        self.logger.error(message, **kwargs)

    def warning(self, message: str, **kwargs: Any):
        """Log warning level message with structured data"""
        self.logger.warning(message, **kwargs)

    def debug(self, message: str, **kwargs: Any):
        """Log debug level message with structured data"""
        self.logger.debug(message, **kwargs)

    def bind(self, **kwargs: Any) -> "StructuredLogger":
        """Bind context data to logger"""
        bound_logger = StructuredLogger()
        bound_logger.logger = self.logger.bind(**kwargs)
        return bound_logger


# Global logger instance
logger = StructuredLogger()
