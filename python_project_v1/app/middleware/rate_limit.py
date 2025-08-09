import time
from typing import Dict

import structlog
from fastapi import HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = structlog.get_logger()


class InMemoryRateLimiter:
    def __init__(self, max_requests: int, window_size: int):
        self.max_requests = max_requests
        self.window_size = window_size
        self.requests: Dict[str, list] = {}

    def is_allowed(self, client_id: str) -> bool:
        current_time = time.time()

        if client_id not in self.requests:
            self.requests[client_id] = []

        # Remove old requests outside the window
        self.requests[client_id] = [
            req_time
            for req_time in self.requests[client_id]
            if current_time - req_time < self.window_size
        ]

        # Check if we're within the limit
        if len(self.requests[client_id]) < self.max_requests:
            self.requests[client_id].append(current_time)
            return True

        return False

    def get_reset_time(self, client_id: str) -> int:
        if client_id not in self.requests or not self.requests[client_id]:
            return 0

        oldest_request = min(self.requests[client_id])
        return int(oldest_request + self.window_size)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.rate_limiter = InMemoryRateLimiter(
            max_requests=settings.RATE_LIMIT_REQUESTS,
            window_size=settings.RATE_LIMIT_WINDOW,
        )

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and metrics
        if request.url.path in ["/health", "/metrics", "/api/v1/health/liveness"]:
            return await call_next(request)

        # Get client identifier
        client_id = self._get_client_id(request)

        # Check rate limit
        if not self.rate_limiter.is_allowed(client_id):
            reset_time = self.rate_limiter.get_reset_time(client_id)

            logger.warning(
                "Rate limit exceeded",
                client_id=client_id,
                path=request.url.path,
                method=request.method,
            )

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(settings.RATE_LIMIT_REQUESTS),
                    "X-RateLimit-Window": str(settings.RATE_LIMIT_WINDOW),
                    "X-RateLimit-Reset": str(reset_time),
                    "Retry-After": str(settings.RATE_LIMIT_WINDOW),
                },
            )

        response: Response = await call_next(request)

        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_REQUESTS)
        response.headers["X-RateLimit-Window"] = str(settings.RATE_LIMIT_WINDOW)

        return response

    def _get_client_id(self, request: Request) -> str:
        # Try to get client IP from headers (for reverse proxy setups)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client IP
        if request.client:
            return request.client.host

        return "unknown"
