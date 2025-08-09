import time
import uuid

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = str(uuid.uuid4())

        # Add request ID to request state
        request.state.request_id = request_id

        # Log request
        start_time = time.time()

        logger.info(
            "Request started",
            request_id=request_id,
            method=request.method,
            url=str(request.url),
            user_agent=request.headers.get("user-agent"),
            remote_addr=request.client.host if request.client else None,
        )

        # Process request
        try:
            response: Response = await call_next(request)

            # Calculate processing time
            process_time = time.time() - start_time

            # Log response
            logger.info(
                "Request completed",
                request_id=request_id,
                status_code=response.status_code,
                process_time=round(process_time, 4),
            )

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as exc:
            process_time = time.time() - start_time

            logger.error(
                "Request failed",
                request_id=request_id,
                error=str(exc),
                process_time=round(process_time, 4),
                exc_info=True,
            )
            raise exc
