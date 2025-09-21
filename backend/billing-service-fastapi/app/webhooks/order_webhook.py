"""
Order service webhook endpoints for billing integration
"""
import structlog
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, Optional

from app.tasks.billing_tasks import process_order_completion_task

logger = structlog.get_logger()

router = APIRouter(prefix="/webhooks/orders", tags=["Order Webhooks"])


class OrderCompletionWebhook(BaseModel):
    """Order completion webhook payload"""
    order_id: str = Field(..., description="訂單ID")
    supplier_id: str = Field(..., description="供應商ID")
    organization_id: str = Field(..., description="組織ID")
    customer_id: Optional[str] = Field(None, description="客戶ID")
    total_amount: float = Field(..., description="訂單總金額")
    order_status: str = Field(..., description="訂單狀態")
    completion_date: str = Field(..., description="完成日期")
    product_category: Optional[str] = Field(None, description="產品類別")
    delivery_region: Optional[str] = Field(None, description="配送地區")
    payment_method: Optional[str] = Field(None, description="付款方式")
    quality_metrics: Optional[Dict[str, float]] = Field(None, description="品質指標")
    delivery_metrics: Optional[Dict[str, Any]] = Field(None, description="配送指標")
    metadata: Optional[Dict[str, Any]] = Field(None, description="額外元數據")


class OrderStatusUpdateWebhook(BaseModel):
    """Order status update webhook payload"""
    order_id: str = Field(..., description="訂單ID")
    supplier_id: str = Field(..., description="供應商ID")
    old_status: str = Field(..., description="原狀態")
    new_status: str = Field(..., description="新狀態")
    update_time: str = Field(..., description="更新時間")
    reason: Optional[str] = Field(None, description="狀態變更原因")
    metadata: Optional[Dict[str, Any]] = Field(None, description="額外元數據")


@router.post("/order-completed")
async def handle_order_completion(
    webhook_data: OrderCompletionWebhook,
    background_tasks: BackgroundTasks,
    request: Request
):
    """
    Handle order completion webhook from order service
    """
    try:
        logger.info("Received order completion webhook", 
                   order_id=webhook_data.order_id,
                   supplier_id=webhook_data.supplier_id,
                   amount=webhook_data.total_amount)
        
        # Validate webhook data
        if webhook_data.order_status not in ["completed", "delivered", "accepted"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid order status for billing: {webhook_data.order_status}"
            )
        
        if webhook_data.total_amount <= 0:
            raise HTTPException(
                status_code=400,
                detail="Order amount must be greater than 0"
            )
        
        # Prepare order data for billing processing
        order_data = {
            "order_id": webhook_data.order_id,
            "supplier_id": webhook_data.supplier_id,
            "organization_id": webhook_data.organization_id,
            "customer_id": webhook_data.customer_id,
            "total_amount": webhook_data.total_amount,
            "order_status": webhook_data.order_status,
            "completion_date": webhook_data.completion_date,
            "product_category": webhook_data.product_category,
            "delivery_region": webhook_data.delivery_region,
            "payment_method": webhook_data.payment_method,
            "quality_metrics": webhook_data.quality_metrics or {},
            "delivery_metrics": webhook_data.delivery_metrics or {},
            "metadata": webhook_data.metadata or {},
            "webhook_received_at": datetime.now().isoformat(),
            "source_ip": request.client.host if request.client else None
        }
        
        # Process billing in background
        background_tasks.add_task(process_order_completion_task, order_data)
        
        logger.info("Order completion webhook processed", 
                   order_id=webhook_data.order_id)
        
        return {
            "status": "success",
            "message": "Order completion webhook received and queued for processing",
            "order_id": webhook_data.order_id,
            "processed_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to process order completion webhook", 
                    order_id=webhook_data.order_id, error=str(e))
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process order completion webhook: {str(e)}"
        )


@router.post("/order-status-updated")
async def handle_order_status_update(
    webhook_data: OrderStatusUpdateWebhook,
    background_tasks: BackgroundTasks,
    request: Request
):
    """
    Handle order status update webhook from order service
    """
    try:
        logger.info("Received order status update webhook",
                   order_id=webhook_data.order_id,
                   old_status=webhook_data.old_status,
                   new_status=webhook_data.new_status)
        
        # Handle specific status transitions that affect billing
        if webhook_data.new_status == "cancelled" and webhook_data.old_status in ["completed", "delivered"]:
            # Handle order cancellation - may need to reverse billing
            logger.info("Order cancelled after completion - potential refund needed",
                       order_id=webhook_data.order_id)
            
            # Add task to handle cancellation billing
            cancellation_data = {
                "order_id": webhook_data.order_id,
                "supplier_id": webhook_data.supplier_id,
                "cancellation_reason": webhook_data.reason,
                "cancelled_at": webhook_data.update_time,
                "metadata": webhook_data.metadata or {}
            }
            
            # Note: This would need a separate task for handling cancellations
            # background_tasks.add_task(process_order_cancellation_task, cancellation_data)
            
        elif webhook_data.new_status == "refunded":
            # Handle order refund
            logger.info("Order refunded - processing billing refund",
                       order_id=webhook_data.order_id)
            
            refund_data = {
                "order_id": webhook_data.order_id,
                "supplier_id": webhook_data.supplier_id,
                "refund_reason": webhook_data.reason,
                "refunded_at": webhook_data.update_time,
                "metadata": webhook_data.metadata or {}
            }
            
            # Note: This would need a separate task for handling refunds
            # background_tasks.add_task(process_order_refund_task, refund_data)
        
        return {
            "status": "success",
            "message": "Order status update webhook received",
            "order_id": webhook_data.order_id,
            "status_change": f"{webhook_data.old_status} -> {webhook_data.new_status}",
            "processed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to process order status update webhook",
                    order_id=webhook_data.order_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process order status update webhook: {str(e)}"
        )


@router.post("/quality-score-updated")
async def handle_quality_score_update(
    order_id: str,
    supplier_id: str,
    quality_metrics: Dict[str, float],
    background_tasks: BackgroundTasks
):
    """
    Handle quality score update from acceptance service
    """
    try:
        logger.info("Received quality score update",
                   order_id=order_id,
                   supplier_id=supplier_id,
                   metrics=quality_metrics)
        
        # Update billing transaction with quality metrics
        quality_data = {
            "order_id": order_id,
            "supplier_id": supplier_id,
            "quality_metrics": quality_metrics,
            "updated_at": datetime.now().isoformat()
        }
        
        # Note: This would need a separate task for updating quality scores
        # background_tasks.add_task(update_transaction_quality_score_task, quality_data)
        
        return {
            "status": "success",
            "message": "Quality score update received",
            "order_id": order_id,
            "processed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to process quality score update",
                    order_id=order_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process quality score update: {str(e)}"
        )


@router.get("/health")
async def webhook_health():
    """
    Health check for webhook endpoints
    """
    return {
        "status": "healthy",
        "service": "billing-webhook-endpoints",
        "endpoints": [
            "/webhooks/orders/order-completed",
            "/webhooks/orders/order-status-updated",
            "/webhooks/orders/quality-score-updated"
        ],
        "timestamp": datetime.now().isoformat()
    }