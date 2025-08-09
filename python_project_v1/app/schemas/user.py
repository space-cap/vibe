from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=100, description="Username")
    is_active: bool = Field(True, description="User activation status")
    is_superuser: bool = Field(False, description="Superuser status")


class UserCreate(UserBase):
    password: str = Field(
        ..., min_length=8, max_length=128, description="User password"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "username": "johndoe",
                "password": "securepassword123",
                "is_active": True,
                "is_superuser": False,
            }
        }
    )


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "email": "user@example.com",
                "username": "johndoe",
                "is_active": True,
                "is_superuser": False,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
            }
        },
    )


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "newemail@example.com",
                "username": "newusername",
                "password": "newsecurepassword123",
            }
        }
    )


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 3600,
            }
        }
    )


class TokenData(BaseModel):
    username: Optional[str] = None
    scopes: list[str] = []
