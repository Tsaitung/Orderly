"""BFF endpoints bridging frontend requests to the customer hierarchy service."""

from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request

from app.core.config import settings

router = APIRouter(tags=["BFF Hierarchy"], include_in_schema=False)

async def _fetch_hierarchy_tree(request: Request) -> dict:
    base_url = (settings.customer_hierarchy_service_url or "").rstrip("/")
    if not base_url:
        raise HTTPException(status_code=503, detail="Hierarchy service URL not configured")

    target_url = f"{base_url}/api/v2/hierarchy/tree"

    headers = {}
    auth_header: Optional[str] = request.headers.get("Authorization")
    if auth_header:
        headers["Authorization"] = auth_header

    # Propagate contextual headers if present
    for header in ("X-Correlation-ID", "X-User-Id", "X-Org-Id", "X-User-Role"):
        value = request.headers.get(header)
        if value:
            headers[header] = value

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
            response = await client.get(
                target_url,
                params=request.query_params,
                headers=headers,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Hierarchy service unavailable") from exc

    if response.status_code >= 400:
        # Relay downstream error details while preserving status code
        detail = None
        try:
            detail = response.json()
        except ValueError:
            detail = response.text
        raise HTTPException(status_code=response.status_code, detail=detail)

    try:
        return response.json()
    except ValueError as exc:  # pragma: no cover - defensive guard
        raise HTTPException(status_code=502, detail="Invalid hierarchy response") from exc


@router.get("/hierarchy/tree")
async def get_hierarchy_tree(request: Request) -> dict:
    """Expose a BFF endpoint that proxies the hierarchy tree to the frontend."""
    return await _fetch_hierarchy_tree(request)


__all__ = ["router"]
