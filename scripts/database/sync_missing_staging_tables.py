#!/usr/bin/env python3
"""Synchronize missing core tables from local DB to staging."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

import psycopg2
from psycopg2.extras import Json, execute_batch

LOCAL_DSN = "host=127.0.0.1 port=5432 dbname=orderly user=orderly password=orderly_dev_password"
STAGING_DSN = (
    "host=127.0.0.1 port=5433 dbname=orderly user=orderly "
    "password=OtAEG5/1h78R+EGHStvtabQjOhjKtXNq/Pse3d6ZTDs="
)

SYNC_METADATA = {
    "seedSource": "staging-sync-2025-09-27",
    "syncedBy": "scripts/database/sync_missing_staging_tables.py",
}


def ensure_timezone(value: Optional[datetime]) -> Optional[datetime]:
    """Convert naive datetimes to UTC aware values."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def fetch_local_rows(query: str) -> List[Tuple[Any, ...]]:
    with psycopg2.connect(LOCAL_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            return list(cur.fetchall())


def sync_organizations(staging_conn: psycopg2.extensions.connection) -> int:
    rows = fetch_local_rows(
        """
        SELECT id,
               name,
               type::text,
               settings,
               "isActive",
               "createdAt",
               "updatedAt",
               "businessType"::text,
               "taxId",
               "personalId",
               "businessLicenseNumber",
               "contactPerson",
               "contactPhone",
               "contactEmail",
               address,
               "invitedByOrganizationId",
               "invitationAcceptedAt",
               "onboardingStatus"::text,
               "onboardingProgress",
               "onboardingCompletedAt",
               "deliveryZones",
               "productCategories",
               certifications
        FROM organizations
        """
    )

    if not rows:
        return 0

    payload = []
    for (
        org_id,
        name,
        type_text,
        settings,
        is_active,
        created_at,
        updated_at,
        business_type,
        tax_id,
        personal_id,
        business_license_number,
        contact_person,
        contact_phone,
        contact_email,
        address,
        invited_by,
        invitation_accepted_at,
        onboarding_status,
        onboarding_progress,
        onboarding_completed_at,
        delivery_zones,
        product_categories,
        certifications,
    ) in rows:
        payload.append(
            (
                org_id,
                name,
                type_text,
                Json(settings or {}),
                bool(is_active),
                ensure_timezone(created_at) or datetime.now(timezone.utc),
                ensure_timezone(updated_at) or datetime.now(timezone.utc),
                business_type,
                tax_id,
                personal_id,
                business_license_number,
                contact_person,
                contact_phone,
                contact_email,
                address,
                invited_by,
                ensure_timezone(invitation_accepted_at),
                onboarding_status,
                Json(onboarding_progress or {}),
                ensure_timezone(onboarding_completed_at),
                Json(delivery_zones or []),
                Json(product_categories or []),
                Json(certifications or []),
            )
        )

    with staging_conn.cursor() as cur:
        execute_batch(
            cur,
            """
            INSERT INTO organizations (
                id,
                name,
                type,
                settings,
                "isActive",
                "createdAt",
                "updatedAt",
                "businessType",
                "taxId",
                "personalId",
                "businessLicenseNumber",
                "contactPerson",
                "contactPhone",
                "contactEmail",
                address,
                "invitedByOrganizationId",
                "invitationAcceptedAt",
                "onboardingStatus",
                "onboardingProgress",
                "onboardingCompletedAt",
                "deliveryZones",
                "productCategories",
                certifications
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                settings = EXCLUDED.settings,
                "isActive" = EXCLUDED."isActive",
                "updatedAt" = EXCLUDED."updatedAt",
                "businessType" = EXCLUDED."businessType",
                "taxId" = EXCLUDED."taxId",
                "personalId" = EXCLUDED."personalId",
                "businessLicenseNumber" = EXCLUDED."businessLicenseNumber",
                "contactPerson" = EXCLUDED."contactPerson",
                "contactPhone" = EXCLUDED."contactPhone",
                "contactEmail" = EXCLUDED."contactEmail",
                address = EXCLUDED.address,
                "invitedByOrganizationId" = EXCLUDED."invitedByOrganizationId",
                "invitationAcceptedAt" = EXCLUDED."invitationAcceptedAt",
                "onboardingStatus" = EXCLUDED."onboardingStatus",
                "onboardingProgress" = EXCLUDED."onboardingProgress",
                "onboardingCompletedAt" = EXCLUDED."onboardingCompletedAt",
                "deliveryZones" = EXCLUDED."deliveryZones",
                "productCategories" = EXCLUDED."productCategories",
                certifications = EXCLUDED.certifications
            """,
            payload,
            page_size=50,
        )

    staging_conn.commit()
    return len(payload)


def sync_supplier_profiles(staging_conn: psycopg2.extensions.connection) -> int:
    rows = fetch_local_rows(
        """
        SELECT id,
               "organizationId",
               status::text,
               "verifiedAt",
               "verifiedBy",
               "deliveryCapacity"::text,
               "deliveryCapacityKgPerDay",
               "operatingHours",
               "deliveryZones",
               "minimumOrderAmount",
               "paymentTermsDays",
               "qualityCertifications",
               "contactPreferences",
               settings,
               "publicDescription",
               "foodSafetyLicense",
               "foodSafetyExpiresAt",
               "internalNotes",
               "createdAt",
               "updatedAt"
        FROM supplier_profiles
        """
    )

    if not rows:
        return 0

    payload = []
    for (
        profile_id,
        organization_id,
        status,
        verified_at,
        verified_by,
        delivery_capacity,
        delivery_capacity_kg,
        operating_hours,
        delivery_zones,
        minimum_order_amount,
        payment_terms_days,
        quality_certifications,
        contact_preferences,
        settings,
        public_description,
        food_safety_license,
        food_safety_expires_at,
        internal_notes,
        created_at,
        updated_at,
    ) in rows:
        payload.append(
            (
                profile_id,
                organization_id,
                (status or "PENDING").upper(),
                ensure_timezone(verified_at),
                verified_by,
                (delivery_capacity or "SMALL").upper(),
                int(delivery_capacity_kg) if delivery_capacity_kg is not None else 0,
                Json(operating_hours or {}),
                Json(delivery_zones or []),
                float(minimum_order_amount) if minimum_order_amount is not None else 0.0,
                int(payment_terms_days) if payment_terms_days is not None else 30,
                Json(quality_certifications or []),
                Json(contact_preferences or {}),
                Json(settings or {}),
                public_description,
                food_safety_license,
                ensure_timezone(food_safety_expires_at),
                internal_notes,
                ensure_timezone(created_at) or datetime.now(timezone.utc),
                ensure_timezone(updated_at) or datetime.now(timezone.utc),
            )
        )

    with staging_conn.cursor() as cur:
        execute_batch(
            cur,
            """
            INSERT INTO supplier_profiles (
                id,
                "organizationId",
                status,
                "verifiedAt",
                "verifiedBy",
                "deliveryCapacity",
                "deliveryCapacityKgPerDay",
                "operatingHours",
                "deliveryZones",
                "minimumOrderAmount",
                "paymentTermsDays",
                "qualityCertifications",
                "contactPreferences",
                settings,
                "publicDescription",
                "foodSafetyLicense",
                "foodSafetyExpiresAt",
                "internalNotes",
                "createdAt",
                "updatedAt"
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                "organizationId" = EXCLUDED."organizationId",
                status = EXCLUDED.status,
                "verifiedAt" = EXCLUDED."verifiedAt",
                "verifiedBy" = EXCLUDED."verifiedBy",
                "deliveryCapacity" = EXCLUDED."deliveryCapacity",
                "deliveryCapacityKgPerDay" = EXCLUDED."deliveryCapacityKgPerDay",
                "operatingHours" = EXCLUDED."operatingHours",
                "deliveryZones" = EXCLUDED."deliveryZones",
                "minimumOrderAmount" = EXCLUDED."minimumOrderAmount",
                "paymentTermsDays" = EXCLUDED."paymentTermsDays",
                "qualityCertifications" = EXCLUDED."qualityCertifications",
                "contactPreferences" = EXCLUDED."contactPreferences",
                settings = EXCLUDED.settings,
                "publicDescription" = EXCLUDED."publicDescription",
                "foodSafetyLicense" = EXCLUDED."foodSafetyLicense",
                "foodSafetyExpiresAt" = EXCLUDED."foodSafetyExpiresAt",
                "internalNotes" = EXCLUDED."internalNotes",
                "updatedAt" = EXCLUDED."updatedAt"
            """,
            payload,
            page_size=50,
        )

    staging_conn.commit()
    return len(payload)


def sync_users(staging_conn: psycopg2.extensions.connection) -> int:
    rows = fetch_local_rows(
        """
        SELECT id,
               email,
               "passwordHash",
               "organizationId",
               role::text AS role_text,
               "isActive",
               "lastLoginAt",
               metadata,
               "tokenVersion",
               "isSuperUser",
               "emailVerified",
               "createdAt",
               "updatedAt"
        FROM users
        """
    )

    if not rows:
        return 0

    payload = []
    for (
        user_id,
        email,
        password_hash,
        organization_id,
        role_text,
        is_active,
        last_login_at,
        metadata,
        token_version,
        is_super_user,
        email_verified,
        created_at,
        updated_at,
    ) in rows:
        payload.append(
            (
                user_id,
                email,
                password_hash,
                organization_id,
                role_text,
                bool(is_active),
                ensure_timezone(last_login_at),
                Json(metadata or {}),
                int(token_version),
                bool(is_super_user),
                bool(email_verified),
                ensure_timezone(created_at) or datetime.now(timezone.utc),
                ensure_timezone(updated_at) or datetime.now(timezone.utc),
            )
        )

    with staging_conn.cursor() as cur:
        execute_batch(
            cur,
            """
            INSERT INTO users (
                id,
                email,
                "passwordHash",
                "organizationId",
                role,
                "isActive",
                "lastLoginAt",
                metadata,
                "tokenVersion",
                "isSuperUser",
                "emailVerified",
                "createdAt",
                "updatedAt"
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                "passwordHash" = EXCLUDED."passwordHash",
                "organizationId" = EXCLUDED."organizationId",
                role = EXCLUDED.role,
                "isActive" = EXCLUDED."isActive",
                "lastLoginAt" = EXCLUDED."lastLoginAt",
                metadata = EXCLUDED.metadata,
                "tokenVersion" = EXCLUDED."tokenVersion",
                "isSuperUser" = EXCLUDED."isSuperUser",
                "emailVerified" = EXCLUDED."emailVerified",
                "updatedAt" = EXCLUDED."updatedAt"
            """,
            payload,
            page_size=50,
        )

    staging_conn.commit()
    return len(payload)


def sync_customer_groups(staging_conn: psycopg2.extensions.connection) -> int:
    rows = fetch_local_rows(
        """
        SELECT id,
               name,
               code,
               description,
               extra_data,
               notes,
               is_active,
               created_by,
               updated_by,
               "createdAt",
               "updatedAt"
        FROM customer_groups
        """
    )

    if not rows:
        return 0

    payload = []
    for (
        group_id,
        name,
        code,
        description,
        extra_data,
        notes,
        is_active,
        created_by,
        updated_by,
        created_at,
        updated_at,
    ) in rows:
        payload.append(
            (
                group_id,
                name,
                code,
                description,
                Json(extra_data or {}),
                notes,
                bool(is_active),
                created_by or "system",
                updated_by,
                ensure_timezone(created_at) or datetime.now(timezone.utc),
                ensure_timezone(updated_at) or datetime.now(timezone.utc),
            )
        )

    with staging_conn.cursor() as cur:
        execute_batch(
            cur,
            """
            INSERT INTO customer_groups (
                id,
                name,
                code,
                description,
                extra_data,
                notes,
                is_active,
                created_by,
                updated_by,
                "createdAt",
                "updatedAt"
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                code = EXCLUDED.code,
                description = EXCLUDED.description,
                extra_data = EXCLUDED.extra_data,
                notes = EXCLUDED.notes,
                is_active = EXCLUDED.is_active,
                updated_by = EXCLUDED.updated_by,
                "updatedAt" = EXCLUDED."updatedAt"
            """,
            payload,
            page_size=50,
        )

    staging_conn.commit()
    return len(payload)


def build_supplier_rows(
    skus: Iterable[Tuple[str, str, Any]],
    suppliers: List[Tuple[str, str]],
) -> List[Tuple[Any, ...]]:
    supplier_count = len(suppliers)
    if supplier_count == 0:
        return []

    now_ts = datetime.now(timezone.utc)
    rows: List[Tuple[Any, ...]] = []
    for index, (sku_id, sku_code, unit_price) in enumerate(skus):
        supplier_id, supplier_name = suppliers[index % supplier_count]
        supplier_sku_code = f"{sku_code}-SUP{(index % supplier_count) + 1:02d}"
        price_value = float(unit_price or 0)
        metadata: Dict[str, Any] = {
            **SYNC_METADATA,
            "supplierName": supplier_name,
            "baseSkuCode": sku_code,
        }
        rows.append(
            (
                str(uuid.uuid4()),
                supplier_id,
                sku_id,
                supplier_sku_code,
                price_value,
                1.0,
                2,
                True,
                Json(metadata),
                now_ts,
                now_ts,
            )
        )
    return rows


def sync_supplier_product_skus(staging_conn: psycopg2.extensions.connection) -> int:
    with staging_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM supplier_product_skus")
        existing_count = cur.fetchone()[0]
        if existing_count:
            cur.execute("TRUNCATE TABLE supplier_product_skus")

        cur.execute(
            """
            SELECT id,
                   "skuCode",
                   "unitPrice"
            FROM product_skus
            ORDER BY "skuCode"
            """
        )
        skus = cur.fetchall()

        cur.execute(
            """
            SELECT id,
                   name
            FROM organizations
            ORDER BY name
            """
        )
        suppliers = cur.fetchall()

    payload = build_supplier_rows(skus, suppliers)
    if not payload:
        return 0

    with staging_conn.cursor() as cur:
        execute_batch(
            cur,
            """
            INSERT INTO supplier_product_skus (
                id,
                "supplierId",
                "productSkuId",
                "supplierSkuCode",
                "unitPrice",
                "minOrderQuantity",
                "leadTimeDays",
                "isActive",
                metadata,
                "createdAt",
                "updatedAt"
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s
            )
            """,
            payload,
            page_size=100,
        )

    staging_conn.commit()
    return len(payload)


def main() -> None:
    with psycopg2.connect(STAGING_DSN) as staging_conn:
        org_count = sync_organizations(staging_conn)
        supplier_profile_count = sync_supplier_profiles(staging_conn)
        user_count = sync_users(staging_conn)
        group_count = sync_customer_groups(staging_conn)
        supplier_sku_count = sync_supplier_product_skus(staging_conn)

    print(
        "Sync complete:",
        f"organizations={org_count}",
        f"supplier_profiles={supplier_profile_count}",
        f"users={user_count}",
        f"customer_groups={group_count}",
        f"supplier_product_skus={supplier_sku_count}",
    )


if __name__ == "__main__":
    main()
