"""BFF endpoints bridging frontend requests to the customer hierarchy service."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from app.modules.customer_hierarchy.core.database import get_async_session
from app.modules.customer_hierarchy.services.hierarchy_service import HierarchyService

router = APIRouter(tags=["BFF Hierarchy"], include_in_schema=False)


def _bool_param(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _int_param(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="max_depth must be an integer") from exc


async def _fetch_hierarchy_tree(request: Request) -> dict:
    try:
        async with get_async_session() as db:
            hierarchy_service = HierarchyService(db)
            tree_data = await hierarchy_service.get_tree(
                root_id=request.query_params.get("root_id"),
                max_depth=_int_param(request.query_params.get("max_depth")),
                include_inactive=_bool_param(request.query_params.get("include_inactive")),
                include_stats=_bool_param(request.query_params.get("include_stats")),
                node_types=request.query_params.getlist("node_types") or None,
                user_context=getattr(request.state, "hierarchy_context", None),
            )
            nodes = tree_data.get("tree", [])
            return {
                "data": nodes,
                "totalCount": len(nodes),
                "lastModified": datetime.utcnow().isoformat(),
            }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Hierarchy service unavailable") from exc


@router.get("/hierarchy/tree")
async def get_hierarchy_tree(request: Request) -> dict:
    """Expose a BFF endpoint that proxies the hierarchy tree to the frontend."""
    return await _fetch_hierarchy_tree(request)


__all__ = ["router"]
