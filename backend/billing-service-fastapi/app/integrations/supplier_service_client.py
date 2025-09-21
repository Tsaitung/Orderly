"""
Supplier Service API client for billing integration
"""
import aiohttp
import structlog
from typing import Dict, List, Any, Optional
import os
from datetime import datetime

logger = structlog.get_logger()


class SupplierServiceClient:
    """
    Client for communicating with Supplier Service
    """
    
    def __init__(self):
        self.base_url = os.getenv("SUPPLIER_SERVICE_URL", "http://localhost:3008")
        self.timeout = aiohttp.ClientTimeout(total=30)
    
    async def get_supplier_details(self, supplier_id: str) -> Optional[Dict[str, Any]]:
        """
        Get supplier details from supplier service
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers/{supplier_id}"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        supplier_data = await response.json()
                        logger.info("Supplier details retrieved", supplier_id=supplier_id)
                        return supplier_data
                    elif response.status == 404:
                        logger.warning("Supplier not found", supplier_id=supplier_id)
                        return None
                    else:
                        logger.error("Failed to get supplier details",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return None
                        
        except aiohttp.ClientError as e:
            logger.error("Supplier service communication error",
                        supplier_id=supplier_id, error=str(e))
            return None
        except Exception as e:
            logger.error("Unexpected error getting supplier details",
                        supplier_id=supplier_id, error=str(e))
            return None
    
    async def get_active_suppliers(self) -> List[Dict[str, Any]]:
        """
        Get list of all active suppliers
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers"
                params = {"status": "active"}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        suppliers = await response.json()
                        logger.info("Active suppliers retrieved", count=len(suppliers))
                        return suppliers
                    else:
                        logger.error("Failed to get active suppliers",
                                   status=response.status)
                        return []
                        
        except Exception as e:
            logger.error("Error getting active suppliers", error=str(e))
            return []
    
    async def get_suppliers_with_orders(self, period: str) -> List[Dict[str, Any]]:
        """
        Get suppliers who have orders in the specified period
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers/with-orders"
                params = {"period": period}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        suppliers = await response.json()
                        logger.info("Suppliers with orders retrieved",
                                   period=period, count=len(suppliers))
                        return suppliers
                    else:
                        logger.error("Failed to get suppliers with orders",
                                   period=period, status=response.status)
                        return []
                        
        except Exception as e:
            logger.error("Error getting suppliers with orders",
                        period=period, error=str(e))
            return []
    
    async def update_supplier_rate_tier(self, supplier_id: str, rate_tier_id: str) -> bool:
        """
        Update supplier's current rate tier
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers/{supplier_id}/rate-tier"
                data = {
                    "rate_tier_id": rate_tier_id,
                    "updated_at": datetime.now().isoformat()
                }
                
                async with session.patch(url, json=data) as response:
                    if response.status == 200:
                        logger.info("Supplier rate tier updated",
                                   supplier_id=supplier_id,
                                   rate_tier_id=rate_tier_id)
                        return True
                    else:
                        logger.error("Failed to update supplier rate tier",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return False
                        
        except Exception as e:
            logger.error("Error updating supplier rate tier",
                        supplier_id=supplier_id, error=str(e))
            return False
    
    async def update_supplier_discount_rate(self, supplier_id: str, discount_rate: float) -> bool:
        """
        Update supplier's commission discount rate based on rating
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers/{supplier_id}/discount-rate"
                data = {
                    "discount_rate": discount_rate,
                    "updated_at": datetime.now().isoformat()
                }
                
                async with session.patch(url, json=data) as response:
                    if response.status == 200:
                        logger.info("Supplier discount rate updated",
                                   supplier_id=supplier_id,
                                   discount_rate=discount_rate)
                        return True
                    else:
                        logger.error("Failed to update supplier discount rate",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return False
                        
        except Exception as e:
            logger.error("Error updating supplier discount rate",
                        supplier_id=supplier_id, error=str(e))
            return False
    
    async def get_supplier_subscription(self, supplier_id: str) -> Optional[Dict[str, Any]]:
        """
        Get supplier's current subscription plan
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers/{supplier_id}/subscription"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        subscription = await response.json()
                        logger.info("Supplier subscription retrieved",
                                   supplier_id=supplier_id)
                        return subscription
                    elif response.status == 404:
                        logger.info("No subscription found for supplier",
                                   supplier_id=supplier_id)
                        return None
                    else:
                        logger.error("Failed to get supplier subscription",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return None
                        
        except Exception as e:
            logger.error("Error getting supplier subscription",
                        supplier_id=supplier_id, error=str(e))
            return None
    
    async def update_supplier_billing_info(self, supplier_id: str, billing_info: Dict[str, Any]) -> bool:
        """
        Update supplier's billing information
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers/{supplier_id}/billing-info"
                
                async with session.patch(url, json=billing_info) as response:
                    if response.status == 200:
                        logger.info("Supplier billing info updated",
                                   supplier_id=supplier_id)
                        return True
                    else:
                        logger.error("Failed to update supplier billing info",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return False
                        
        except Exception as e:
            logger.error("Error updating supplier billing info",
                        supplier_id=supplier_id, error=str(e))
            return False
    
    async def get_supplier_payment_methods(self, supplier_id: str) -> List[Dict[str, Any]]:
        """
        Get supplier's configured payment methods
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers/{supplier_id}/payment-methods"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        payment_methods = await response.json()
                        logger.info("Supplier payment methods retrieved",
                                   supplier_id=supplier_id,
                                   count=len(payment_methods))
                        return payment_methods
                    else:
                        logger.error("Failed to get supplier payment methods",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return []
                        
        except Exception as e:
            logger.error("Error getting supplier payment methods",
                        supplier_id=supplier_id, error=str(e))
            return []
    
    async def send_supplier_notification(self, supplier_id: str, notification_type: str, data: Dict[str, Any]) -> bool:
        """
        Send notification to supplier through supplier service
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers/{supplier_id}/notifications"
                payload = {
                    "notification_type": notification_type,
                    "data": data,
                    "sent_at": datetime.now().isoformat()
                }
                
                async with session.post(url, json=payload) as response:
                    if response.status in [200, 201]:
                        logger.info("Supplier notification sent",
                                   supplier_id=supplier_id,
                                   notification_type=notification_type)
                        return True
                    else:
                        logger.error("Failed to send supplier notification",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return False
                        
        except Exception as e:
            logger.error("Error sending supplier notification",
                        supplier_id=supplier_id, error=str(e))
            return False
    
    async def get_supplier_business_metrics(self, supplier_id: str, period: str) -> Dict[str, Any]:
        """
        Get supplier's business performance metrics
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers/{supplier_id}/metrics"
                params = {"period": period}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        metrics = await response.json()
                        logger.info("Supplier business metrics retrieved",
                                   supplier_id=supplier_id, period=period)
                        return metrics
                    else:
                        logger.error("Failed to get supplier business metrics",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return self._get_default_metrics()
                        
        except Exception as e:
            logger.error("Error getting supplier business metrics",
                        supplier_id=supplier_id, error=str(e))
            return self._get_default_metrics()
    
    async def update_supplier_status(self, supplier_id: str, status: str, reason: str = None) -> bool:
        """
        Update supplier's status (active, suspended, etc.)
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/suppliers/{supplier_id}/status"
                data = {
                    "status": status,
                    "reason": reason,
                    "updated_at": datetime.now().isoformat()
                }
                
                async with session.patch(url, json=data) as response:
                    if response.status == 200:
                        logger.info("Supplier status updated",
                                   supplier_id=supplier_id,
                                   status=status)
                        return True
                    else:
                        logger.error("Failed to update supplier status",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return False
                        
        except Exception as e:
            logger.error("Error updating supplier status",
                        supplier_id=supplier_id, error=str(e))
            return False
    
    def _get_default_metrics(self) -> Dict[str, Any]:
        """Default metrics when service is unavailable"""
        return {
            "total_orders": 0,
            "total_revenue": 0.0,
            "average_order_value": 0.0,
            "customer_count": 0,
            "product_count": 0,
            "rating": 3.0
        }
    
    async def health_check(self) -> bool:
        """
        Check if supplier service is healthy
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/health"
                
                async with session.get(url) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error("Supplier service health check failed", error=str(e))
            return False