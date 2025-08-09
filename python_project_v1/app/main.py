import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from app.api.v1.router import api_router
from app.core.config import settings
from app.database.database import init_db
from app.middleware.logging import LoggingMiddleware
from app.middleware.metrics import MetricsMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.utils.logging import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger = structlog.get_logger()
    logger.info("Starting up application", app_name=settings.APP_NAME)

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    yield

    # Shutdown
    logger.info("Shutting down application")


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom Middlewares
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(MetricsMiddleware)
    app.add_middleware(RateLimitMiddleware)

    # Include routers
    app.include_router(api_router, prefix="/api/v1")

    # Prometheus metrics endpoint
    if settings.ENABLE_METRICS:
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)

    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    @app.get("/")
    async def root():
        return {
            "message": f"Welcome to {settings.APP_NAME}",
            "version": settings.APP_VERSION,
            "docs_url": "/docs" if settings.DEBUG else "disabled",
        }

    return app


app = create_application()
