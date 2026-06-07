"""Create the full Orderly monolith schema from shared metadata."""

from app.modules._consolidated_schema import downgrade, upgrade

revision = "0001_consolidated_schema"
down_revision = None
branch_labels = None
depends_on = None
