"""add_supplier_billing_tables

Revision ID: 37f88ca92241
Revises: 20250919_0001_initial_billing
Create Date: 2025-09-20 16:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '37f88ca92241'
down_revision = 'bill_init_0001'
branch_labels = None
depends_on = None


def upgrade():
    # Create billing_rate_configs table
    op.create_table('billing_rate_configs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('configName', sa.String(), nullable=False),
        sa.Column('configType', sa.String(), nullable=False),
        sa.Column('isActive', sa.Boolean(), nullable=False, default=True),
        sa.Column('baseRate', sa.DECIMAL(precision=5, scale=4), nullable=True),
        sa.Column('minAmount', sa.DECIMAL(precision=12, scale=2), nullable=True),
        sa.Column('maxAmount', sa.DECIMAL(precision=12, scale=2), nullable=True),
        sa.Column('effectiveFrom', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('effectiveTo', sa.DateTime(timezone=True), nullable=True),
        sa.Column('targetSupplierType', sa.String(), nullable=True),
        sa.Column('targetProductCategory', sa.String(), nullable=True),
        sa.Column('minMonthlyGMV', sa.DECIMAL(precision=15, scale=2), nullable=True),
        sa.Column('maxMonthlyGMV', sa.DECIMAL(precision=15, scale=2), nullable=True),
        sa.Column('additionalConfig', sa.JSON(), nullable=False, default=dict),
        sa.Column('createdBy', sa.String(), nullable=False),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('approvalStatus', sa.String(), nullable=False, default='draft'),
        sa.Column('approvedBy', sa.String(), nullable=True),
        sa.Column('approvedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, default=1),
        sa.Column('parentConfigId', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create transaction_rate_tiers table
    op.create_table('transaction_rate_tiers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tierName', sa.String(), nullable=False),
        sa.Column('tierOrder', sa.Integer(), nullable=False),
        sa.Column('minMonthlyGMV', sa.DECIMAL(precision=15, scale=2), nullable=False),
        sa.Column('maxMonthlyGMV', sa.DECIMAL(precision=15, scale=2), nullable=True),
        sa.Column('commissionRate', sa.DECIMAL(precision=5, scale=4), nullable=False),
        sa.Column('fixedFee', sa.DECIMAL(precision=10, scale=2), nullable=True, default=0),
        sa.Column('discountRate', sa.DECIMAL(precision=5, scale=4), nullable=True),
        sa.Column('promotionalRate', sa.DECIMAL(precision=5, scale=4), nullable=True),
        sa.Column('promoStartDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('promoEndDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('isActive', sa.Boolean(), nullable=False, default=True),
        sa.Column('effectiveFrom', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('effectiveTo', sa.DateTime(timezone=True), nullable=True),
        sa.Column('supplierType', sa.String(), nullable=True),
        sa.Column('region', sa.String(), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=False),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create subscription_plans table
    op.create_table('subscription_plans',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('planCode', sa.String(), nullable=False),
        sa.Column('planName', sa.String(), nullable=False),
        sa.Column('planNameEn', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('monthlyPrice', sa.DECIMAL(precision=10, scale=2), nullable=False, default=0),
        sa.Column('annualPrice', sa.DECIMAL(precision=10, scale=2), nullable=True),
        sa.Column('setupFee', sa.DECIMAL(precision=10, scale=2), nullable=True, default=0),
        sa.Column('tierLevel', sa.Integer(), nullable=False),
        sa.Column('displayOrder', sa.Integer(), nullable=False),
        sa.Column('maxMonthlyOrders', sa.Integer(), nullable=True),
        sa.Column('maxProducts', sa.Integer(), nullable=True),
        sa.Column('maxLocations', sa.Integer(), nullable=True),
        sa.Column('maxApiCalls', sa.Integer(), nullable=True),
        sa.Column('storageQuotaGB', sa.Integer(), nullable=True),
        sa.Column('features', sa.JSON(), nullable=False, default=dict),
        sa.Column('restrictions', sa.JSON(), nullable=False, default=dict),
        sa.Column('isActive', sa.Boolean(), nullable=False, default=True),
        sa.Column('isPublic', sa.Boolean(), nullable=False, default=True),
        sa.Column('isPopular', sa.Boolean(), nullable=False, default=False),
        sa.Column('commissionRateOverride', sa.DECIMAL(precision=5, scale=4), nullable=True),
        sa.Column('freeTrialDays', sa.Integer(), nullable=True, default=0),
        sa.Column('promotionalPrice', sa.DECIMAL(precision=10, scale=2), nullable=True),
        sa.Column('promoStartDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('promoEndDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('effectiveFrom', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('effectiveTo', sa.DateTime(timezone=True), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=False),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('planCode')
    )

    # Create supplier_subscriptions table
    op.create_table('supplier_subscriptions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('supplierId', sa.String(), nullable=False),
        sa.Column('organizationId', sa.String(), nullable=False),
        sa.Column('planId', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, default='active'),
        sa.Column('billingCycle', sa.String(), nullable=False, default='monthly'),
        sa.Column('startDate', sa.DateTime(timezone=True), nullable=False),
        sa.Column('endDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trialEndDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('nextBillingDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelledAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('monthlyPrice', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('setupFeePaid', sa.DECIMAL(precision=10, scale=2), nullable=True, default=0),
        sa.Column('discountAmount', sa.DECIMAL(precision=10, scale=2), nullable=True, default=0),
        sa.Column('currentMonthOrders', sa.Integer(), nullable=False, default=0),
        sa.Column('currentMonthGMV', sa.DECIMAL(precision=15, scale=2), nullable=False, default=0),
        sa.Column('totalOrders', sa.Integer(), nullable=False, default=0),
        sa.Column('totalGMV', sa.DECIMAL(precision=15, scale=2), nullable=False, default=0),
        sa.Column('usedProducts', sa.Integer(), nullable=False, default=0),
        sa.Column('usedLocations', sa.Integer(), nullable=False, default=0),
        sa.Column('usedApiCalls', sa.Integer(), nullable=False, default=0),
        sa.Column('usedStorageGB', sa.DECIMAL(precision=8, scale=2), nullable=False, default=0),
        sa.Column('autoRenew', sa.Boolean(), nullable=False, default=True),
        sa.Column('paymentMethodId', sa.String(), nullable=True),
        sa.Column('cancellationReason', sa.String(), nullable=True),
        sa.Column('cancellationNotes', sa.Text(), nullable=True),
        sa.Column('cancelledBy', sa.String(), nullable=True),
        sa.Column('promoCode', sa.String(), nullable=True),
        sa.Column('referralId', sa.String(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=False, default=dict),
        sa.Column('createdBy', sa.String(), nullable=False),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['planId'], ['subscription_plans.id'])
    )

    # Create billing_transactions table
    op.create_table('billing_transactions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('transactionId', sa.String(), nullable=False),
        sa.Column('orderId', sa.String(), nullable=False),
        sa.Column('supplierId', sa.String(), nullable=False),
        sa.Column('organizationId', sa.String(), nullable=False),
        sa.Column('customerId', sa.String(), nullable=True),
        sa.Column('orderAmount', sa.DECIMAL(precision=12, scale=2), nullable=False),
        sa.Column('commissionRate', sa.DECIMAL(precision=5, scale=4), nullable=False),
        sa.Column('commissionAmount', sa.DECIMAL(precision=12, scale=2), nullable=False),
        sa.Column('rateTierId', sa.String(), nullable=True),
        sa.Column('rateConfigId', sa.String(), nullable=True),
        sa.Column('transactionDate', sa.DateTime(timezone=True), nullable=False),
        sa.Column('billingPeriod', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, default='pending'),
        sa.Column('productCategory', sa.String(), nullable=True),
        sa.Column('businessUnit', sa.String(), nullable=True),
        sa.Column('deliveryRegion', sa.String(), nullable=True),
        sa.Column('supplierRegion', sa.String(), nullable=True),
        sa.Column('discountAmount', sa.DECIMAL(precision=10, scale=2), nullable=True, default=0),
        sa.Column('adjustmentAmount', sa.DECIMAL(precision=10, scale=2), nullable=True, default=0),
        sa.Column('adjustmentReason', sa.String(), nullable=True),
        sa.Column('refundAmount', sa.DECIMAL(precision=10, scale=2), nullable=True, default=0),
        sa.Column('refundDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('refundReason', sa.Text(), nullable=True),
        sa.Column('settlementStatus', sa.String(), nullable=False, default='unsettled'),
        sa.Column('settlementDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('statementId', sa.String(), nullable=True),
        sa.Column('isPromotional', sa.Boolean(), nullable=False, default=False),
        sa.Column('isFirstOrder', sa.Boolean(), nullable=False, default=False),
        sa.Column('paymentMethod', sa.String(), nullable=True),
        sa.Column('deliveryScore', sa.DECIMAL(precision=3, scale=2), nullable=True),
        sa.Column('qualityScore', sa.DECIMAL(precision=3, scale=2), nullable=True),
        sa.Column('serviceScore', sa.DECIMAL(precision=3, scale=2), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=False, default=dict),
        sa.Column('externalRef', sa.String(), nullable=True),
        sa.Column('processedBy', sa.String(), nullable=True),
        sa.Column('processedAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=False),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('transactionId'),
        sa.ForeignKeyConstraint(['rateTierId'], ['transaction_rate_tiers.id']),
        sa.ForeignKeyConstraint(['rateConfigId'], ['billing_rate_configs.id'])
    )

    # Create monthly_billing_statements table
    op.create_table('monthly_billing_statements',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('statementNumber', sa.String(), nullable=False),
        sa.Column('supplierId', sa.String(), nullable=False),
        sa.Column('organizationId', sa.String(), nullable=False),
        sa.Column('billingPeriod', sa.String(), nullable=False),
        sa.Column('periodStart', sa.DateTime(timezone=True), nullable=False),
        sa.Column('periodEnd', sa.DateTime(timezone=True), nullable=False),
        sa.Column('subscriptionFee', sa.DECIMAL(precision=10, scale=2), nullable=False, default=0),
        sa.Column('setupFee', sa.DECIMAL(precision=10, scale=2), nullable=False, default=0),
        sa.Column('totalOrders', sa.Integer(), nullable=False, default=0),
        sa.Column('totalGMV', sa.DECIMAL(precision=15, scale=2), nullable=False, default=0),
        sa.Column('confirmedOrders', sa.Integer(), nullable=False, default=0),
        sa.Column('confirmedGMV', sa.DECIMAL(precision=15, scale=2), nullable=False, default=0),
        sa.Column('grossCommission', sa.DECIMAL(precision=12, scale=2), nullable=False, default=0),
        sa.Column('commissionAdjustments', sa.DECIMAL(precision=12, scale=2), nullable=False, default=0),
        sa.Column('commissionDiscounts', sa.DECIMAL(precision=12, scale=2), nullable=False, default=0),
        sa.Column('commissionRefunds', sa.DECIMAL(precision=12, scale=2), nullable=False, default=0),
        sa.Column('netCommission', sa.DECIMAL(precision=12, scale=2), nullable=False, default=0),
        sa.Column('addonServicesFee', sa.DECIMAL(precision=10, scale=2), nullable=False, default=0),
        sa.Column('storageFee', sa.DECIMAL(precision=8, scale=2), nullable=False, default=0),
        sa.Column('apiOverageFee', sa.DECIMAL(precision=8, scale=2), nullable=False, default=0),
        sa.Column('subtotal', sa.DECIMAL(precision=12, scale=2), nullable=False),
        sa.Column('taxRate', sa.DECIMAL(precision=5, scale=4), nullable=False, default=0.05),
        sa.Column('taxAmount', sa.DECIMAL(precision=10, scale=2), nullable=False, default=0),
        sa.Column('totalAmount', sa.DECIMAL(precision=12, scale=2), nullable=False),
        sa.Column('status', sa.String(), nullable=False, default='draft'),
        sa.Column('generatedDate', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('sentDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dueDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paidDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paymentMethod', sa.String(), nullable=True),
        sa.Column('paymentReference', sa.String(), nullable=True),
        sa.Column('paidAmount', sa.DECIMAL(precision=12, scale=2), nullable=True, default=0),
        sa.Column('overdueDays', sa.Integer(), nullable=False, default=0),
        sa.Column('lateFee', sa.DECIMAL(precision=8, scale=2), nullable=False, default=0),
        sa.Column('disputeReason', sa.Text(), nullable=True),
        sa.Column('disputeAmount', sa.DECIMAL(precision=10, scale=2), nullable=True),
        sa.Column('disputeResolvedDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('appliedRateTier', sa.String(), nullable=True),
        sa.Column('averageCommissionRate', sa.DECIMAL(precision=5, scale=4), nullable=True),
        sa.Column('averageDeliveryScore', sa.DECIMAL(precision=3, scale=2), nullable=True),
        sa.Column('averageQualityScore', sa.DECIMAL(precision=3, scale=2), nullable=True),
        sa.Column('averageServiceScore', sa.DECIMAL(precision=3, scale=2), nullable=True),
        sa.Column('categoryBreakdown', sa.JSON(), nullable=False, default=dict),
        sa.Column('regionBreakdown', sa.JSON(), nullable=False, default=dict),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('attachmentUrls', sa.JSON(), nullable=False, default=list),
        sa.Column('generatedBy', sa.String(), nullable=False),
        sa.Column('approvedBy', sa.String(), nullable=True),
        sa.Column('approvedDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=False),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('statementNumber')
    )

    # Create payment_records table
    op.create_table('payment_records',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('paymentId', sa.String(), nullable=False),
        sa.Column('statementId', sa.String(), nullable=True),
        sa.Column('supplierId', sa.String(), nullable=False),
        sa.Column('organizationId', sa.String(), nullable=False),
        sa.Column('paymentAmount', sa.DECIMAL(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(), nullable=False, default='TWD'),
        sa.Column('paymentMethod', sa.String(), nullable=False),
        sa.Column('paymentGateway', sa.String(), nullable=True),
        sa.Column('externalTransactionId', sa.String(), nullable=True),
        sa.Column('gatewayReference', sa.String(), nullable=True),
        sa.Column('bankReference', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, default='pending'),
        sa.Column('paymentDate', sa.DateTime(timezone=True), nullable=False),
        sa.Column('processedDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('settledDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cardLastFour', sa.String(), nullable=True),
        sa.Column('cardBrand', sa.String(), nullable=True),
        sa.Column('cardExpiryMonth', sa.Integer(), nullable=True),
        sa.Column('cardExpiryYear', sa.Integer(), nullable=True),
        sa.Column('bankCode', sa.String(), nullable=True),
        sa.Column('bankName', sa.String(), nullable=True),
        sa.Column('accountNumberMasked', sa.String(), nullable=True),
        sa.Column('gatewayFee', sa.DECIMAL(precision=8, scale=2), nullable=True, default=0),
        sa.Column('bankFee', sa.DECIMAL(precision=8, scale=2), nullable=True, default=0),
        sa.Column('totalFees', sa.DECIMAL(precision=8, scale=2), nullable=True, default=0),
        sa.Column('netAmount', sa.DECIMAL(precision=12, scale=2), nullable=True),
        sa.Column('failureReason', sa.String(), nullable=True),
        sa.Column('failureCode', sa.String(), nullable=True),
        sa.Column('retryCount', sa.Integer(), nullable=False, default=0),
        sa.Column('maxRetries', sa.Integer(), nullable=False, default=3),
        sa.Column('refundAmount', sa.DECIMAL(precision=12, scale=2), nullable=True, default=0),
        sa.Column('refundDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('refundReason', sa.Text(), nullable=True),
        sa.Column('refundReference', sa.String(), nullable=True),
        sa.Column('riskScore', sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column('fraudCheckStatus', sa.String(), nullable=True),
        sa.Column('ipAddress', sa.String(), nullable=True),
        sa.Column('userAgent', sa.Text(), nullable=True),
        sa.Column('installmentPlan', sa.String(), nullable=True),
        sa.Column('installmentCount', sa.Integer(), nullable=True),
        sa.Column('currentInstallment', sa.Integer(), nullable=True),
        sa.Column('isAutoPayment', sa.Boolean(), nullable=False, default=False),
        sa.Column('recurringPaymentId', sa.String(), nullable=True),
        sa.Column('customerNotified', sa.Boolean(), nullable=False, default=False),
        sa.Column('notificationSentAt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=False, default=dict),
        sa.Column('gatewayResponse', sa.JSON(), nullable=False, default=dict),
        sa.Column('processedBy', sa.String(), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=False),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('paymentId'),
        sa.ForeignKeyConstraint(['statementId'], ['monthly_billing_statements.id'])
    )

    # Create supplier_ratings table
    op.create_table('supplier_ratings',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('supplierId', sa.String(), nullable=False),
        sa.Column('organizationId', sa.String(), nullable=False),
        sa.Column('ratingPeriod', sa.String(), nullable=False),
        sa.Column('periodStart', sa.DateTime(timezone=True), nullable=False),
        sa.Column('periodEnd', sa.DateTime(timezone=True), nullable=False),
        sa.Column('overallRating', sa.String(), nullable=False),
        sa.Column('overallScore', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('previousRating', sa.String(), nullable=True),
        sa.Column('ratingChange', sa.String(), nullable=True),
        sa.Column('orderFulfillmentRate', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('onTimeDeliveryRate', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('qualityScore', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('customerSatisfaction', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('responseTimeScore', sa.DECIMAL(precision=5, scale=2), nullable=False),
        sa.Column('totalOrders', sa.Integer(), nullable=False, default=0),
        sa.Column('totalGMV', sa.DECIMAL(precision=15, scale=2), nullable=False, default=0),
        sa.Column('averageOrderValue', sa.DECIMAL(precision=10, scale=2), nullable=False, default=0),
        sa.Column('orderGrowthRate', sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column('returnRate', sa.DECIMAL(precision=5, scale=2), nullable=False, default=0),
        sa.Column('complaintRate', sa.DECIMAL(precision=5, scale=2), nullable=False, default=0),
        sa.Column('defectRate', sa.DECIMAL(precision=5, scale=2), nullable=False, default=0),
        sa.Column('avgResponseTimeHours', sa.DECIMAL(precision=6, scale=2), nullable=True),
        sa.Column('orderCancellationRate', sa.DECIMAL(precision=5, scale=2), nullable=False, default=0),
        sa.Column('inventoryAccuracy', sa.DECIMAL(precision=5, scale=2), nullable=False, default=0),
        sa.Column('complianceScore', sa.DECIMAL(precision=5, scale=2), nullable=False, default=0),
        sa.Column('documentCompleteness', sa.DECIMAL(precision=5, scale=2), nullable=False, default=0),
        sa.Column('certificationStatus', sa.String(), nullable=True),
        sa.Column('paymentTimeliness', sa.DECIMAL(precision=5, scale=2), nullable=False, default=0),
        sa.Column('creditScore', sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column('financialStability', sa.String(), nullable=True),
        sa.Column('commissionDiscountRate', sa.DECIMAL(precision=5, scale=4), nullable=True),
        sa.Column('prioritySupport', sa.Boolean(), nullable=False, default=False),
        sa.Column('featuredListing', sa.Boolean(), nullable=False, default=False),
        sa.Column('extendedPaymentTerms', sa.Integer(), nullable=True),
        sa.Column('improvementAreas', sa.JSON(), nullable=False, default=list),
        sa.Column('recommendations', sa.JSON(), nullable=False, default=list),
        sa.Column('actionItems', sa.JSON(), nullable=False, default=list),
        sa.Column('awards', sa.JSON(), nullable=False, default=list),
        sa.Column('penalties', sa.JSON(), nullable=False, default=list),
        sa.Column('bonusEarned', sa.DECIMAL(precision=10, scale=2), nullable=False, default=0),
        sa.Column('penaltyAmount', sa.DECIMAL(precision=10, scale=2), nullable=False, default=0),
        sa.Column('scoreTrend', sa.String(), nullable=True),
        sa.Column('riskLevel', sa.String(), nullable=False, default='low'),
        sa.Column('isActive', sa.Boolean(), nullable=False, default=True),
        sa.Column('isPublished', sa.Boolean(), nullable=False, default=False),
        sa.Column('publishedDate', sa.DateTime(timezone=True), nullable=True),
        sa.Column('calculatedBy', sa.String(), nullable=False),
        sa.Column('reviewedBy', sa.String(), nullable=True),
        sa.Column('approvedBy', sa.String(), nullable=True),
        sa.Column('createdBy', sa.String(), nullable=False),
        sa.Column('updatedBy', sa.String(), nullable=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updatedAt', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for billing_rate_configs
    op.create_index('idx_billing_rate_configs_config_type', 'billing_rate_configs', ['configType'])
    op.create_index('idx_billing_rate_configs_is_active', 'billing_rate_configs', ['isActive'])
    op.create_index('idx_billing_rate_configs_effective_period', 'billing_rate_configs', ['effectiveFrom', 'effectiveTo'])

    # Create indexes for transaction_rate_tiers
    op.create_index('idx_tier_order', 'transaction_rate_tiers', ['tierOrder'])
    op.create_index('idx_gmv_range', 'transaction_rate_tiers', ['minMonthlyGMV', 'maxMonthlyGMV'])
    op.create_index('idx_effective_period', 'transaction_rate_tiers', ['effectiveFrom', 'effectiveTo'])
    op.create_index('idx_supplier_type', 'transaction_rate_tiers', ['supplierType'])

    # Create indexes for subscription_plans
    op.create_index('idx_plan_code', 'subscription_plans', ['planCode'])
    op.create_index('idx_tier_level', 'subscription_plans', ['tierLevel'])
    op.create_index('idx_display_order', 'subscription_plans', ['displayOrder'])
    op.create_index('idx_active_public', 'subscription_plans', ['isActive', 'isPublic'])

    # Create indexes for supplier_subscriptions
    op.create_index('idx_supplier_id', 'supplier_subscriptions', ['supplierId'])
    op.create_index('idx_organization_id', 'supplier_subscriptions', ['organizationId'])
    op.create_index('idx_status', 'supplier_subscriptions', ['status'])
    op.create_index('idx_billing_cycle', 'supplier_subscriptions', ['billingCycle'])
    op.create_index('idx_next_billing_date', 'supplier_subscriptions', ['nextBillingDate'])
    op.create_index('idx_supplier_status', 'supplier_subscriptions', ['supplierId', 'status'])
    op.create_index('idx_start_end_date', 'supplier_subscriptions', ['startDate', 'endDate'])

    # Create indexes for billing_transactions
    op.create_index('idx_transaction_id', 'billing_transactions', ['transactionId'])
    op.create_index('idx_order_id', 'billing_transactions', ['orderId'])
    op.create_index('idx_supplier_id_bt', 'billing_transactions', ['supplierId'])
    op.create_index('idx_organization_id_bt', 'billing_transactions', ['organizationId'])
    op.create_index('idx_transaction_date', 'billing_transactions', ['transactionDate'])
    op.create_index('idx_billing_period', 'billing_transactions', ['billingPeriod'])
    op.create_index('idx_status_bt', 'billing_transactions', ['status'])
    op.create_index('idx_settlement_status', 'billing_transactions', ['settlementStatus'])
    op.create_index('idx_supplier_period', 'billing_transactions', ['supplierId', 'billingPeriod'])
    op.create_index('idx_supplier_date', 'billing_transactions', ['supplierId', 'transactionDate'])
    op.create_index('idx_settlement_date', 'billing_transactions', ['settlementDate'])
    op.create_index('idx_statement_id', 'billing_transactions', ['statementId'])

    # Create indexes for monthly_billing_statements
    op.create_index('idx_statement_number', 'monthly_billing_statements', ['statementNumber'])
    op.create_index('idx_supplier_id_mbs', 'monthly_billing_statements', ['supplierId'])
    op.create_index('idx_organization_id_mbs', 'monthly_billing_statements', ['organizationId'])
    op.create_index('idx_billing_period_mbs', 'monthly_billing_statements', ['billingPeriod'])
    op.create_index('idx_status_mbs', 'monthly_billing_statements', ['status'])
    op.create_index('idx_due_date', 'monthly_billing_statements', ['dueDate'])
    op.create_index('idx_generated_date', 'monthly_billing_statements', ['generatedDate'])
    op.create_index('idx_supplier_period_mbs', 'monthly_billing_statements', ['supplierId', 'billingPeriod'])
    op.create_index('idx_supplier_status_mbs', 'monthly_billing_statements', ['supplierId', 'status'])
    op.create_index('idx_period_dates', 'monthly_billing_statements', ['periodStart', 'periodEnd'])

    # Create indexes for payment_records
    op.create_index('idx_payment_id', 'payment_records', ['paymentId'])
    op.create_index('idx_statement_id_pr', 'payment_records', ['statementId'])
    op.create_index('idx_supplier_id_pr', 'payment_records', ['supplierId'])
    op.create_index('idx_organization_id_pr', 'payment_records', ['organizationId'])
    op.create_index('idx_status_pr', 'payment_records', ['status'])
    op.create_index('idx_payment_date', 'payment_records', ['paymentDate'])
    op.create_index('idx_payment_method', 'payment_records', ['paymentMethod'])
    op.create_index('idx_external_transaction_id', 'payment_records', ['externalTransactionId'])
    op.create_index('idx_gateway_reference', 'payment_records', ['gatewayReference'])
    op.create_index('idx_supplier_date_pr', 'payment_records', ['supplierId', 'paymentDate'])
    op.create_index('idx_supplier_status_pr', 'payment_records', ['supplierId', 'status'])
    op.create_index('idx_processed_date', 'payment_records', ['processedDate'])

    # Create indexes for supplier_ratings
    op.create_index('idx_supplier_id_sr', 'supplier_ratings', ['supplierId'])
    op.create_index('idx_organization_id_sr', 'supplier_ratings', ['organizationId'])
    op.create_index('idx_rating_period', 'supplier_ratings', ['ratingPeriod'])
    op.create_index('idx_overall_rating', 'supplier_ratings', ['overallRating'])
    op.create_index('idx_overall_score', 'supplier_ratings', ['overallScore'])
    op.create_index('idx_supplier_period_sr', 'supplier_ratings', ['supplierId', 'ratingPeriod'])
    op.create_index('idx_period_dates_sr', 'supplier_ratings', ['periodStart', 'periodEnd'])
    op.create_index('idx_published', 'supplier_ratings', ['isPublished', 'publishedDate'])


def downgrade():
    # Drop indexes first
    op.drop_index('idx_published', 'supplier_ratings')
    op.drop_index('idx_period_dates_sr', 'supplier_ratings')
    op.drop_index('idx_supplier_period_sr', 'supplier_ratings')
    op.drop_index('idx_overall_score', 'supplier_ratings')
    op.drop_index('idx_overall_rating', 'supplier_ratings')
    op.drop_index('idx_rating_period', 'supplier_ratings')
    op.drop_index('idx_organization_id_sr', 'supplier_ratings')
    op.drop_index('idx_supplier_id_sr', 'supplier_ratings')

    op.drop_index('idx_processed_date', 'payment_records')
    op.drop_index('idx_supplier_status_pr', 'payment_records')
    op.drop_index('idx_supplier_date_pr', 'payment_records')
    op.drop_index('idx_gateway_reference', 'payment_records')
    op.drop_index('idx_external_transaction_id', 'payment_records')
    op.drop_index('idx_payment_method', 'payment_records')
    op.drop_index('idx_payment_date', 'payment_records')
    op.drop_index('idx_status_pr', 'payment_records')
    op.drop_index('idx_organization_id_pr', 'payment_records')
    op.drop_index('idx_supplier_id_pr', 'payment_records')
    op.drop_index('idx_statement_id_pr', 'payment_records')
    op.drop_index('idx_payment_id', 'payment_records')

    op.drop_index('idx_period_dates', 'monthly_billing_statements')
    op.drop_index('idx_supplier_status_mbs', 'monthly_billing_statements')
    op.drop_index('idx_supplier_period_mbs', 'monthly_billing_statements')
    op.drop_index('idx_generated_date', 'monthly_billing_statements')
    op.drop_index('idx_due_date', 'monthly_billing_statements')
    op.drop_index('idx_status_mbs', 'monthly_billing_statements')
    op.drop_index('idx_billing_period_mbs', 'monthly_billing_statements')
    op.drop_index('idx_organization_id_mbs', 'monthly_billing_statements')
    op.drop_index('idx_supplier_id_mbs', 'monthly_billing_statements')
    op.drop_index('idx_statement_number', 'monthly_billing_statements')

    op.drop_index('idx_statement_id', 'billing_transactions')
    op.drop_index('idx_settlement_date', 'billing_transactions')
    op.drop_index('idx_supplier_date', 'billing_transactions')
    op.drop_index('idx_supplier_period', 'billing_transactions')
    op.drop_index('idx_settlement_status', 'billing_transactions')
    op.drop_index('idx_status_bt', 'billing_transactions')
    op.drop_index('idx_billing_period', 'billing_transactions')
    op.drop_index('idx_transaction_date', 'billing_transactions')
    op.drop_index('idx_organization_id_bt', 'billing_transactions')
    op.drop_index('idx_supplier_id_bt', 'billing_transactions')
    op.drop_index('idx_order_id', 'billing_transactions')
    op.drop_index('idx_transaction_id', 'billing_transactions')

    op.drop_index('idx_start_end_date', 'supplier_subscriptions')
    op.drop_index('idx_supplier_status', 'supplier_subscriptions')
    op.drop_index('idx_next_billing_date', 'supplier_subscriptions')
    op.drop_index('idx_billing_cycle', 'supplier_subscriptions')
    op.drop_index('idx_status', 'supplier_subscriptions')
    op.drop_index('idx_organization_id', 'supplier_subscriptions')
    op.drop_index('idx_supplier_id', 'supplier_subscriptions')

    op.drop_index('idx_active_public', 'subscription_plans')
    op.drop_index('idx_display_order', 'subscription_plans')
    op.drop_index('idx_tier_level', 'subscription_plans')
    op.drop_index('idx_plan_code', 'subscription_plans')

    op.drop_index('idx_supplier_type', 'transaction_rate_tiers')
    op.drop_index('idx_effective_period', 'transaction_rate_tiers')
    op.drop_index('idx_gmv_range', 'transaction_rate_tiers')
    op.drop_index('idx_tier_order', 'transaction_rate_tiers')

    op.drop_index('idx_billing_rate_configs_effective_period', 'billing_rate_configs')
    op.drop_index('idx_billing_rate_configs_is_active', 'billing_rate_configs')
    op.drop_index('idx_billing_rate_configs_config_type', 'billing_rate_configs')

    # Drop tables
    op.drop_table('supplier_ratings')
    op.drop_table('payment_records')
    op.drop_table('monthly_billing_statements')
    op.drop_table('billing_transactions')
    op.drop_table('supplier_subscriptions')
    op.drop_table('subscription_plans')
    op.drop_table('transaction_rate_tiers')
    op.drop_table('billing_rate_configs')