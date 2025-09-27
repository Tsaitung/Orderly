#!/usr/bin/env python3
"""Seed the Orderly database with curated real-world inspired test data."""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import uuid
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure backend services are importable for SQLAlchemy models
CURRENT_FILE = Path(__file__).resolve()
REPO_ROOT = CURRENT_FILE.parents[2]
BACKEND_SERVICES = [
    REPO_ROOT / "backend" / "user-service-fastapi",
    REPO_ROOT / "backend" / "customer-hierarchy-service-fastapi",
    REPO_ROOT / "backend" / "product-service-fastapi",
]
for service_path in BACKEND_SERVICES:
    sys.path.append(str(service_path))

from sqlalchemy import text
from sqlalchemy.engine.url import URL, make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Import ORM models after PATH adjustments
from app.models.customer_company import CustomerCompany  # type: ignore  # noqa: E402
from app.models.customer_location import CustomerLocation  # type: ignore  # noqa: E402
from app.models.business_unit import BusinessUnit  # type: ignore  # noqa: E402

DEFAULT_DATABASE_URL = "postgresql+asyncpg://orderly:orderly_dev_password@localhost:5432/orderly"
DATA_DIR = CURRENT_FILE.parent / "data"
SEED_SOURCE_KEY = "seed_from_real_data"

DEFAULT_OPERATING_HOURS: Dict[str, Any] = {
    "monday": {"open": "08:00", "close": "18:00"},
    "tuesday": {"open": "08:00", "close": "18:00"},
    "wednesday": {"open": "08:00", "close": "18:00"},
    "thursday": {"open": "08:00", "close": "18:00"},
    "friday": {"open": "08:00", "close": "18:00"},
    "saturday": {"open": "09:00", "close": "15:00"},
    "sunday": {"closed": True},
}

DEFAULT_CONTACT_PREFERENCES = {"phone": True, "email": True, "sms": False}
DEFAULT_SUPPLIER_SETTINGS = {
    "seedSource": SEED_SOURCE_KEY,
    "autoAcceptOrders": False,
    "notificationSettings": {"newOrders": True, "orderUpdates": True},
}
DELIVERY_CAPACITY_KG = {"SMALL": 300, "MEDIUM": 1200, "LARGE": 2500}


def load_json(filename: str) -> Any:
    """Load a JSON file from the data directory with Decimal precision."""
    path = DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Missing data file: {path}")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle, parse_float=Decimal)


def load_seed_payload() -> Dict[str, Any]:
    """Load all seed data from JSON exports."""
    suppliers = load_json("suppliers.json")
    customers = load_json("customers.json")
    categories_payload = load_json("categories.json")
    skus_payload = load_json("skus.json")

    categories = categories_payload.get("categories", categories_payload)
    skus = skus_payload.get("skus", skus_payload)

    return {
        "suppliers": suppliers,
        "customers": customers,
        "categories": categories,
        "skus": skus,
    }


