import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import psutil
from prometheus_client import Counter, Gauge, Info

from app.core.config import settings
from app.utils.logging import StructuredLogger

logger = StructuredLogger("monitoring")

# System metrics
SYSTEM_CPU_USAGE = Gauge("system_cpu_usage_percent", "System CPU usage percentage")
SYSTEM_MEMORY_USAGE = Gauge(
    "system_memory_usage_percent", "System memory usage percentage"
)
SYSTEM_DISK_USAGE = Gauge("system_disk_usage_percent", "System disk usage percentage")

# Application metrics
APP_INFO = Info("app_info", "Application information")
APP_UPTIME = Gauge("app_uptime_seconds", "Application uptime in seconds")
APP_STARTUP_TIME = Gauge("app_startup_timestamp", "Application startup timestamp")

# Database metrics
DB_CONNECTION_POOL_SIZE = Gauge(
    "db_connection_pool_size", "Database connection pool size"
)
DB_CONNECTION_POOL_CHECKED_IN = Gauge(
    "db_connection_pool_checked_in", "Database connections checked in"
)
DB_CONNECTION_POOL_CHECKED_OUT = Gauge(
    "db_connection_pool_checked_out", "Database connections checked out"
)

# Error metrics
ERROR_COUNT = Counter(
    "app_errors_total", "Total number of application errors", ["error_type"]
)


class SystemMonitor:
    """System resource monitoring"""

    def __init__(self):
        self.start_time = time.time()

        # Set application info
        APP_INFO.info(
            {
                "name": settings.APP_NAME,
                "version": settings.APP_VERSION,
                "debug": str(settings.DEBUG).lower(),
            }
        )

        APP_STARTUP_TIME.set(self.start_time)

    def get_system_metrics(self) -> Dict[str, Any]:
        """Collect current system metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")

            metrics = {
                "cpu_usage_percent": cpu_percent,
                "memory_usage_percent": memory.percent,
                "memory_total_bytes": memory.total,
                "memory_used_bytes": memory.used,
                "disk_usage_percent": disk.percent,
                "disk_total_bytes": disk.total,
                "disk_used_bytes": disk.used,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            # Update Prometheus metrics
            SYSTEM_CPU_USAGE.set(cpu_percent)
            SYSTEM_MEMORY_USAGE.set(memory.percent)
            SYSTEM_DISK_USAGE.set(disk.percent)

            return metrics

        except Exception as e:
            logger.error("Failed to collect system metrics", error=str(e))
            ERROR_COUNT.labels(error_type="system_metrics_collection").inc()
            return {}

    def get_application_metrics(self) -> Dict[str, Any]:
        """Collect application-specific metrics"""
        uptime = time.time() - self.start_time
        APP_UPTIME.set(uptime)

        return {
            "uptime_seconds": uptime,
            "start_time": self.start_time,
            "app_name": settings.APP_NAME,
            "app_version": settings.APP_VERSION,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def start_monitoring(self, interval: int = 30):
        """Start background monitoring task"""
        logger.info("Starting system monitoring", interval=interval)

        while True:
            try:
                system_metrics = self.get_system_metrics()
                app_metrics = self.get_application_metrics()

                logger.debug(
                    "System metrics collected",
                    cpu=system_metrics.get("cpu_usage_percent"),
                    memory=system_metrics.get("memory_usage_percent"),
                    disk=system_metrics.get("disk_usage_percent"),
                )

                await asyncio.sleep(interval)

            except Exception as e:
                logger.error("Error in monitoring loop", error=str(e))
                ERROR_COUNT.labels(error_type="monitoring_loop").inc()
                await asyncio.sleep(interval)


class HealthChecker:
    """Application health checking"""

    def __init__(self):
        self.checks = {}

    def register_check(self, name: str, check_func: callable):
        """Register a health check function"""
        self.checks[name] = check_func
        logger.info("Health check registered", check_name=name)

    async def run_checks(self) -> Dict[str, Any]:
        """Run all registered health checks"""
        results = {}
        overall_healthy = True

        for name, check_func in self.checks.items():
            try:
                start_time = time.time()
                result = (
                    await check_func()
                    if asyncio.iscoroutinefunction(check_func)
                    else check_func()
                )
                check_time = time.time() - start_time

                results[name] = {
                    "healthy": result.get("healthy", True),
                    "message": result.get("message", "OK"),
                    "check_duration_ms": round(check_time * 1000, 2),
                }

                if not results[name]["healthy"]:
                    overall_healthy = False

            except Exception as e:
                logger.error("Health check failed", check_name=name, error=str(e))
                results[name] = {
                    "healthy": False,
                    "message": f"Check failed: {str(e)}",
                    "check_duration_ms": 0,
                }
                overall_healthy = False

        return {
            "healthy": overall_healthy,
            "checks": results,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Global instances
system_monitor = SystemMonitor()
health_checker = HealthChecker()


async def start_background_monitoring():
    """Start background monitoring tasks"""
    if settings.ENABLE_METRICS:
        logger.info("Starting background monitoring")
        monitoring_task = asyncio.create_task(
            system_monitor.start_monitoring(settings.HEALTH_CHECK_INTERVAL)
        )
        return monitoring_task
    else:
        logger.info("Metrics disabled, skipping background monitoring")
        return None
