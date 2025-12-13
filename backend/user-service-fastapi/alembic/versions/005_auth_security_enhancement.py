"""Add authentication and security enhancement fields

Revision ID: 005_auth_security_enhancement
Revises: 004_user_tenant_security_fields
Create Date: 2025-12-08 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "005_auth_security_enhancement"
down_revision: Union[str, None] = "004_user_tenant_security_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ================================================================================
    # User table enhancements
    # ================================================================================

    # Phone verification fields
    op.add_column(
        "users",
        sa.Column("phone", sa.String(20), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("phoneVerified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("phoneVerifiedAt", sa.DateTime(timezone=True), nullable=True),
    )

    # Security fields
    op.add_column(
        "users",
        sa.Column("failedLoginAttempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("lockedUntil", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("passwordChangedAt", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("passwordResetToken", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("passwordResetExpires", sa.DateTime(timezone=True), nullable=True),
    )

    # MFA enhancements
    op.add_column(
        "users",
        sa.Column("mfaMethod", sa.String(20), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("mfaBackupCodes", postgresql.JSON(astext_type=sa.Text()), server_default=sa.text("'[]'::json"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("mfaEnforcedAt", sa.DateTime(timezone=True), nullable=True),
    )

    # Verification level
    op.add_column(
        "users",
        sa.Column("verificationLevel", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )

    # Super User fields
    op.add_column(
        "users",
        sa.Column("superUserActivatedAt", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("superUserExpiresAt", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("superUserReason", sa.Text(), nullable=True),
    )

    # Create indexes for users table
    op.create_index("idx_users_phone", "users", ["phone"], unique=False)
    op.create_index("idx_users_verification_level", "users", ["verificationLevel"], unique=False)
    op.create_index("idx_users_reset_token", "users", ["passwordResetToken"], unique=True)

    # Backfill existing data
    op.execute('UPDATE users SET "phoneVerified" = false WHERE "phoneVerified" IS NULL')
    op.execute('UPDATE users SET "failedLoginAttempts" = 0 WHERE "failedLoginAttempts" IS NULL')
    op.execute('UPDATE users SET "mfaBackupCodes" = \'[]\'::json WHERE "mfaBackupCodes" IS NULL')
    op.execute('UPDATE users SET "verificationLevel" = 1 WHERE "verificationLevel" IS NULL')

    # Set verification level based on email verification
    op.execute('UPDATE users SET "verificationLevel" = 1 WHERE "emailVerified" = true')
    op.execute('UPDATE users SET "verificationLevel" = 0 WHERE "emailVerified" = false')

    # ================================================================================
    # Organization table enhancements
    # ================================================================================

    op.add_column(
        "organizations",
        sa.Column("verificationLevel", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )
    op.add_column(
        "organizations",
        sa.Column("verifiedAt", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("verificationDocuments", postgresql.JSON(astext_type=sa.Text()), server_default=sa.text("'[]'::json"), nullable=False),
    )

    # Backfill organization data
    op.execute('UPDATE organizations SET "verificationLevel" = 1 WHERE "verificationLevel" IS NULL')
    op.execute('UPDATE organizations SET "verificationDocuments" = \'[]\'::json WHERE "verificationDocuments" IS NULL')

    # ================================================================================
    # New table: password_history
    # ================================================================================

    op.create_table(
        "password_history",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("userId", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("passwordHash", sa.String(), nullable=False),
        sa.Column("changedAt", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("createdAt", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updatedAt", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_password_history_user", "password_history", ["userId"], unique=False)

    # ================================================================================
    # New table: oauth_links
    # ================================================================================

    op.create_table(
        "oauth_links",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("userId", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),  # line, google
        sa.Column("providerUserId", sa.String(), nullable=False),
        sa.Column("providerEmail", sa.String(), nullable=True),
        sa.Column("providerData", postgresql.JSON(astext_type=sa.Text()), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("linkedAt", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("lastUsedAt", sa.DateTime(timezone=True), nullable=True),
        sa.Column("createdAt", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updatedAt", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_oauth_links_user", "oauth_links", ["userId"], unique=False)
    op.create_index("idx_oauth_links_provider_user", "oauth_links", ["provider", "providerUserId"], unique=True)

    # ================================================================================
    # New table: audit_logs
    # ================================================================================

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("userId", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("eventType", sa.String(50), nullable=False),  # SUPER_USER_ACTIVATE, MFA_ENABLE, PASSWORD_CHANGE, etc.
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("result", sa.String(20), nullable=False),  # success, failure
        sa.Column("metadata", postgresql.JSON(astext_type=sa.Text()), server_default=sa.text("'{}'::json"), nullable=False),
        sa.Column("ipAddress", sa.String(45), nullable=True),
        sa.Column("userAgent", sa.Text(), nullable=True),
        sa.Column("createdAt", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_audit_logs_user_time", "audit_logs", ["userId", "createdAt"], unique=False)
    op.create_index("idx_audit_logs_event_type", "audit_logs", ["eventType"], unique=False)
    op.create_index("idx_audit_logs_created", "audit_logs", ["createdAt"], unique=False)


def downgrade() -> None:
    # Drop audit_logs table and indexes
    op.drop_index("idx_audit_logs_created", table_name="audit_logs")
    op.drop_index("idx_audit_logs_event_type", table_name="audit_logs")
    op.drop_index("idx_audit_logs_user_time", table_name="audit_logs")
    op.drop_table("audit_logs")

    # Drop oauth_links table and indexes
    op.drop_index("idx_oauth_links_provider_user", table_name="oauth_links")
    op.drop_index("idx_oauth_links_user", table_name="oauth_links")
    op.drop_table("oauth_links")

    # Drop password_history table and indexes
    op.drop_index("idx_password_history_user", table_name="password_history")
    op.drop_table("password_history")

    # Drop organization columns
    op.drop_column("organizations", "verificationDocuments")
    op.drop_column("organizations", "verifiedAt")
    op.drop_column("organizations", "verificationLevel")

    # Drop user indexes
    op.drop_index("idx_users_reset_token", table_name="users")
    op.drop_index("idx_users_verification_level", table_name="users")
    op.drop_index("idx_users_phone", table_name="users")

    # Drop user columns
    op.drop_column("users", "superUserReason")
    op.drop_column("users", "superUserExpiresAt")
    op.drop_column("users", "superUserActivatedAt")
    op.drop_column("users", "verificationLevel")
    op.drop_column("users", "mfaEnforcedAt")
    op.drop_column("users", "mfaBackupCodes")
    op.drop_column("users", "mfaMethod")
    op.drop_column("users", "passwordResetExpires")
    op.drop_column("users", "passwordResetToken")
    op.drop_column("users", "passwordChangedAt")
    op.drop_column("users", "lockedUntil")
    op.drop_column("users", "failedLoginAttempts")
    op.drop_column("users", "phoneVerifiedAt")
    op.drop_column("users", "phoneVerified")
    op.drop_column("users", "phone")
