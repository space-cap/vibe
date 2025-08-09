import time

import structlog
from fastapi import Request, Response
from prometheus_client import Counter, Gauge, Histogram
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()

# Prometheus metrics
REQUEST_COUNT = Counter(
    "fastapi_requests_total",
    "Total number of requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_DURATION = Histogram(
    "fastapi_request_duration_seconds",
    "Request duration in seconds",
    ["method", "endpoint"],
)

ACTIVE_REQUESTS = Gauge("fastapi_active_requests", "Number of active requests")

REQUEST_SIZE = Histogram(
    "fastapi_request_size_bytes", "Request size in bytes", ["method", "endpoint"]
)

RESPONSE_SIZE = Histogram(
    "fastapi_response_size_bytes", "Response size in bytes", ["method", "endpoint"]
)


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Get request size
        request_size = request.headers.get("content-length")
        if request_size:
            request_size = int(request_size)
        else:
            request_size = 0

        # Track active requests
        ACTIVE_REQUESTS.inc()

        start_time = time.time()

        try:
            response: Response = await call_next(request)

            # Calculate metrics
            process_time = time.time() - start_time
            endpoint = request.url.path
            method = request.method
            status_code = str(response.status_code)

            # Get response size
            response_size = 0
            if hasattr(response, "body"):
                response_size = len(response.body) if response.body else 0

            # Record metrics
            REQUEST_COUNT.labels(
                method=method, endpoint=endpoint, status_code=status_code
            ).inc()

            REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(
                process_time
            )

            REQUEST_SIZE.labels(method=method, endpoint=endpoint).observe(request_size)

            RESPONSE_SIZE.labels(method=method, endpoint=endpoint).observe(
                response_size
            )

            return response

        except Exception as exc:
            # Record failed request
            endpoint = request.url.path
            method = request.method

            REQUEST_COUNT.labels(
                method=method, endpoint=endpoint, status_code="500"
            ).inc()

            process_time = time.time() - start_time
            REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(
                process_time
            )

            logger.error("Metrics collection error", error=str(exc))
            raise exc

        finally:
            # Decrease active requests
            ACTIVE_REQUESTS.dec()
