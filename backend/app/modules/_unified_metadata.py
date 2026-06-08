"""Unified SQLAlchemy MetaData across all backend modules.

Runtime modules now share ``app.db.base.Base``. This helper imports every
module's models in a deterministic order and then builds one fresh ``MetaData``
copy for the consolidated Alembic root.

Deduplication / canonical ownership
-----------------------------------
Two table names used to be defined in more than one module:

* ``organizations``     -> users.models.organization.Organization (canonical)
                           vs suppliers.models.organization.Organization (stub)
* ``supplier_profiles`` -> users.models.supplier.SupplierProfile   (canonical)
                           vs suppliers.models.supplier_profile.SupplierProfile (stub)

The user-service definitions are canonical. The suppliers module now re-exports
those canonical mapped classes and only owns its unique tables
(``supplier_customers``, ``supplier_onboarding_progress``). The import order
remains load-bearing because it gives deterministic table ownership metadata.
"""

from __future__ import annotations

import importlib
import pkgutil
from typing import Dict, List, Tuple

import sqlalchemy as sa

# Module processing order is load-bearing: USER-SERVICE must be first so its
# `organizations` + `supplier_profiles` are copied before the suppliers stubs,
# making the user-service definitions canonical under name-based dedup.
MODULE_ORDER: Tuple[str, ...] = (
    "users",
    "orders",
    "products",
    "acceptance",
    "billing",
    "notifications",
    "customer_hierarchy",
    "suppliers",
)

_MODELS_PACKAGE = "app.modules.{module}.models"


def _import_models_package(module: str) -> object:
    """Import a module's ``models`` package and ALL of its submodules.

    Some modules (orders, acceptance, notifications) ship their ``models``
    directory WITHOUT an ``__init__.py``, so a bare ``import ...models`` resolves
    them as namespace packages and does NOT execute the files that declare the
    tables. Walking + importing every submodule guarantees each model class is
    defined and registered on its module ``Base.metadata`` regardless of whether
    the package re-exports it.
    """
    pkg_name = _MODELS_PACKAGE.format(module=module)
    package = importlib.import_module(pkg_name)

    # Import every direct submodule so all model classes are registered.
    search_paths = list(getattr(package, "__path__", []))
    if search_paths:
        for mod_info in pkgutil.iter_modules(search_paths):
            if mod_info.name == "__init__":
                continue
            importlib.import_module(f"{pkg_name}.{mod_info.name}")
    return package


def _infer_owner(table_name: str) -> str:
    """Best-effort owner label for reporting on the shared metadata."""
    if table_name in {"organizations", "supplier_profiles", "users", "sessions"}:
        return "users"
    if table_name.startswith("order_") or table_name == "orders":
        return "orders"
    if table_name.startswith("product") or table_name in {
        "customer_prices",
        "price_history",
        "promotions",
        "sku_uploads",
        "sku_upload_items",
        "sku_upload_audit_logs",
        "sku_code_sequences",
        "supplier_skus",
    }:
        return "products"
    if table_name.startswith("acceptance"):
        return "acceptance"
    if table_name.startswith("reconciliation") or table_name in {"billing_periods", "fee_configs"}:
        return "billing"
    if table_name == "notifications":
        return "notifications"
    if table_name.startswith("customer_") or table_name in {
        "business_units",
        "activity_metrics",
        "dashboard_summaries",
        "performance_rankings",
        "activity_trends",
    }:
        return "customer_hierarchy"
    if table_name.startswith("supplier_"):
        return "suppliers"
    return "monolith"


def build_unified_metadata() -> Tuple[sa.MetaData, Dict[str, str], Dict[str, List[str]]]:
    """Build the unified MetaData and return (metadata, owner_map, skipped_map).

    * ``owner_map``   : table name -> module that contributed it (the winner).
    * ``skipped_map`` : table name -> list of modules whose duplicate was skipped.
    """
    for module in MODULE_ORDER:
        _import_models_package(module)

    from app.db.base import Base

    unified = sa.MetaData()
    owner_map: Dict[str, str] = {}
    skipped_map: Dict[str, List[str]] = {}

    for table in Base.metadata.sorted_tables:
        table.to_metadata(unified)
        owner_map[table.name] = _infer_owner(table.name)

    # Collision-free invariant: every table name in the unified metadata is unique
    # by construction (dict keyed by name). Assert there is exactly one owner per
    # table and that the owner/table sets agree.
    assert len(owner_map) == len(unified.tables), (
        "owner_map / unified.tables size mismatch: "
        f"{len(owner_map)} owners vs {len(unified.tables)} tables"
    )
    assert set(owner_map) == set(unified.tables.keys()), (
        "owner_map keys do not match unified table names"
    )

    return unified, owner_map, skipped_map


# Public surface.
unified_metadata, table_owner, duplicates_skipped = build_unified_metadata()

__all__ = ["unified_metadata", "table_owner", "duplicates_skipped", "build_unified_metadata"]
