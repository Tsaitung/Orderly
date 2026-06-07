"""Audit and add acceptance to order foreign key."""

from alembic import op

revision = "0003_acceptance_order_fk"
down_revision = "0002_cross_module_fks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM acceptances c
        LEFT JOIN orders p ON c."orderId" = p.id
        WHERE p.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot add %, orphan rows exist in %.%', 'fk_acceptances_order_id_orders', 'acceptances', 'orderId';
    END IF;
END $$
"""
    )
    op.execute(
        """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_acceptances_order_id_orders'
          AND conrelid = 'acceptances'::regclass
    ) THEN
        ALTER TABLE acceptances
        ADD CONSTRAINT fk_acceptances_order_id_orders
        FOREIGN KEY ("orderId") REFERENCES orders (id)
        NOT VALID;
    END IF;
END $$
"""
    )
    op.execute("ALTER TABLE acceptances VALIDATE CONSTRAINT fk_acceptances_order_id_orders")


def downgrade() -> None:
    op.execute("ALTER TABLE acceptances DROP CONSTRAINT IF EXISTS fk_acceptances_order_id_orders")