def parse_datetime(value: Optional[Any]) -> Optional[datetime]:
    """Convert ISO formatted strings to datetime objects."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        cleaned = value.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(cleaned)
        except ValueError:
            return None
    return None


def ensure_decimal(value: Any, fallback: Decimal) -> Decimal:
    """Ensure a Decimal instance is returned."""
    if value is None:
        return fallback
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception:
        return fallback


def json_dumps_with_default(value: Any, default: Any) -> str:
    """Serialize to JSON with a default fallback."""
    if value is None:
        value = default
    return json.dumps(value, ensure_ascii=False)


def resolve_database_url(args: argparse.Namespace) -> str:
    """Resolve the database URL, optionally injecting a password from Secret Manager.

    Resolution order:
      1. --database-url CLI argument
      2. DATABASE_URL environment variable
      3. Construct URL from host/user/db env/CLI values
      4. Fallback to DEFAULT_DATABASE_URL
    """

    database_url = args.database_url or os.getenv("DATABASE_URL")

    if not database_url:
        database_url = build_database_url_from_components(args)

    if not database_url:
        database_url = DEFAULT_DATABASE_URL

    if args.db_password_secret:
        password = fetch_secret_value(
            secret_name=args.db_password_secret,
            project_id=args.gcp_project,
            version=args.secret_version,
        )
        database_url = apply_password_to_url(database_url, password)

    return database_url


def build_database_url_from_components(args: argparse.Namespace) -> Optional[str]:
    """Construct database URL from env variables or CLI options.

    Supports Cloud SQL Unix socket or TCP hosts. Environment variables follow the
    same naming convention as backend services:
      DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, POSTGRES_PASSWORD
    CLI overrides (--db-host, --db-port, etc.) can be added later if required.
    """

    host = os.getenv("DATABASE_HOST")
    port = os.getenv("DATABASE_PORT")
    name = os.getenv("DATABASE_NAME")
    user = os.getenv("DATABASE_USER")
    password = os.getenv("POSTGRES_PASSWORD")

    if not host or not name or not user:
        return None

    if not port:
        # Cloud SQL Unix socket uses /cloudsql/... path; asyncpg expects query param host
        port = "5432"

    if host.startswith("/cloudsql/"):
        # asyncpg socket syntax: db?host=/cloudsql/instance
        password_part = f":{password}" if password else ""
        return f"postgresql+asyncpg://{user}{password_part}@/{name}?host={host}"

    password_part = f":{password}" if password else ""
    return f"postgresql+asyncpg://{user}{password_part}@{host}:{port}/{name}"


def apply_password_to_url(database_url: str, password: str) -> str:
    """Inject the password into a SQLAlchemy database URL."""
    url = make_url(database_url)
    if hasattr(url, "set"):
        url = url.set(password=password)
    else:  # SQLAlchemy < 1.4 fallback
        url = URL.create(
            drivername=url.drivername,
            username=url.username,
            password=password,
            host=url.host,
            port=url.port,
            database=url.database,
            query=url.query,
        )
    return str(url)


def fetch_secret_value(secret_name: str, project_id: Optional[str], version: str = "latest") -> str:
    """Fetch a secret value from Google Secret Manager."""
    try:
        from google.api_core import exceptions as gcloud_exceptions
        from google.auth.exceptions import DefaultCredentialsError
        from google.cloud import secretmanager
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "google-cloud-secret-manager is required when --db-password-secret is used"
        ) from exc

    if secret_name.startswith("projects/"):
        if "/versions/" not in secret_name:
            secret_path = f"{secret_name}/versions/{version}"
        else:
            secret_path = secret_name
    else:
        if not project_id:
            raise ValueError("--gcp-project is required when secret name is not fully qualified")
        secret_path = f"projects/{project_id}/secrets/{secret_name}/versions/{version}"

    client = secretmanager.SecretManagerServiceClient()
    try:
        response = client.access_secret_version(name=secret_path)
    except DefaultCredentialsError as exc:  # pragma: no cover - environment specific
        raise RuntimeError(
            "Failed to access Secret Manager. Run `gcloud auth application-default login` or "
            "ensure the service account has Secret Manager Accessor role."
        ) from exc
    except gcloud_exceptions.GoogleAPICallError as exc:  # pragma: no cover - environment specific
        raise RuntimeError(f"Secret Manager access failed: {exc}") from exc

    return response.payload.data.decode("utf-8")


def create_session_factory(database_url: str) -> tuple[sessionmaker, AsyncEngine]:
    engine = create_async_engine(database_url, echo=False, pool_pre_ping=True)
    session_factory = sessionmaker(engine, class_=AsyncSession)
    return session_factory, engine


async def create_suppliers(session: AsyncSession, suppliers: List[Dict[str, Any]]) -> None:
    """Create supplier organizations and profiles."""
    if not suppliers:
        print("📦 供應商資料：無資料，跳過")
        return

    created_count = 0
    profile_count = 0

    for supplier in suppliers:
        supplier_id = supplier["id"]
        existing = await session.execute(
            text("SELECT id FROM organizations WHERE id = :id"), {"id": supplier_id}
        )
        if existing.fetchone():
            continue

        delivery_zones_json = json_dumps_with_default(
            supplier.get("deliveryZones"), [supplier.get("address")] if supplier.get("address") else []
        )
        product_categories_json = json_dumps_with_default(supplier.get("productCategories"), [])
        certifications_json = json_dumps_with_default(supplier.get("certifications"), [])

        settings_payload = supplier.get("settings") or {}
        settings_payload.setdefault("seedSource", SEED_SOURCE_KEY)
        org_insert = text(
            """
            INSERT INTO organizations (
                id, name, type, "businessType", "taxId", "contactPerson",
                "contactPhone", "contactEmail", address, "isActive",
                "deliveryZones", "productCategories", certifications,
                "settings", "createdAt", "updatedAt"
            ) VALUES (
                :id, :name, :type, :businessType, :taxId, :contactPerson,
                :contactPhone, :contactEmail, :address, true,
                :deliveryZones::jsonb, :productCategories::jsonb, :certifications::jsonb,
                :settings::jsonb, NOW(), NOW()
            )
            """
        )
        await session.execute(
            org_insert,
            {
                "id": supplier_id,
                "name": supplier["name"],
                "type": supplier.get("type", "supplier"),
                "businessType": supplier.get("businessType"),
                "taxId": supplier.get("taxId"),
                "contactPerson": supplier.get("contactPerson"),
                "contactPhone": supplier.get("contactPhone"),
                "contactEmail": supplier.get("contactEmail"),
                "address": supplier.get("address"),
                "deliveryZones": delivery_zones_json,
                "productCategories": product_categories_json,
                "certifications": certifications_json,
                "settings": json.dumps(settings_payload, ensure_ascii=False),
            },
        )
        created_count += 1

        profile_existing = await session.execute(
            text('SELECT 1 FROM supplier_profiles WHERE "organizationId" = :org_id'),
            {"org_id": supplier_id},
        )
        if profile_existing.fetchone():
            continue

        profile_data = supplier.get("profile") or {}
        capacity = str(profile_data.get("deliveryCapacity", "MEDIUM")).upper()
        if capacity not in DELIVERY_CAPACITY_KG:
            capacity = "MEDIUM"
        min_order = ensure_decimal(profile_data.get("minimumOrderAmount"), Decimal("1000"))
        payment_terms = int(profile_data.get("paymentTermsDays") or 30)
        delivery_capacity_kg = DELIVERY_CAPACITY_KG[capacity]

        operating_hours_json = json_dumps_with_default(
            profile_data.get("operatingHours"), DEFAULT_OPERATING_HOURS
        )
        profile_delivery_zones = json_dumps_with_default(
            profile_data.get("deliveryZones"),
            json.loads(delivery_zones_json) if delivery_zones_json else [],
        )
        quality_certifications = json_dumps_with_default(
            profile_data.get("qualityCertifications"), supplier.get("certifications") or []
        )

        contact_preferences = profile_data.get("contactPreferences") or {}
        for key, value in DEFAULT_CONTACT_PREFERENCES.items():
            contact_preferences.setdefault(key, value)

        settings_profile = profile_data.get("settings") or {}
        settings_profile.setdefault("seedSource", SEED_SOURCE_KEY)
        settings_profile.setdefault("autoAcceptOrders", False)

        profile_insert = text(
            """
            INSERT INTO supplier_profiles (
                id, "organizationId", status, "deliveryCapacity",
                "deliveryCapacityKgPerDay", "operatingHours", "deliveryZones",
                "minimumOrderAmount", "paymentTermsDays", "qualityCertifications",
                "contactPreferences", settings, "createdAt", "updatedAt"
            ) VALUES (
                :id, :organizationId, :status, :deliveryCapacity,
                :deliveryCapacityKgPerDay, :operatingHours::jsonb, :deliveryZones::jsonb,
                :minimumOrderAmount, :paymentTermsDays, :qualityCertifications::jsonb,
                :contactPreferences::jsonb, :settings::jsonb, NOW(), NOW()
            )
            """
        )
        await session.execute(
            profile_insert,
            {
                "id": str(uuid.uuid4()),
                "organizationId": supplier_id,
                "status": str(profile_data.get("status", "VERIFIED")).upper(),
                "deliveryCapacity": capacity,
                "deliveryCapacityKgPerDay": delivery_capacity_kg,
                "operatingHours": operating_hours_json,
                "deliveryZones": profile_delivery_zones,
                "minimumOrderAmount": min_order,
                "paymentTermsDays": payment_terms,
                "qualityCertifications": quality_certifications,
                "contactPreferences": json.dumps(contact_preferences, ensure_ascii=False),
                "settings": json.dumps(settings_profile, ensure_ascii=False),
            },
        )
        profile_count += 1

    print(f"📦 供應商資料：新增 {created_count} 筆, 供應商檔案 {profile_count} 筆")


async def create_categories(session: AsyncSession, categories: List[Dict[str, Any]]) -> None:
    """Create product categories while preserving hierarchy."""
    if not categories:
        print("📂 品類資料：無資料，跳過")
        return

    created_count = 0
    for category in categories:
        code = category["code"]
        exists = await session.execute(
            text("SELECT id FROM product_categories WHERE code = :code"), {"code": code}
        )
        if exists.fetchone():
            continue

        metadata_payload = category.get("metadata") or {}
        metadata_payload.setdefault("seedSource", SEED_SOURCE_KEY)
        created_at = parse_datetime(category.get("createdAt")) or datetime.utcnow()
        updated_at = parse_datetime(category.get("updatedAt")) or created_at

        category_insert = text(
            """
            INSERT INTO product_categories (
                id, code, name, "nameEn", "parentId", level, "sortOrder",
                description, metadata, "isActive", "createdAt", "updatedAt"
            ) VALUES (
                :id, :code, :name, :nameEn, :parentId, :level, :sortOrder,
                :description, :metadata::jsonb, :isActive, :createdAt, :updatedAt
            )
            """
        )
        await session.execute(
            category_insert,
            {
                "id": category.get("id", str(uuid.uuid4())),
                "code": code,
                "name": category["name"],
                "nameEn": category.get("nameEn") or category["name"],
                "parentId": category.get("parentId"),
                "level": category.get("level", 1),
                "sortOrder": category.get("sortOrder", 0),
                "description": category.get("description"),
                "metadata": json.dumps(metadata_payload, ensure_ascii=False),
                "isActive": category.get("isActive", True),
                "createdAt": created_at,
                "updatedAt": updated_at,
            },
        )
        created_count += 1

    print(f"📂 品類資料：新增 {created_count} 筆")


async def create_skus(session: AsyncSession, skus: List[Dict[str, Any]]) -> None:
    """Create SKU records with basic pricing info."""
    if not skus:
        print("🏷️ SKU 資料：無資料，跳過")
        return

    created_count = 0
    for sku in skus:
        sku_code = sku["skuCode"]
        exists = await session.execute(
            text('SELECT "skuCode" FROM product_skus WHERE "skuCode" = :skuCode'),
            {"skuCode": sku_code},
        )
        if exists.fetchone():
            continue

        created_at = parse_datetime(sku.get("createdAt")) or datetime.utcnow()
        updated_at = parse_datetime(sku.get("updatedAt")) or created_at
        sku_insert = text(
            """
            INSERT INTO product_skus (
                id, "productId", "skuCode", name, "packageType", "pricingUnit",
                "unitPrice", "minOrderQuantity", weight, "originCountry",
                "isActive", "createdAt", "updatedAt"
            ) VALUES (
                :id, :productId, :skuCode, :name, :packageType, :pricingUnit,
                :unitPrice, :minOrderQuantity, :weight, :originCountry,
                true, :createdAt, :updatedAt
            )
            """
        )
        await session.execute(
            sku_insert,
            {
                "id": sku.get("id", str(uuid.uuid4())),
                "productId": sku.get("productId"),
                "skuCode": sku_code,
                "name": sku.get("name"),
                "packageType": sku.get("packageType"),
                "pricingUnit": sku.get("pricingUnit"),
                "unitPrice": ensure_decimal(sku.get("unitPrice"), Decimal("0")),
                "minOrderQuantity": sku.get("minOrderQuantity", 1),
                "weight": sku.get("weight"),
                "originCountry": sku.get("originCountry"),
                "createdAt": created_at,
                "updatedAt": updated_at,
            },
        )
        created_count += 1

    print(f"🏷️ SKU 資料：新增 {created_count} 筆")


async def create_customers(session: AsyncSession, customers: Dict[str, Any]) -> None:
    """Create customer companies, locations, and business units."""
    companies = customers.get("companies", [])
    locations = customers.get("locations", [])
    business_units = customers.get("business_units", [])

    if not companies:
        print("🏢 客戶資料：無公司資料，跳過")
        return

    locations_by_company: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for location in locations:
        locations_by_company[location["company_id"]].append(location)

    units_by_location: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for unit in business_units:
        units_by_location[unit["location_id"]].append(unit)

    companies_created = 0
    locations_created = 0
    units_created = 0

    for company in companies:
        company_id = company["id"]
        exists = await session.execute(
            text("SELECT id FROM customer_companies WHERE id = :id"),
            {"id": company_id},
        )
        if exists.fetchone():
            continue

        extra_data = dict(company.get("extra_data") or {})
        extra_data.setdefault("seedSource", SEED_SOURCE_KEY)

        company_obj = CustomerCompany(
            id=company_id,
            group_id=company.get("group_id"),
            name=company["name"],
            legal_name=company.get("legal_name") or company["name"],
            tax_id=company["tax_id"],
            tax_id_type=company.get("tax_id_type") or "company",
            billing_address=company.get("billing_address") or {},
            billing_contact=company.get("billing_contact") or {},
            created_by="seed_script",
            updated_by="seed_script",
            is_active=company.get("is_active", True),
            extra_data=extra_data,
        )
        created_at = parse_datetime(company.get("createdAt"))
        updated_at = parse_datetime(company.get("updatedAt"))
        if created_at:
            company_obj.created_at = created_at
        if updated_at:
            company_obj.updated_at = updated_at

        session.add(company_obj)
        await session.flush()
        companies_created += 1

        for location in locations_by_company.get(company_id, []):
            location_id = location["id"]
            loc_exists = await session.execute(
                text("SELECT id FROM customer_locations WHERE id = :id"),
                {"id": location_id},
            )
            if loc_exists.fetchone():
                continue

            location_extra = dict(location.get("extra_data") or {})
            location_extra.setdefault("seedSource", SEED_SOURCE_KEY)

            location_obj = CustomerLocation(
                id=location_id,
                company_id=company_id,
                name=location["name"],
                code=location.get("code"),
                address=location.get("address") or {},
                delivery_contact=location.get("delivery_contact") or {},
                created_by="seed_script",
                updated_by="seed_script",
                is_active=location.get("is_active", True),
                extra_data=location_extra,
            )
            loc_created_at = parse_datetime(location.get("createdAt"))
            loc_updated_at = parse_datetime(location.get("updatedAt"))
            if loc_created_at:
                location_obj.created_at = loc_created_at
            if loc_updated_at:
                location_obj.updated_at = loc_updated_at

            session.add(location_obj)
            await session.flush()
            locations_created += 1

            for unit in units_by_location.get(location_id, []):
                unit_id = unit["id"]
                unit_exists = await session.execute(
                    text("SELECT id FROM business_units WHERE id = :id"),
                    {"id": unit_id},
                )
                if unit_exists.fetchone():
                    continue

                unit_extra = dict(unit.get("extra_data") or {})
                unit_extra.setdefault("seedSource", SEED_SOURCE_KEY)

                business_unit = BusinessUnit(
                    id=unit_id,
                    location_id=location_id,
                    name=unit["name"],
                    code=unit["code"],
                    type=unit.get("type"),
                    budget_monthly=unit.get("budget_monthly"),
                    created_by="seed_script",
                    updated_by="seed_script",
                    is_active=unit.get("is_active", True),
                    extra_data=unit_extra,
                )
                unit_created_at = parse_datetime(unit.get("createdAt"))
                unit_updated_at = parse_datetime(unit.get("updatedAt"))
                if unit_created_at:
                    business_unit.created_at = unit_created_at
                if unit_updated_at:
                    business_unit.updated_at = unit_updated_at

                session.add(business_unit)
                units_created += 1

    print(
        "🏢 客戶資料：新增 "
        f"公司 {companies_created} 筆, 地點 {locations_created} 筆, 業務單位 {units_created} 筆"
    )


async def clean_all_data(database_url: str, seed_payload: Dict[str, Any]) -> None:
    """Remove previously seeded data."""
    session_factory, engine = create_session_factory(database_url)
    supplier_ids = [supplier["id"] for supplier in seed_payload.get("suppliers", [])]
    category_codes = [category["code"] for category in seed_payload.get("categories", [])]
    sku_codes = [sku["skuCode"] for sku in seed_payload.get("skus", [])]

    async with session_factory() as session:
        try:
            print("🗑️ 開始清理測試資料...")

            # Clean hierarchy data first (FK dependencies)
            await session.execute(
                text("DELETE FROM business_units WHERE created_by = 'seed_script'")
            )
            await session.execute(
                text("DELETE FROM customer_locations WHERE created_by = 'seed_script'")
            )
            await session.execute(
                text("DELETE FROM customer_companies WHERE created_by = 'seed_script'")
            )

            if sku_codes:
                await session.execute(
                    text('DELETE FROM product_skus WHERE "skuCode" = ANY(:codes)'),
                    {"codes": sku_codes},
                )

            if category_codes:
                await session.execute(
                    text('DELETE FROM product_categories WHERE code = ANY(:codes)'),
                    {"codes": category_codes},
                )

            if supplier_ids:
                await session.execute(
                    text('DELETE FROM supplier_profiles WHERE "organizationId" = ANY(:ids)'),
                    {"ids": supplier_ids},
                )
                await session.execute(
                    text('DELETE FROM organizations WHERE id = ANY(:ids)'),
                    {"ids": supplier_ids},
                )

            # Remove any residual entries tagged by seedSource
            await session.execute(
                text(
                    "DELETE FROM supplier_profiles WHERE settings::jsonb->>'seedSource' = :source"
                ),
                {"source": SEED_SOURCE_KEY},
            )
            await session.execute(
                text(
                    "DELETE FROM organizations WHERE settings::jsonb->>'seedSource' = :source"
                ),
                {"source": SEED_SOURCE_KEY},
            )
            await session.execute(
                text(
                    "DELETE FROM product_categories WHERE metadata::jsonb->>'seedSource' = :source"
                ),
                {"source": SEED_SOURCE_KEY},
            )

            await session.commit()
            print("✅ 清理完成")
        except Exception as exc:
            await session.rollback()
            print(f"❌ 清理失敗: {exc}")
            raise
        finally:
            await engine.dispose()


async def create_all_data(
    database_url: str,
    seed_payload: Dict[str, Any],
    force: bool = False,
) -> None:
    """Create all seed data, optionally cleaning existing records first."""
    if force:
        await clean_all_data(database_url, seed_payload)

    session_factory, engine = create_session_factory(database_url)

    async with session_factory() as session:
        try:
            print("🚀 開始創建測試資料...")
            await create_suppliers(session, seed_payload.get("suppliers", []))
            await create_categories(session, seed_payload.get("categories", []))
            await create_skus(session, seed_payload.get("skus", []))
            await create_customers(session, seed_payload.get("customers", {}))
            await session.commit()
            print("✅ 所有測試資料創建完成！")
        except Exception as exc:
            await session.rollback()
            print(f"❌ 創建失敗: {exc}")
            raise
        finally:
            await engine.dispose()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="管理真實測試資料")
    parser.add_argument("--database-url", help="自訂資料庫連線字串 (預設讀取 DATABASE_URL)")
    parser.add_argument("--db-password-secret", help="Secret Manager 中儲存資料庫密碼的機密名稱")
    parser.add_argument("--gcp-project", help="Secret Manager 所在的 GCP 專案 ID")
    parser.add_argument("--secret-version", default="latest", help="Secret Manager 版本 (預設 latest)")
    parser.add_argument("--clean", action="store_true", help="僅清理現有的測試資料")
    parser.add_argument("--force", action="store_true", help="創建前先清理既有資料")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    seed_payload = load_seed_payload()
    database_url = resolve_database_url(args)

    if args.clean:
        asyncio.run(clean_all_data(database_url, seed_payload))
    else:
        asyncio.run(create_all_data(database_url, seed_payload, force=args.force))
        print("✨ 完成！")


if __name__ == "__main__":
    main()
