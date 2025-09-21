"""
Order Service API client for billing integration
"""
import aiohttp
import structlog
from typing import Dict, List, Any, Optional
import os
from datetime import datetime

logger = structlog.get_logger()


class OrderServiceClient:
    """
    Client for communicating with Order Service
    """
    
    def __init__(self):
        self.base_url = os.getenv("ORDER_SERVICE_URL", "http://localhost:3002")
        self.timeout = aiohttp.ClientTimeout(total=30)
    
    async def get_order_details(self, order_id: str) -> Optional[Dict[str, Any]]:
        """
        Get order details from order service
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/orders/{order_id}"
                
                async with session.get(url) as response:
                    if response.status == 200:
                        order_data = await response.json()
                        logger.info("Order details retrieved", order_id=order_id)
                        return order_data
                    elif response.status == 404:
                        logger.warning("Order not found", order_id=order_id)
                        return None
                    else:
                        logger.error("Failed to get order details", 
                                   order_id=order_id, 
                                   status=response.status)
                        return None
                        
        except aiohttp.ClientError as e:
            logger.error("Order service communication error", 
                        order_id=order_id, error=str(e))
            return None
        except Exception as e:
            logger.error("Unexpected error getting order details", 
                        order_id=order_id, error=str(e))
            return None
    
    async def get_supplier_order_stats(self, supplier_id: str, period: str) -> Dict[str, Any]:
        """
        Get supplier order statistics for a specific period
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/orders/suppliers/{supplier_id}/stats"
                params = {"period": period}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        stats = await response.json()
                        logger.info("Supplier order stats retrieved", 
                                   supplier_id=supplier_id, period=period)
                        return stats
                    else:
                        logger.error("Failed to get supplier order stats",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return self._get_default_order_stats()
                        
        except Exception as e:
            logger.error("Error getting supplier order stats",
                        supplier_id=supplier_id, error=str(e))
            return self._get_default_order_stats()
    
    async def get_supplier_delivery_stats(self, supplier_id: str, period: str) -> Dict[str, Any]:
        """
        Get supplier delivery performance statistics
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/deliveries/suppliers/{supplier_id}/stats"
                params = {"period": period}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        stats = await response.json()
                        logger.info("Supplier delivery stats retrieved",
                                   supplier_id=supplier_id, period=period)
                        return stats
                    else:
                        logger.error("Failed to get supplier delivery stats",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return self._get_default_delivery_stats()
                        
        except Exception as e:
            logger.error("Error getting supplier delivery stats",
                        supplier_id=supplier_id, error=str(e))
            return self._get_default_delivery_stats()
    
    async def get_supplier_satisfaction_stats(self, supplier_id: str, period: str) -> Dict[str, Any]:
        """
        Get supplier customer satisfaction statistics
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/orders/suppliers/{supplier_id}/satisfaction"
                params = {"period": period}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        stats = await response.json()
                        logger.info("Supplier satisfaction stats retrieved",
                                   supplier_id=supplier_id, period=period)
                        return stats
                    else:
                        logger.error("Failed to get supplier satisfaction stats",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return {"average_rating": 3.0, "total_reviews": 0}
                        
        except Exception as e:
            logger.error("Error getting supplier satisfaction stats",
                        supplier_id=supplier_id, error=str(e))
            return {"average_rating": 3.0, "total_reviews": 0}
    
    async def get_supplier_response_stats(self, supplier_id: str, period: str) -> Dict[str, Any]:
        """
        Get supplier response time statistics
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/orders/suppliers/{supplier_id}/response-times"
                params = {"period": period}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        stats = await response.json()
                        logger.info("Supplier response stats retrieved",
                                   supplier_id=supplier_id, period=period)
                        return stats
                    else:
                        logger.error("Failed to get supplier response stats",
                                   supplier_id=supplier_id,
                                   status=response.status)
                        return {"average_response_time": 60, "total_orders": 0}
                        
        except Exception as e:
            logger.error("Error getting supplier response stats",
                        supplier_id=supplier_id, error=str(e))
            return {"average_response_time": 60, "total_orders": 0}
    
    async def get_orders_by_status(self, status: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get orders by status for processing
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/orders"
                params = {"status": status, "limit": limit}
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        orders = await response.json()
                        logger.info("Orders retrieved by status", 
                                   status=status, count=len(orders))
                        return orders
                    else:
                        logger.error("Failed to get orders by status",
                                   status=status, http_status=response.status)
                        return []
                        
        except Exception as e:
            logger.error("Error getting orders by status",
                        status=status, error=str(e))
            return []
    
    async def update_order_billing_status(self, order_id: str, billing_status: str, transaction_id: str = None) -> bool:
        """
        Update order's billing status
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/orders/{order_id}/billing-status"
                data = {
                    "billing_status": billing_status,
                    "transaction_id": transaction_id,
                    "updated_at": datetime.now().isoformat()
                }
                
                async with session.patch(url, json=data) as response:
                    if response.status == 200:
                        logger.info("Order billing status updated",
                                   order_id=order_id, 
                                   billing_status=billing_status)
                        return True
                    else:
                        logger.error("Failed to update order billing status",
                                   order_id=order_id,
                                   status=response.status)
                        return False
                        
        except Exception as e:
            logger.error("Error updating order billing status",
                        order_id=order_id, error=str(e))
            return False
    
    async def send_billing_notification(self, order_id: str, supplier_id: str, notification_type: str, data: Dict[str, Any]) -> bool:
        """
        Send billing-related notification through order service
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/api/notifications/billing"
                payload = {
                    "order_id": order_id,
                    "supplier_id": supplier_id,
                    "notification_type": notification_type,
                    "data": data,
                    "sent_at": datetime.now().isoformat()
                }
                
                async with session.post(url, json=payload) as response:
                    if response.status in [200, 201]:
                        logger.info("Billing notification sent",
                                   order_id=order_id,
                                   notification_type=notification_type)
                        return True
                    else:
                        logger.error("Failed to send billing notification",
                                   order_id=order_id,
                                   status=response.status)
                        return False
                        
        except Exception as e:
            logger.error("Error sending billing notification",
                        order_id=order_id, error=str(e))
            return False
    
    # Helper methods for default values
    
    def _get_default_order_stats(self) -> Dict[str, Any]:
        """Default order statistics when service is unavailable"""
        return {
            "total_orders": 0,
            "fulfilled_orders": 0,
            "cancelled_orders": 0,
            "pending_orders": 0,
            "fulfillment_rate": 0.0
        }
    
    def _get_default_delivery_stats(self) -> Dict[str, Any]:
        """Default delivery statistics when service is unavailable"""
        return {
            "total_deliveries": 0,
            "on_time_deliveries": 0,
            "late_deliveries": 0,
            "on_time_rate": 0.0,
            "average_delay_minutes": 0
        }
    
    async def health_check(self) -> bool:
        """
        Check if order service is healthy
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                url = f"{self.base_url}/health"
                
                async with session.get(url) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error("Order service health check failed", error=str(e))
            return False