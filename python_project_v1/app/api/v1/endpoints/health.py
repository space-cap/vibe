import asyncio

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.database import get_async_session

logger = structlog.get_logger()

router = APIRouter()


@router.get("/")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_async_session)):
    checks = {"database": "unknown", "redis": "unknown"}

    # Database health check
    try:
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            checks["database"] = "healthy"
        else:
            checks["database"] = "unhealthy"
    except Exception as e:
        logger.error("Database health check failed", error=str(e))
        checks["database"] = "unhealthy"

    # Redis health check (if you implement Redis)
    try:
        # Add Redis health check here when implementing Redis
        checks["redis"] = "not_implemented"
    except Exception as e:
        logger.error("Redis health check failed", error=str(e))
        checks["redis"] = "unhealthy"

    overall_status = (
        "healthy"
        if all(status in ["healthy", "not_implemented"] for status in checks.values())
        else "unhealthy"
    )

    return {
        "status": overall_status,
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "checks": checks,
    }


@router.get("/readiness")
async def readiness_check(db: AsyncSession = Depends(get_async_session)):
    try:
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            return {"status": "ready"}
        else:
            return {"status": "not_ready", "reason": "database_connection_failed"}
    except Exception as e:
        logger.error("Readiness check failed", error=str(e))
        return {"status": "not_ready", "reason": "database_error"}


@router.get("/liveness")
async def liveness_check():
    return {"status": "alive"}
