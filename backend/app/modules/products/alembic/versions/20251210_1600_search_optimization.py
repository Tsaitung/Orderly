"""Add PostgreSQL full-text search optimization with tsvector

Revision ID: search_optimization
Revises: add_product_images
Create Date: 2025-12-10 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'search_optimization'
down_revision: Union[str, None] = 'add_product_images'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add full-text search optimization to products and product_skus tables.
    Uses PostgreSQL tsvector with weighted search for better relevance ranking.
    """

    # ============= Products Table Search Optimization =============

    # Add search_vector column to products
    op.execute("""
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS search_vector tsvector;
    """)

    # Create function to update products search vector
    op.execute("""
        CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(NEW.code, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C') ||
                setweight(to_tsvector('simple', COALESCE(NEW."originCountry", '')), 'C');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger for products
    op.execute("DROP TRIGGER IF EXISTS products_search_update ON products;")
    op.execute("""
        CREATE TRIGGER products_search_update
        BEFORE INSERT OR UPDATE ON products
        FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();
    """)

    # Create GIN index for products search
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_products_search_vector
        ON products USING GIN(search_vector);
    """)

    # Update existing products to populate search_vector
    op.execute("""
        UPDATE products SET
            search_vector =
                setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(code, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(description, '')), 'C') ||
                setweight(to_tsvector('simple', COALESCE("originCountry", '')), 'C')
        WHERE search_vector IS NULL;
    """)

    # ============= Product SKUs Table Search Optimization =============

    # Add search_vector column to product_skus
    op.execute("""
        ALTER TABLE product_skus
        ADD COLUMN IF NOT EXISTS search_vector tsvector;
    """)

    # Create function to update product_skus search vector
    op.execute("""
        CREATE OR REPLACE FUNCTION product_skus_search_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(NEW."skuCode", '')), 'A');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger for product_skus
    op.execute("DROP TRIGGER IF EXISTS product_skus_search_update ON product_skus;")
    op.execute("""
        CREATE TRIGGER product_skus_search_update
        BEFORE INSERT OR UPDATE ON product_skus
        FOR EACH ROW EXECUTE FUNCTION product_skus_search_vector_update();
    """)

    # Create GIN index for product_skus search
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_product_skus_search_vector
        ON product_skus USING GIN(search_vector);
    """)

    # Update existing product_skus to populate search_vector
    op.execute("""
        UPDATE product_skus SET
            search_vector =
                setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE("skuCode", '')), 'A')
        WHERE search_vector IS NULL;
    """)

    # ============= Product Categories Table Search Optimization =============

    # Add search_vector column to product_categories
    op.execute("""
        ALTER TABLE product_categories
        ADD COLUMN IF NOT EXISTS search_vector tsvector;
    """)

    # Create function to update product_categories search vector
    op.execute("""
        CREATE OR REPLACE FUNCTION product_categories_search_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(NEW.code, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger for product_categories
    op.execute("DROP TRIGGER IF EXISTS product_categories_search_update ON product_categories;")
    op.execute("""
        CREATE TRIGGER product_categories_search_update
        BEFORE INSERT OR UPDATE ON product_categories
        FOR EACH ROW EXECUTE FUNCTION product_categories_search_vector_update();
    """)

    # Create GIN index for product_categories search
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_product_categories_search_vector
        ON product_categories USING GIN(search_vector);
    """)

    # Update existing categories
    op.execute("""
        UPDATE product_categories SET
            search_vector =
                setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(code, '')), 'A') ||
                setweight(to_tsvector('simple', COALESCE(description, '')), 'B')
        WHERE search_vector IS NULL;
    """)


def downgrade() -> None:
    """Remove full-text search optimization"""

    # Drop product_categories search
    op.execute("DROP TRIGGER IF EXISTS product_categories_search_update ON product_categories;")
    op.execute("DROP FUNCTION IF EXISTS product_categories_search_vector_update();")
    op.execute("DROP INDEX IF EXISTS idx_product_categories_search_vector;")
    op.execute("ALTER TABLE product_categories DROP COLUMN IF EXISTS search_vector;")

    # Drop product_skus search
    op.execute("DROP TRIGGER IF EXISTS product_skus_search_update ON product_skus;")
    op.execute("DROP FUNCTION IF EXISTS product_skus_search_vector_update();")
    op.execute("DROP INDEX IF EXISTS idx_product_skus_search_vector;")
    op.execute("ALTER TABLE product_skus DROP COLUMN IF EXISTS search_vector;")

    # Drop products search
    op.execute("DROP TRIGGER IF EXISTS products_search_update ON products;")
    op.execute("DROP FUNCTION IF EXISTS products_search_vector_update();")
    op.execute("DROP INDEX IF EXISTS idx_products_search_vector;")
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS search_vector;")
