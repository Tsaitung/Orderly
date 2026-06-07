"""Unified, deduplicated SQLAlchemy MetaData across all 8 backend modules.

Runtime services keep their own per-module ``declarative_base()`` instances
(each module's ``models/base.py`` defines a separate ``Base`` and therefore a
separate ``Base.metadata``). This module does NOT change that: it never mutates
any module's ``Base`` and never rewrites a model file.

Instead it builds ONE fresh ``MetaData`` that is the union of every module's
tables, deduplicated by table name, intended purely as a *target* for building
the consolidated schema (e.g. ``unified_metadata.create_all(engine)`` against a
single database, or feeding Alembic autogenerate for a unified schema).

Deduplication / canonical ownership
-----------------------------------
Two table names are defined in more than one module:

* ``organizations``     -> users.models.organization.Organization (canonical)
                           vs suppliers.models.organization.Organization (stub)
* ``supplier_profiles`` -> users.models.supplier.SupplierProfile   (canonical)
                           vs suppliers.models.supplier_profile.SupplierProfile (stub)

The user-service definitions are canonical. By importing + copying the
``users`` module FIRST and skipping any table name already present, the
user-service ``organizations`` and ``supplier_profiles`` win, and the
``suppliers`` duplicates are excluded. The suppliers module still contributes
its unique tables (``supplier_customers``, ``supplier_onboarding_progress``),
whose foreign keys to ``organizations`` resolve against the canonical table
already present in the unified metadata.
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


def _iter_module_tables(module: str) -> List[sa.Table]:
    """Return all tables registered on a module's Base.metadata.

    Every module defines exactly one ``declarative_base()`` (or a single
    ``DeclarativeBase`` subclass for billing). Importing the package + submodules
    registers all of that module's tables onto that one metadata, which we read
    back via ``Base.metadata`` exposed on the package's ``base`` submodule.
    """
    base_mod = importlib.import_module(_MODELS_PACKAGE.format(module=module) + ".base")
    base = getattr(base_mod, "Base")
    # Preserve declaration order for deterministic, readable output.
    return list(base.metadata.sorted_tables)


def build_unified_metadata() -> Tuple[sa.MetaData, Dict[str, str], Dict[str, List[str]]]:
    """Build the unified MetaData and return (metadata, owner_map, skipped_map).

    * ``owner_map``   : table name -> module that contributed it (the winner).
    * ``skipped_map`` : table name -> list of modules whose duplicate was skipped.
    """
    unified = sa.MetaData()
    owner_map: Dict[str, str] = {}
    skipped_map: Dict[str, List[str]] = {}

    for module in MODULE_ORDER:
        _import_models_package(module)
        for table in _iter_module_tables(module):
            if table.name in unified.tables:
                # Already contributed by an earlier (canonical) module -> skip.
                skipped_map.setdefault(table.name, []).append(module)
                continue
            # Copy the Table definition into the unified metadata. FK string
            # references are resolved against `unified` at access time; parents
            # (e.g. `organizations`) are already present thanks to MODULE_ORDER.
            table.to_metadata(unified)
            owner_map[table.name] = module

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
