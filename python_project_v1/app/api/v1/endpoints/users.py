import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import get_current_active_user, get_password_hash
from app.database.database import get_async_session
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user import UserCreate, UserRead, UserUpdate

logger = structlog.get_logger()

router = APIRouter()


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_async_session)):
    # Check if user already exists
    stmt = select(User).where(
        (User.email == user.email) | (User.username == user.username)
    )
    existing_user = await db.execute(stmt)
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered",
        )

    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
    )

    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    logger.info(
        "User created successfully", user_id=db_user.id, username=db_user.username
    )
    return db_user


@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.put("/me", response_model=UserRead)
async def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_session),
):
    update_data = user_update.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    logger.info("User updated successfully", user_id=current_user.id)
    return current_user


@router.get("/{user_id}", response_model=UserRead)
async def read_user(
    user_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return user


@router.get("/", response_model=list[UserRead])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(User).offset(skip).limit(limit)
    result = await db.execute(stmt)
    users = result.scalars().all()
    return list(users)


@router.delete("/me", response_model=MessageResponse)
async def delete_user_me(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(current_user)
    await db.commit()

    logger.info("User deleted successfully", user_id=current_user.id)
    return {"message": "User deleted successfully"}
