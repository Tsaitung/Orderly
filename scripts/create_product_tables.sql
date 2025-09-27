-- Create products table
CREATE TABLE products (
    id VARCHAR PRIMARY KEY,
    "categoryId" VARCHAR NOT NULL REFERENCES product_categories(id),
    code VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    "nameEn" VARCHAR,
    description VARCHAR,
    "descriptionEn" VARCHAR,
    images JSON,
    tags JSON,
    "unitOfMeasure" VARCHAR NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "supplierId" VARCHAR,
    "supplierProductId" VARCHAR,
    "originCountry" VARCHAR,
    "originRegion" VARCHAR,
    "minStock" INTEGER,
    "maxStock" INTEGER,
    "leadTimeDays" INTEGER,
    status VARCHAR DEFAULT 'active',
    allergens JSON,
    "nutritionalInfo" JSON,
    certifications JSON,
    metadata JSON
);

CREATE INDEX ix_products_code ON products(code);
CREATE INDEX "ix_products_categoryId" ON products("categoryId");
CREATE INDEX "ix_products_supplierId" ON products("supplierId");

-- Create product_skus table
CREATE TABLE product_skus (
    id VARCHAR PRIMARY KEY,
    "productId" VARCHAR NOT NULL REFERENCES products(id),
    "skuCode" VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    variant JSON NOT NULL DEFAULT '{}',
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    weight FLOAT,
    dimensions JSON,
    "packageType" VARCHAR,
    "shelfLifeDays" INTEGER,
    "storageConditions" VARCHAR,
    "batchTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    type skutype NOT NULL DEFAULT 'STANDARD',
    creator_type creatortype NOT NULL DEFAULT 'SYSTEM',
    creator_id VARCHAR(36),
    standard_info JSON,
    approval_status approvalstatus NOT NULL DEFAULT 'DRAFT',
    approved_by VARCHAR(36),
    approved_at TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    "pricingMethod" pricingmethod,
    "pricingUnit" VARCHAR NOT NULL DEFAULT 'unit',
    "unitPrice" FLOAT,
    "minOrderQuantity" FLOAT,
    "quantityIncrement" FLOAT,
    "originCountry" VARCHAR,
    "originRegion" VARCHAR,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "ix_product_skus_skuCode" ON product_skus("skuCode");
CREATE INDEX "ix_product_skus_productId" ON product_skus("productId");

-- Create supplier_product_skus table
CREATE TABLE supplier_product_skus (
    id VARCHAR PRIMARY KEY,
    "supplierId" VARCHAR NOT NULL,
    "productSkuId" VARCHAR NOT NULL REFERENCES product_skus(id),
    "supplierSkuCode" VARCHAR,
    "unitPrice" FLOAT NOT NULL,
    "minOrderQuantity" FLOAT NOT NULL DEFAULT 1,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    metadata JSON,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "ix_supplier_product_skus_supplierId" ON supplier_product_skus("supplierId");
CREATE INDEX "ix_supplier_product_skus_productSkuId" ON supplier_product_skus("productSkuId");

-- Create sku_code_sequences table
CREATE TABLE sku_code_sequences (
    id VARCHAR PRIMARY KEY,
    category VARCHAR NOT NULL UNIQUE,
    prefix VARCHAR NOT NULL,
    current_sequence INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update alembic_version to mark migration as complete
INSERT INTO alembic_version (version_num) VALUES ('f2fcfbdc3a33')
ON CONFLICT (version_num) DO NOTHING;