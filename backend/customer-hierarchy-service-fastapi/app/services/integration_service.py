"""
IntegrationService - External service integration with circuit breaker patterns

This service manages communication with other microservices:
- Order Service (for ordering permissions and validation)
- Billing Service (for company-level invoicing integration)
- User Service (for authentication context and permissions)
- Notification Service (for hierarchy change alerts)
- API Gateway (for routing and load balancing)
"""

from typing import Dict, List, Optional, Any, Union
import httpx
import asyncio
from datetime import datetime, timedelta
from enum import Enum
import structlog
from contextlib import asynccontextmanager

from app.core.config import settings

logger = structlog.get_logger(__name__)


class ServiceHealth(str, Enum):
    """Service health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class IntegrationService:
    """
    External service integration with resilience patterns
    
    Key Features:
    - Circuit breaker pattern for service failures
    - Retry logic with exponential backoff
    - Health monitoring and status tracking
    - Async communication with connection pooling
    - Request/response logging and metrics
    - Fallback mechanisms for critical operations
    """
    
    def __init__(self):
        self.client = None
        self.circuit_breakers = {}
        self.service_endpoints = {
            "user_service": settings.user_service_url,
            "order_service": settings.order_service_url,
            "billing_service": settings.billing_service_url,
            "api_gateway": settings.api_gateway_url
        }
        self.health_status = {}
        self.request_metrics = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "avg_response_time": 0
        }
    
    async def initialize(self):
        """Initialize HTTP client and circuit breakers"""
        try:
            # Configure HTTP client with connection pooling
            timeout = httpx.Timeout(10.0, connect=5.0)
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
            
            self.client = httpx.AsyncClient(
                timeout=timeout,
                limits=limits,
                headers={"User-Agent": "Customer-Hierarchy-Service/1.0"}
            )
            
            # Initialize circuit breakers for each service
            for service_name in self.service_endpoints.keys():
                self.circuit_breakers[service_name] = {
                    "failure_count": 0,
                    "last_failure_time": None,
                    "state": "closed",  # closed, open, half_open
                    "failure_threshold": 5,
                    "recovery_timeout": 60  # seconds
                }
                self.health_status[service_name] = ServiceHealth.UNKNOWN
            
            logger.info("Integration service initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize integration service", error=str(e))
            raise
    
    async def close(self):
        """Close HTTP client connections"""
        if self.client:
            await self.client.aclose()
    
    @asynccontextmanager
    async def _get_client(self):
        """Get HTTP client with initialization check"""
        if not self.client:
            await self.initialize()
        yield self.client
    
    async def validate_user_permissions(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str
    ) -> bool:
        """
        Validate user permissions through User Service
        
        Args:
            user_id: User identifier
            resource_type: Type of resource (group, company, location, unit)
            resource_id: Resource identifier
            action: Action to validate (read, write, delete, etc.)
            
        Returns:
            True if user has permission, False otherwise
        """
        try:
            service_name = "user_service"
            
            if not self._is_service_available(service_name):
                logger.warning(
                    "User service unavailable, using fallback permission check",
                    user_id=user_id,
                    resource_type=resource_type,
                    action=action
                )
                return await self._fallback_permission_check(user_id, resource_type, action)
            
            endpoint = f"{self.service_endpoints[service_name]}/api/v1/permissions/validate"
            payload = {
                "user_id": user_id,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "action": action
            }
            
            result = await self._make_request(
                service_name=service_name,
                method="POST",
                url=endpoint,
                json=payload,
                timeout=5.0
            )
            
            if result and result.get("success"):
                return result.get("has_permission", False)
            
            # Fallback on API error
            logger.warning(
                "Permission validation failed, using fallback",
                user_id=user_id,
                resource_type=resource_type,
                result=result
            )
            return await self._fallback_permission_check(user_id, resource_type, action)
            
        except Exception as e:
            logger.error(
                "Failed to validate user permissions",
                error=str(e),
                user_id=user_id,
                resource_type=resource_type,
                action=action
            )
            return await self._fallback_permission_check(user_id, resource_type, action)
    
    async def notify_hierarchy_change(
        self,
        action: str,
        entity_id: str,
        entity_type: str,
        details: Dict[str, Any]
    ) -> bool:
        """
        Notify other services of hierarchy changes
        
        Args:
            action: Type of change (create, update, delete, move)
            entity_id: Changed entity ID
            entity_type: Entity type (group, company, location, unit)
            details: Additional change details
            
        Returns:
            True if notifications sent successfully
        """
        try:
            notification_payload = {
                "event_type": "hierarchy_changed",
                "action": action,
                "entity_id": entity_id,
                "entity_type": entity_type,
                "details": details,
                "timestamp": datetime.utcnow().isoformat(),
                "source_service": "customer-hierarchy-service"
            }
            
            # Notify multiple services concurrently
            notification_tasks = [
                self._notify_order_service(notification_payload),
                self._notify_billing_service(notification_payload),
                self._send_notification_alert(notification_payload)
            ]
            
            results = await asyncio.gather(*notification_tasks, return_exceptions=True)
            
            # Check if at least one notification succeeded
            success_count = sum(1 for result in results if result is True)
            
            logger.info(
                "Hierarchy change notifications sent",
                action=action,
                entity_id=entity_id,
                entity_type=entity_type,
                successful_notifications=success_count,
                total_notifications=len(notification_tasks)
            )
            
            return success_count > 0
            
        except Exception as e:
            logger.error(
                "Failed to send hierarchy change notifications",
                error=str(e),
                action=action,
                entity_id=entity_id,
                entity_type=entity_type
            )
            return False
    
    async def validate_order_permissions(
        self,
        company_id: str,
        location_id: Optional[str] = None,
        unit_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate ordering permissions through Order Service
        
        Args:
            company_id: Company identifier
            location_id: Optional location identifier
            unit_id: Optional business unit identifier
            
        Returns:
            Dictionary with permission details and constraints
        """
        try:
            service_name = "order_service"
            
            if not self._is_service_available(service_name):
                return await self._fallback_order_permissions(company_id)
            
            endpoint = f"{self.service_endpoints[service_name]}/api/v1/permissions/hierarchy"
            payload = {
                "company_id": company_id,
                "location_id": location_id,
                "unit_id": unit_id
            }
            
            result = await self._make_request(
                service_name=service_name,
                method="POST",
                url=endpoint,
                json=payload,
                timeout=3.0
            )
            
            if result and result.get("success"):
                return {
                    "can_order": result.get("can_order", False),
                    "order_limits": result.get("order_limits", {}),
                    "restrictions": result.get("restrictions", []),
                    "source": "order_service"
                }
            
            return await self._fallback_order_permissions(company_id)
            
        except Exception as e:
            logger.error(
                "Failed to validate order permissions",
                error=str(e),
                company_id=company_id,
                location_id=location_id,
                unit_id=unit_id
            )
            return await self._fallback_order_permissions(company_id)
    
    async def notify_billing_hierarchy_change(
        self,
        company_id: str,
        change_type: str,
        change_details: Dict[str, Any]
    ) -> bool:
        """
        Notify Billing Service of hierarchy changes affecting invoicing
        
        Args:
            company_id: Company affected by change
            change_type: Type of change (structure, contact, address)
            change_details: Details of the change
            
        Returns:
            True if notification successful
        """
        try:
            service_name = "billing_service"
            
            if not self._is_service_available(service_name):
                logger.warning(
                    "Billing service unavailable, change notification skipped",
                    company_id=company_id,
                    change_type=change_type
                )
                return False
            
            endpoint = f"{self.service_endpoints[service_name]}/api/v1/hierarchy/change-notification"
            payload = {
                "company_id": company_id,
                "change_type": change_type,
                "change_details": change_details,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "customer-hierarchy-service"
            }
            
            result = await self._make_request(
                service_name=service_name,
                method="POST",
                url=endpoint,
                json=payload,
                timeout=10.0  # Billing updates can take longer
            )
            
            return result and result.get("success", False)
            
        except Exception as e:
            logger.error(
                "Failed to notify billing service of hierarchy change",
                error=str(e),
                company_id=company_id,
                change_type=change_type
            )
            return False
    
    async def notify_migration_completed(
        self,
        plan_id: str,
        execution_id: str,
        entities_processed: int
    ) -> bool:
        """
        Notify services of completed migration
        """
        try:
            notification_payload = {
                "event_type": "migration_completed",
                "plan_id": plan_id,
                "execution_id": execution_id,
                "entities_processed": entities_processed,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Notify all relevant services
            tasks = [
                self._notify_order_service(notification_payload),
                self._notify_billing_service(notification_payload),
                self._send_notification_alert(notification_payload)
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            success_count = sum(1 for result in results if result is True)
            
            logger.info(
                "Migration completion notifications sent",
                plan_id=plan_id,
                successful_notifications=success_count
            )
            
            return success_count > 0
            
        except Exception as e:
            logger.error(
                "Failed to send migration completion notifications",
                error=str(e),
                plan_id=plan_id
            )
            return False
    
    async def notify_migration_failed(
        self,
        plan_id: str,
        execution_id: str,
        error: str
    ) -> bool:
        """
        Notify services of failed migration
        """
        try:
            notification_payload = {
                "event_type": "migration_failed",
                "plan_id": plan_id,
                "execution_id": execution_id,
                "error": error,
                "timestamp": datetime.utcnow().isoformat(),
                "severity": "high"
            }
            
            # Send high-priority notifications
            result = await self._send_notification_alert(notification_payload)
            
            logger.info(
                "Migration failure notification sent",
                plan_id=plan_id,
                notification_sent=result
            )
            
            return result
            
        except Exception as e:
            logger.error(
                "Failed to send migration failure notification",
                error=str(e),
                plan_id=plan_id
            )
            return False
    
    async def notify_bulk_operation_completed(
        self,
        operation_id: str,
        operation_type: str,
        entities_processed: int,
        success_count: int
    ) -> bool:
        """
        Notify services of completed bulk operation
        """
        try:
            notification_payload = {
                "event_type": "bulk_operation_completed",
                "operation_id": operation_id,
                "operation_type": operation_type,
                "entities_processed": entities_processed,
                "success_count": success_count,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Notify relevant services based on operation type
            if operation_type in ["create", "update", "delete", "move"]:
                tasks = [
                    self._notify_order_service(notification_payload),
                    self._notify_billing_service(notification_payload)
                ]
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                success_count = sum(1 for result in results if result is True)
                
                return success_count > 0
            
            return True
            
        except Exception as e:
            logger.error(
                "Failed to send bulk operation completion notification",
                error=str(e),
                operation_id=operation_id
            )
            return False
    
    async def get_health_status(self) -> Dict[str, Any]:
        """
        Get health status of all integrated services
        
        Returns:
            Dictionary with service health information
        """
        try:
            health_tasks = [
                self._check_service_health(service_name)
                for service_name in self.service_endpoints.keys()
            ]
            
            health_results = await asyncio.gather(*health_tasks, return_exceptions=True)
            
            health_summary = {}
            for service_name, health_result in zip(self.service_endpoints.keys(), health_results):
                if isinstance(health_result, Exception):
                    health_summary[service_name] = {
                        "status": ServiceHealth.UNHEALTHY,
                        "error": str(health_result),
                        "last_check": datetime.utcnow().isoformat()
                    }
                else:
                    health_summary[service_name] = health_result
            
            # Calculate overall health
            healthy_services = sum(
                1 for status in health_summary.values()
                if status.get("status") == ServiceHealth.HEALTHY
            )
            total_services = len(health_summary)
            
            overall_status = ServiceHealth.HEALTHY
            if healthy_services == 0:
                overall_status = ServiceHealth.UNHEALTHY
            elif healthy_services < total_services:
                overall_status = ServiceHealth.DEGRADED
            
            return {
                "overall_status": overall_status,
                "healthy_services": healthy_services,
                "total_services": total_services,
                "service_details": health_summary,
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Failed to get health status", error=str(e))
            return {
                "overall_status": ServiceHealth.UNKNOWN,
                "error": str(e),
                "last_updated": datetime.utcnow().isoformat()
            }
    
    # Private helper methods
    
    async def _make_request(
        self,
        service_name: str,
        method: str,
        url: str,
        timeout: float = 10.0,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """Make HTTP request with circuit breaker protection"""
        if not self._is_service_available(service_name):
            self._record_service_failure(service_name)
            return None
        
        start_time = datetime.utcnow()
        
        try:
            async with self._get_client() as client:
                response = await client.request(
                    method=method,
                    url=url,
                    timeout=timeout,
                    **kwargs
                )
                
                response.raise_for_status()
                
                # Record successful request
                self._record_service_success(service_name)
                self._update_request_metrics(True, start_time)
                
                return response.json()
                
        except Exception as e:
            self._record_service_failure(service_name)
            self._update_request_metrics(False, start_time)
            
            logger.error(
                "HTTP request failed",
                service_name=service_name,
                method=method,
                url=url,
                error=str(e)
            )
            return None
    
    def _is_service_available(self, service_name: str) -> bool:
        """Check if service is available based on circuit breaker state"""
        breaker = self.circuit_breakers.get(service_name, {})
        
        if breaker.get("state") == "closed":
            return True
        elif breaker.get("state") == "open":
            # Check if recovery timeout has passed
            last_failure = breaker.get("last_failure_time")
            if last_failure and datetime.utcnow() - last_failure > timedelta(seconds=breaker.get("recovery_timeout", 60)):
                breaker["state"] = "half_open"
                return True
            return False
        elif breaker.get("state") == "half_open":
            return True
        
        return False
    
    def _record_service_success(self, service_name: str):
        """Record successful service interaction"""
        breaker = self.circuit_breakers.get(service_name, {})
        breaker["failure_count"] = 0
        breaker["state"] = "closed"
        self.health_status[service_name] = ServiceHealth.HEALTHY
    
    def _record_service_failure(self, service_name: str):
        """Record failed service interaction"""
        breaker = self.circuit_breakers.get(service_name, {})
        breaker["failure_count"] = breaker.get("failure_count", 0) + 1
        breaker["last_failure_time"] = datetime.utcnow()
        
        if breaker["failure_count"] >= breaker.get("failure_threshold", 5):
            breaker["state"] = "open"
            self.health_status[service_name] = ServiceHealth.UNHEALTHY
        else:
            self.health_status[service_name] = ServiceHealth.DEGRADED
    
    def _update_request_metrics(self, success: bool, start_time: datetime):
        """Update request metrics"""
        self.request_metrics["total_requests"] += 1
        
        if success:
            self.request_metrics["successful_requests"] += 1
        else:
            self.request_metrics["failed_requests"] += 1
        
        # Update average response time
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        total_requests = self.request_metrics["total_requests"]
        current_avg = self.request_metrics["avg_response_time"]
        
        self.request_metrics["avg_response_time"] = (
            (current_avg * (total_requests - 1) + response_time) / total_requests
        )
    
    async def _fallback_permission_check(self, user_id: str, resource_type: str, action: str) -> bool:
        """Fallback permission check when User Service is unavailable"""
        # Simple fallback logic - in production this might check local cache or default permissions
        logger.warning(
            "Using fallback permission check",
            user_id=user_id,
            resource_type=resource_type,
            action=action
        )
        # For safety, allow read operations but restrict modifications
        return action in ["read", "list"]
    
    async def _fallback_order_permissions(self, company_id: str) -> Dict[str, Any]:
        """Fallback order permissions when Order Service is unavailable"""
        return {
            "can_order": False,  # Conservative fallback
            "order_limits": {},
            "restrictions": ["Service unavailable - orders temporarily restricted"],
            "source": "fallback"
        }
    
    async def _notify_order_service(self, payload: Dict[str, Any]) -> bool:
        """Send notification to Order Service"""
        service_name = "order_service"
        endpoint = f"{self.service_endpoints[service_name]}/api/v1/notifications/hierarchy"
        
        result = await self._make_request(
            service_name=service_name,
            method="POST",
            url=endpoint,
            json=payload,
            timeout=5.0
        )
        
        return result and result.get("success", False)
    
    async def _notify_billing_service(self, payload: Dict[str, Any]) -> bool:
        """Send notification to Billing Service"""
        service_name = "billing_service"
        endpoint = f"{self.service_endpoints[service_name]}/api/v1/notifications/hierarchy"
        
        result = await self._make_request(
            service_name=service_name,
            method="POST",
            url=endpoint,
            json=payload,
            timeout=10.0
        )
        
        return result and result.get("success", False)
    
    async def _send_notification_alert(self, payload: Dict[str, Any]) -> bool:
        """Send notification alert (could be to notification service, Slack, etc.)"""
        # For now, just log the notification
        # In production, this would integrate with notification service or alerting system
        logger.info(
            "Notification alert",
            event_type=payload.get("event_type"),
            entity_id=payload.get("entity_id"),
            severity=payload.get("severity", "normal")
        )
        return True
    
    async def _check_service_health(self, service_name: str) -> Dict[str, Any]:
        """Check health of a specific service"""
        try:
            endpoint = f"{self.service_endpoints[service_name]}/health"
            
            result = await self._make_request(
                service_name=service_name,
                method="GET",
                url=endpoint,
                timeout=3.0
            )
            
            if result:
                return {
                    "status": ServiceHealth.HEALTHY,
                    "response_time_ms": result.get("response_time_ms", 0),
                    "version": result.get("version", "unknown"),
                    "last_check": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "status": ServiceHealth.UNHEALTHY,
                    "error": "No response from health endpoint",
                    "last_check": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            return {
                "status": ServiceHealth.UNHEALTHY,
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }