"""
Payment gateway webhook endpoints
"""
import structlog
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, Optional

from app.integrations.payment_gateway import PaymentGateway
from app.services.payment_service import PaymentService

logger = structlog.get_logger()

router = APIRouter(prefix="/webhooks/payments", tags=["Payment Webhooks"])


class ECPayCallback(BaseModel):
    """ECPay payment callback payload"""
    MerchantID: str = Field(..., description="商店代號")
    MerchantTradeNo: str = Field(..., description="商店交易編號")
    StoreID: Optional[str] = Field(None, description="商店代號")
    RtnCode: int = Field(..., description="回傳狀態")
    RtnMsg: str = Field(..., description="回傳訊息")
    TradeNo: str = Field(..., description="綠界交易編號")
    TradeAmt: int = Field(..., description="交易金額")
    PaymentDate: str = Field(..., description="付款時間")
    PaymentType: str = Field(..., description="付款方式")
    PaymentTypeChargeFee: Optional[str] = Field(None, description="付款方式費用")
    TradeDate: str = Field(..., description="交易時間")
    SimulatePaid: Optional[int] = Field(None, description="模擬付款")
    CheckMacValue: str = Field(..., description="檢查碼")


class NewebPayCallback(BaseModel):
    """NewebPay payment callback payload"""
    Status: str = Field(..., description="回傳狀態")
    MerchantID: str = Field(..., description="商店代號")
    Version: str = Field(..., description="版本")
    TradeInfo: str = Field(..., description="交易資料")
    TradeSha: str = Field(..., description="交易資料SHA加密")


@router.post("/ecpay/callback")
async def handle_ecpay_callback(
    callback_data: ECPayCallback,
    background_tasks: BackgroundTasks,
    request: Request
):
    """
    Handle ECPay payment callback
    """
    try:
        logger.info("Received ECPay payment callback",
                   merchant_trade_no=callback_data.MerchantTradeNo,
                   trade_no=callback_data.TradeNo,
                   return_code=callback_data.RtnCode)
        
        # Initialize payment gateway
        payment_gateway = PaymentGateway()
        
        # Verify callback authenticity
        callback_dict = callback_data.dict()
        verification_result = payment_gateway.verify_payment_callback(callback_dict, "ecpay")
        
        if not verification_result.get("valid", False):
            logger.error("ECPay callback verification failed",
                        merchant_trade_no=callback_data.MerchantTradeNo)
            raise HTTPException(status_code=400, detail="Invalid callback signature")
        
        # Process payment result
        payment_service = PaymentService()
        
        if callback_data.RtnCode == 1:  # Payment successful
            await payment_service.handle_payment_success(
                transaction_id=callback_data.MerchantTradeNo,
                gateway_transaction_id=callback_data.TradeNo,
                amount=float(callback_data.TradeAmt),
                payment_date=callback_data.PaymentDate,
                gateway="ecpay",
                gateway_data=callback_dict
            )
            
            logger.info("ECPay payment processed successfully",
                       merchant_trade_no=callback_data.MerchantTradeNo)
            
        else:  # Payment failed
            await payment_service.handle_payment_failure(
                transaction_id=callback_data.MerchantTradeNo,
                error_code=str(callback_data.RtnCode),
                error_message=callback_data.RtnMsg,
                gateway="ecpay",
                gateway_data=callback_dict
            )
            
            logger.warning("ECPay payment failed",
                          merchant_trade_no=callback_data.MerchantTradeNo,
                          error=callback_data.RtnMsg)
        
        # ECPay expects "1|OK" response for successful processing
        return "1|OK"
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to process ECPay callback",
                    merchant_trade_no=callback_data.MerchantTradeNo,
                    error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/newebpay/callback")
