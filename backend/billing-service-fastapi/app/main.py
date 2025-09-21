import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Import route modules
from app.api.v1.billing import router as billing_router
from app.routes.rate_config import router as rate_config_router
from app.routes.subscription import router as subscription_router
from app.routes.transaction import router as transaction_router
from app.routes.statement import router as statement_router
from app.routes.payment import router as payment_router
from app.routes.rating import router as rating_router

# Import platform management routes
from app.routes.platform.dashboard import router as platform_dashboard_router
from app.routes.platform.rates import router as platform_rates_router
from app.routes.platform.suppliers import router as platform_suppliers_router

# Import webhook routers
from app.webhooks.order_webhook import router as order_webhook_router
from app.webhooks.payment_webhook import router as payment_webhook_router

# Import scheduler
from app.core.scheduler import billing_scheduler

structlog.configure(processors=[structlog.stdlib.add_log_level, structlog.processors.JSONRenderer()])
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan manager for startup and shutdown tasks
    """
    # Startup
    logger.info("Starting Orderly Billing Service")
    try:
        # Start the billing scheduler
        await billing_scheduler.start()
        logger.info("Billing scheduler started successfully")
    except Exception as e:
        logger.error("Failed to start billing scheduler", error=str(e))
    
    yield  # Application runs here
    
    # Shutdown
    logger.info("Shutting down Orderly Billing Service")
    try:
        # Stop the billing scheduler
        await billing_scheduler.stop()
        logger.info("Billing scheduler stopped successfully")
    except Exception as e:
        logger.error("Failed to stop billing scheduler", error=str(e))


app = FastAPI(
    title="Orderly Billing Service (FastAPI)",
    description="Comprehensive automated billing service for Orderly platform with rate management, subscriptions, transactions, statements, payments, supplier ratings, and scheduled automation",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)


@app.get("/health")
async def health():
    """Enhanced health check endpoint with scheduler status"""
    try:
        scheduler_status = billing_scheduler.get_job_status()
        return {
            "status": "healthy",
            "service": "billing-service-fastapi", 
            "version": "2.0.0",
            "features": [
                "automated_billing",
                "commission_calculation", 
                "supplier_ratings",
                "payment_processing",
                "scheduled_tasks"
            ],
            "scheduler": {
                "running": scheduler_status.get("scheduler_running", False),
                "active_jobs": len(scheduler_status.get("active_jobs", [])),
                "running_jobs": len(scheduler_status.get("running_jobs", []))
            }
        }
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return {
            "status": "degraded",
            "service": "billing-service-fastapi",
            "version": "2.0.0",
            "error": str(e)
        }


@app.get("/")
async def root():
    """Root endpoint with comprehensive service information"""
    return {
        "service": "Orderly Automated Billing Service",
        "version": "2.0.0",
        "description": "Comprehensive automated billing platform with Taiwan market integration",
        "docs": "/docs",
        "redoc": "/redoc",
        "features": {
            "automated_billing": "Order-to-billing automation with real-time processing",
            "tiered_commission": "5-tier commission structure based on monthly GMV",
            "supplier_ratings": "Multi-factor rating system with performance tracking",
            "payment_processing": "ECPay and NewebPay integration for Taiwan market",
            "scheduled_automation": "Daily, weekly, and monthly automated tasks"
        },
        "endpoints": {
            "core_billing": {
                "rate_configuration": "/api/billing/rates",
                "subscriptions": "/api/billing/subscriptions",
                "transactions": "/api/billing/transactions", 
                "statements": "/api/billing/statements",
                "payments": "/api/billing/payments",
                "ratings": "/api/billing/ratings"
            },
            "platform_management": {
                "dashboard_metrics": "/api/billing/platform/dashboard/metrics",
                "system_health": "/api/billing/platform/dashboard/health",
                "rate_calculator": "/api/billing/platform/rates/calculate",
                "rate_configs": "/api/billing/platform/rates/configs",
                "suppliers_billing": "/api/billing/platform/suppliers",
                "billing_analytics": "/api/billing/platform/suppliers/analytics",
                "batch_operations": "/api/billing/platform/suppliers/batch"
            },
            "webhooks": {
                "order_completion": "/webhooks/orders/order-completed",
                "order_status_update": "/webhooks/orders/order-status-updated",
                "ecpay_callback": "/webhooks/payments/ecpay/callback",
                "newebpay_callback": "/webhooks/payments/newebpay/callback"
            },
            "administration": {
                "scheduler_status": "/admin/scheduler/status",
                "trigger_job": "/admin/scheduler/trigger/{job_id}",
                "health_check": "/health"
            }
        },
        "commission_tiers": {
            "tier_1": "0-NT$50,000: 3.0%",
            "tier_2": "NT$50,001-NT$200,000: 2.5%", 
            "tier_3": "NT$200,001-NT$500,000: 2.0%",
            "tier_4": "NT$500,001-NT$1,000,000: 1.5%",
            "tier_5": "NT$1,000,001+: 1.2%"
        },
        "rating_discounts": {
            "bronze": "5% commission discount",
            "silver": "10% commission discount",
            "gold": "15% commission discount", 
            "platinum": "20% commission discount"
        }
    }


@app.get("/admin/scheduler/status")
async def get_scheduler_status():
    """Get detailed scheduler status and job information"""
    try:
        return billing_scheduler.get_job_status()
    except Exception as e:
        logger.error("Failed to get scheduler status", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/scheduler/trigger/{job_id}")
async def trigger_job(job_id: str):
    """Manually trigger a scheduled job"""
    try:
        result = await billing_scheduler.trigger_job_manually(job_id)
        return result
    except Exception as e:
        logger.error("Failed to trigger job", job_id=job_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# Include all routers
app.include_router(billing_router)  # Legacy billing endpoints
app.include_router(rate_config_router)  # Rate configuration management
app.include_router(subscription_router)  # Subscription management
app.include_router(transaction_router)  # Transaction tracking
app.include_router(statement_router)  # Billing statements
app.include_router(payment_router)  # Payment processing
app.include_router(rating_router)  # Supplier ratings

# Include platform management routers
app.include_router(platform_dashboard_router)  # Platform dashboard analytics
app.include_router(platform_rates_router)  # Platform rate management
app.include_router(platform_suppliers_router)  # Platform supplier management

# Include webhook routers
app.include_router(order_webhook_router)  # Order webhooks for automation
app.include_router(payment_webhook_router)  # Payment gateway webhooks
