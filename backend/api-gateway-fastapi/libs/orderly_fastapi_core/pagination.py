from __future__ import annotations

from typing import TypedDict
from fastapi import Query


class Pagination(TypedDict):
    page: int
    page_size: int
    limit: int
    offset: int


def pagination_params(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
) -> Pagination:
    limit = page_size
    offset = (page - 1) * page_size
    return {"page": page, "page_size": page_size, "limit": limit, "offset": offset}

