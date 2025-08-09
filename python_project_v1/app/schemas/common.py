from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str

    model_config = {
        "json_schema_extra": {
            "example": {"message": "Operation completed successfully"}
        }
    }
