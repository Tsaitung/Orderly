"""Add missing organization fields (businessType, etc.)

Revision ID: 003_add_missing_fields
Revises: 002_supplier_invitations
Create Date: 2025-09-20 00:58:00.000000

NOTE (2026-06-07): This migration is now a NO-OP to repair the broken 002->003
chain. Revision 002 (002_supplier_invitations) already creates the
supplier_invitations table AND adds every organizations column / index / FK that
this migration originally added (personalId, businessLicenseNumber,
invitedByOrganizationId, invitationAcceptedAt, onboarding*, deliveryZones,
productCategories, certifications, ix_organizations_taxId/personalId, the
invitedBy FK). Running the original upgrade() on a fresh database failed with
psycopg2 DuplicateColumn / DuplicateTable. The body is emptied; the revision id
is preserved so the downstream chain (004 -> down_revision='003_add_missing_fields')
stays intact and `alembic upgrade head` succeeds end-to-end.
"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = '003_add_missing_fields'
down_revision: Union[str, None] = '002_supplier_invitations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: all of this migration's DDL is already performed by revision 002.
    pass


def downgrade() -> None:
    # No-op: revision 002 owns these objects and is responsible for dropping them.
    pass
