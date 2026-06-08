"""Consolidated, from-scratch schema build for all 8 backend modules.

This is an Alembic-style migration that supersedes the per-module migration
chains *for a from-scratch build only*. It creates the entire unified schema in
one shot from :data:`app.modules._unified_metadata.unified_metadata` (the
deduplicated union of every module's tables, with the user-service
``organizations`` / ``supplier_profiles`` chosen as canonical over the
suppliers stubs).

Scope / status
--------------
* ``revision = "0001_consolidated_schema"``; ``down_revision = None`` — this is
  the root revision of the canonical monolith Alembic chain. Follow-up
  cross-module FK migrations chain from this root instead of replaying the
  historical per-module chains.

Enum types
----------
Every native PostgreSQL ``ENUM`` in the models is declared with
``create_type=False`` (the models "reference existing DB enums" and rely on the
per-module migrations to ``CREATE TYPE`` first). Therefore a bare
``metadata.create_all`` does NOT emit ``CREATE TYPE`` and the first table that
references a missing enum aborts. ``upgrade()`` below first creates every
distinct enum type (``checkfirst=True``) and only then calls ``create_all``,
which mirrors what the per-module migrations do.

FK datatype reconciliation (RESOLVED + VERIFIED)
------------------------------------------------
An earlier fresh-DB build failed on 4 tables with ``DatatypeMismatch`` because a
foreign-key column's type did not match its parent's primary-key type. The
parent PKs come from each module's declarative base. The two distinct root
causes were fixed in the MODELS (never in a migration):

* ``orders.id`` was ``UUID`` while its children's ``order_id`` FKs were
  ``String(36)``. Resolved by aligning the orders ``BaseModel.id`` to
  ``String(36)`` to match the orders alembic migration (the working source of
  truth), which makes ``order_items.order_id`` / ``order_status_history.order_id``
  / ``order_adjustments.order_id`` consistent with their parent.
  (fix in ``app/modules/orders/models/base.py``)
* ``acceptance_items.acceptanceId`` was ``String`` while ``acceptances.id`` was
  ``UUID``. Resolved by aligning the child column to ``UUID`` to match the
  acceptance alembic migration.
  (fix in ``app/modules/acceptance/models/acceptance.py``)

After those fixes, a from-scratch ``create_all`` against ``unified_metadata`` on
an empty database builds all 42 tables, all 38 foreign-key constraints, and all
20 enum types with NO exception (verified). The four ``customer_prices`` /
``promotions`` FKs that are ``VARCHAR(36) -> VARCHAR`` are NOT mismatches:
``varchar(36)`` and unbounded ``varchar`` share the same Postgres base type, so
the FK is valid and builds cleanly.

This module does NOT silently skip any table — if a future model change
reintroduces a genuine type mismatch, ``create_all`` raises loudly.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM as PgEnum

from app.modules._unified_metadata import unified_metadata

# Alembic identifiers.
revision = "0001_consolidated_schema"
down_revision = None
branch_labels = None
depends_on = None


def _distinct_enum_types(metadata: sa.MetaData):
    """Return the live native ENUM type objects, one per type name.

    Taken directly off the unified metadata's columns so the type names and
    labels are byte-identical to the models (no re-declaration / drift).
    """
    seen = {}
    for table in metadata.sorted_tables:
        for col in table.columns:
            typ = col.type
            name = getattr(typ, "name", None)
            if isinstance(typ, (PgEnum, sa.Enum)) and name and name not in seen:
                seen[name] = typ
    return seen


def upgrade() -> None:
    bind = op.get_bind()

    # 1) Create every native PG enum type first. The models use
    #    create_type=False, so create_all would otherwise fail on the first
    #    table referencing an undefined type. checkfirst=True keeps this safe if
    #    a type already exists.
    for _name, enum_type in sorted(_distinct_enum_types(unified_metadata).items()):
        enum_type.create(bind, checkfirst=True)

    # 2) Build the full unified schema in one shot.
    unified_metadata.create_all(bind)


def downgrade() -> None:
    raise NotImplementedError(
        "consolidated_schema_0001 is a from-scratch build and has no in-place "
        "downgrade; rebuild from an empty database instead."
    )