async def handle_newebpay_callback(
    callback_data: NewebPayCallback,
    background_tasks: BackgroundTasks,
    request: Request
):
    """
    Handle NewebPay payment callback
    """
    try:
        logger.info("Received NewebPay payment callback",
                   status=callback_data.Status,
                   merchant_id=callback_data.MerchantID)
        
        # Initialize payment gateway
        payment_gateway = PaymentGateway()
        
        # Verify callback authenticity
        callback_dict = callback_data.dict()
        verification_result = payment_gateway.verify_payment_callback(callback_dict, "newebpay")
        
        if not verification_result.get("valid", False):
            logger.error("NewebPay callback verification failed",
                        merchant_id=callback_data.MerchantID)
            raise HTTPException(status_code=400, detail="Invalid callback signature")
        
        # Process payment result
        payment_service = PaymentService()
        
        if callback_data.Status == "SUCCESS":  # Payment successful
            await payment_service.handle_payment_success(
                transaction_id=verification_result.get("transaction_id"),
                gateway_transaction_id=verification_result.get("trade_no"),
                amount=float(verification_result.get("amount", 0)),
                payment_date=datetime.now().isoformat(),
                gateway="newebpay",
                gateway_data=callback_dict
            )
            
            logger.info("NewebPay payment processed successfully",
                       transaction_id=verification_result.get("transaction_id"))
            
        else:  # Payment failed
            await payment_service.handle_payment_failure(
                transaction_id=verification_result.get("transaction_id"),
                error_code=callback_data.Status,
                error_message=verification_result.get("message", "Payment failed"),
                gateway="newebpay",
                gateway_data=callback_dict
            )
            
            logger.warning("NewebPay payment failed",
                          transaction_id=verification_result.get("transaction_id"),
                          status=callback_data.Status)
        
        # NewebPay expects success response
        return {"Status": "SUCCESS"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to process NewebPay callback",
                    error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/manual-verification")
async def manual_payment_verification(
    transaction_id: str,
    gateway: str,
    background_tasks: BackgroundTasks
):
    """
    Manually verify payment status from gateway
    """
    try:
        logger.info("Manual payment verification requested",
                   transaction_id=transaction_id,
                   gateway=gateway)
        
        # Initialize payment gateway
        payment_gateway = PaymentGateway()
        
        # Query payment status from gateway
        status_result = await payment_gateway.query_payment_status(transaction_id, gateway)
        
        if status_result.get("status") == "success":
            # Process the verification result
            payment_service = PaymentService()
            
            # This would need to parse the gateway response and update payment status
            logger.info("Manual payment verification completed",
                       transaction_id=transaction_id,
                       result=status_result)
            
            return {
                "status": "success",
                "transaction_id": transaction_id,
                "gateway": gateway,
                "verification_result": status_result,
                "verified_at": datetime.now().isoformat()
            }
        else:
            return {
                "status": "failed",
                "transaction_id": transaction_id,
                "gateway": gateway,
                "error": status_result.get("error"),
                "verified_at": datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.error("Manual payment verification failed",
                    transaction_id=transaction_id,
                    error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payment-status/{transaction_id}")
async def get_payment_status(transaction_id: str):
    """
    Get payment status for a transaction
    """
    try:
        payment_service = PaymentService()
        
        # This would query the payment record from database
        # payment_record = await payment_service.get_payment_record(transaction_id)
        
        return {
            "transaction_id": transaction_id,
            "status": "pending",  # This would come from the actual record
            "message": "Payment status retrieved",
            "queried_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get payment status",
                    transaction_id=transaction_id,
                    error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def payment_webhook_health():
    """
    Health check for payment webhook endpoints
    """
    try:
        payment_gateway = PaymentGateway()
        gateway_health = await payment_gateway.health_check()
        
        return {
            "status": "healthy",
            "service": "payment-webhook-endpoints",
            "gateways": gateway_health,
            "endpoints": [
                "/webhooks/payments/ecpay/callback",
                "/webhooks/payments/newebpay/callback",
                "/webhooks/payments/manual-verification",
                "/webhooks/payments/payment-status/{transaction_id}"
            ],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error("Payment webhook health check failed", error=str(e))
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }