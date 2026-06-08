"""Audit and add cross-module foreign keys."""

from alembic import op

revision = "0002_cross_module_fks"
down_revision = "0001_consolidated_schema"
branch_labels = None
depends_on = None


CONSTRAINTS = [
    (
        "fk_orders_restaurant_id_organizations",
        "orders",
        "restaurant_id",
        "organizations",
        "id",
        False,
    ),
    (
        "fk_orders_supplier_id_organizations",
        "orders",
        "supplier_id",
        "organizations",
        "id",
        False,
    ),
    (
        "fk_order_items_product_id_products",
        "order_items",
        "product_id",
        "products",
        "id",
        False,
    ),
    (
        "fk_order_items_sku_id_product_skus",
        "order_items",
        "sku_id",
        "product_skus",
        "id",
        True,
    ),
    (
        "fk_products_supplier_id_organizations",
        "products",
        "supplierId",
        "organizations",
        "id",
        True,
    ),
    (
        "fk_supplier_skus_supplier_id_organizations",
        "supplier_skus",
        "supplier_id",
        "organizations",
        "id",
        False,
    ),
]


def _q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def _audit_orphans(name: str, child: str, child_col: str, parent: str, parent_col: str, nullable: bool) -> None:
    null_guard = f"AND c.{_q(child_col)} IS NOT NULL" if nullable else ""
    op.execute(
        f"""
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM {_q(child)} c
        LEFT JOIN {_q(parent)} p ON c.{_q(child_col)} = p.{_q(parent_col)}
        WHERE p.{_q(parent_col)} IS NULL
        {null_guard}
    ) THEN
        RAISE EXCEPTION 'Cannot add %, orphan rows exist in %.%', '{name}', '{child}', '{child_col}';
    END IF;
END $$;
"""
    )


def _add_not_valid_fk(name: str, child: str, child_col: str, parent: str, parent_col: str) -> None:
    op.execute(
        f"""
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '{name}'
          AND conrelid = '{child}'::regclass
    ) THEN
        ALTER TABLE {_q(child)}
        ADD CONSTRAINT {_q(name)}
        FOREIGN KEY ({_q(child_col)}) REFERENCES {_q(parent)} ({_q(parent_col)})
        NOT VALID;
    END IF;
END $$;
"""
    )
    op.execute(f"ALTER TABLE {_q(child)} VALIDATE CONSTRAINT {_q(name)}")


def upgrade() -> None:
    for name, child, child_col, parent, parent_col, nullable in CONSTRAINTS:
        _audit_orphans(name, child, child_col, parent, parent_col, nullable)
        _add_not_valid_fk(name, child, child_col, parent, parent_col)


def downgrade() -> None:
    for name, child, *_rest in reversed(CONSTRAINTS):
        op.execute(f"ALTER TABLE {_q(child)} DROP CONSTRAINT IF EXISTS {_q(name)}")
