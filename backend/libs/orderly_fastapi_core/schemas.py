"""
井然 Orderly Platform - Shared Schema Utilities
統一的 Pydantic schema 工具和基類
"""

from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase.

    Example:
        >>> to_camel("user_name")
        "userName"
        >>> to_camel("created_at")
        "createdAt"
    """
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class CamelCaseModel(BaseModel):
    """Base model with camelCase serialization for API responses.

    All fields defined with snake_case will be serialized to camelCase.
    Accepts both snake_case and camelCase on input.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


# Generic type for paginated responses
T = TypeVar("T")


class PaginatedResponse(CamelCaseModel, Generic[T]):
    """Standard paginated response wrapper.

    Used for list endpoints that support pagination.
    """

    items: List[T] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class SuccessResponse(CamelCaseModel):
    """Standard success response wrapper."""

    success: bool = Field(True, description="Operation success flag")
    message: str = Field(..., description="Success message")
    data: Optional[Any] = Field(None, description="Response data")


class ErrorResponse(CamelCaseModel):
    """Standard error response wrapper."""

    success: bool = Field(False, description="Operation success flag")
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Any] = Field(None, description="Additional error details")
    timestamp: datetime = Field(
        default_factory=datetime.now, description="Error timestamp"
    )


class DataResponse(CamelCaseModel, Generic[T]):
    """Generic data response wrapper.

    Use for single-item responses.
    """

    success: bool = Field(True, description="Operation success flag")
    data: T = Field(..., description="Response data")


class MessageResponse(CamelCaseModel):
    """Simple message response."""

    success: bool = Field(True, description="Operation success flag")
    message: str = Field(..., description="Response message")
