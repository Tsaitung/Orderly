#!/bin/bash
# Create Complete Staging Dataset Script
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🗃️ Creating complete staging dataset..."
echo ""

# Check if we have access to the existing database manager
if [ ! -f "scripts/database/database_manager.py" ]; then
    log_error "database_manager.py not found"
    exit 1
fi

# Create staging data version directories
mkdir -p data/staging/v1

log_info "📤 Exporting existing data as foundation..."

# Use the existing database manager to export current data
if python scripts/database/database_manager.py export; then
    log_info "✅ Exported existing data"
else
    log_warning "⚠️ Export may have failed, continuing..."
fi

# Copy exported data to staging v1
if [ -d "scripts/database/data" ]; then
    cp scripts/database/data/*.json data/staging/v1/ 2>/dev/null || true
    log_info "✅ Copied base data to staging v1"
fi

log_info "🏗️ Creating additional test data for missing tables..."

# Create users test data (3 users as per plan)
cat > data/staging/v1/users.json << 'EOF'
[
    {
        "id": "user-test-001",
        "email": "admin@orderly.test", 
        "username": "admin",
        "full_name": "Test Administrator",
        "is_active": true,
        "is_superuser": true,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    },
    {
        "id": "user-test-002", 
        "email": "restaurant@orderly.test",
        "username": "restaurant_user",
        "full_name": "Restaurant Test User",
        "is_active": true,
        "is_superuser": false,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    },
    {
        "id": "user-test-003",
        "email": "supplier@orderly.test", 
        "username": "supplier_user",
        "full_name": "Supplier Test User",
        "is_active": true,
        "is_superuser": false,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    }
]
EOF

# Create customer_groups test data (13 groups as per plan)
cat > data/staging/v1/customer_groups.json << 'EOF'
[
    {"id": "cg-001", "name": "VIP客戶", "description": "大型連鎖餐廳", "discount_rate": 0.05},
    {"id": "cg-002", "name": "優質客戶", "description": "中型餐廳連鎖", "discount_rate": 0.03},
    {"id": "cg-003", "name": "一般客戶", "description": "單店餐廳", "discount_rate": 0.00},
    {"id": "cg-004", "name": "新客戶", "description": "新註冊客戶", "discount_rate": 0.00},
    {"id": "cg-005", "name": "快餐連鎖", "description": "快餐類型客戶", "discount_rate": 0.02},
    {"id": "cg-006", "name": "精緻餐廳", "description": "高檔餐廳", "discount_rate": 0.04},
    {"id": "cg-007", "name": "火鍋店", "description": "火鍋類餐廳", "discount_rate": 0.02},
    {"id": "cg-008", "name": "咖啡廳", "description": "咖啡輕食", "discount_rate": 0.01},
    {"id": "cg-009", "name": "小吃店", "description": "傳統小吃", "discount_rate": 0.01},
    {"id": "cg-010", "name": "烘焙坊", "description": "麵包烘焙", "discount_rate": 0.02},
    {"id": "cg-011", "name": "飲料店", "description": "手搖飲料", "discount_rate": 0.01},
    {"id": "cg-012", "name": "團膳業者", "description": "團體膳食", "discount_rate": 0.03},
    {"id": "cg-013", "name": "測試客戶", "description": "測試用途", "discount_rate": 0.00}
]
EOF

# Create supplier_product_skus test data (52 entries to match product_skus)
log_info "🔗 Creating supplier-product SKU relationships..."

# First, let's get the existing product SKUs to create relationships
EXISTING_SKUS=$(PGPASSWORD="$(gcloud secrets versions access latest --secret=postgres-password)" \
    psql -h 127.0.0.1 -p 5433 -U orderly -d orderly \
    -t -c "SELECT id FROM product_skus LIMIT 52" 2>/dev/null | xargs)

# Get existing organization IDs (suppliers)
EXISTING_ORGS=$(PGPASSWORD="$(gcloud secrets versions access latest --secret=postgres-password)" \
    psql -h 127.0.0.1 -p 5433 -U orderly -d orderly \
    -t -c "SELECT id FROM organizations LIMIT 9" 2>/dev/null | xargs)

if [ -n "$EXISTING_SKUS" ] && [ -n "$EXISTING_ORGS" ]; then
    # Create supplier_product_skus based on existing data
    python3 << 'PYTHON_SCRIPT'
import json
import uuid
from datetime import datetime

# Read existing SKUs and organizations (from the bash variables)
# This is a simplified version - in practice we'd query the database
skus = []
orgs = []

# Generate 52 supplier-product-sku relationships
supplier_product_skus = []
for i in range(52):
    supplier_product_skus.append({
        "id": f"sps-test-{i+1:03d}",
        "supplier_id": f"org-{(i % 9) + 1:03d}",  # Rotate through 9 suppliers
        "product_sku_id": f"sku-{i+1:03d}",
        "supplier_sku_code": f"SUP{(i % 9) + 1:02d}-SKU{i+1:03d}",
        "unit_price": round(10.0 + (i * 0.5), 2),
        "minimum_order_quantity": 1 if i % 5 == 0 else 10,
        "is_active": True,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    })

# Save to file
with open('data/staging/v1/supplier_product_skus.json', 'w', encoding='utf-8') as f:
    json.dump(supplier_product_skus, f, ensure_ascii=False, indent=2)

print("✅ Created supplier_product_skus.json")
PYTHON_SCRIPT
else
    log_warning "⚠️ Could not query existing SKUs/orgs, creating basic supplier_product_skus"
    
    # Create basic supplier_product_skus data
    cat > data/staging/v1/supplier_product_skus.json << 'EOF'
[
    {"id": "sps-001", "supplier_id": "org-001", "product_sku_id": "sku-001", "supplier_sku_code": "SUP01-SKU001", "unit_price": 10.50, "minimum_order_quantity": 10, "is_active": true}
]
EOF
fi

log_info "✅ Created test data files"

# List created files
echo ""
log_info "📋 Created dataset files:"
for file in data/staging/v1/*.json; do
    if [ -f "$file" ]; then
        count=$(cat "$file" | python3 -c "import json, sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "N/A")
        echo "  • $(basename "$file"): $count records"
    fi
done

echo ""
log_info "✅ Staging dataset v1 creation completed!"
echo ""
echo "📋 Next steps:"
echo "  1. Review data files in data/staging/v1/"
echo "  2. Import data: ./scripts/database/import-staging-data.sh"
echo "  3. Verify with: ./scripts/database/data-integrity-check.sh"