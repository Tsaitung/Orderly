"""
訂單通知客戶端

負責與 Notification Service 通信，發送訂單相關通知：
- 訂單狀態變更通知
- 新訂單通知（給供應商）
- 訂單確認通知（給餐廳）
- 配送通知
"""

import os
import httpx
import structlog
from typing import Optional, Dict, Any
from datetime import datetime

from app.models.enums import OrderStatus

logger = structlog.get_logger()


class NotificationClient:
    """訂單通知客戶端"""

    # 狀態變更通知模板
    STATUS_MESSAGES = {
        OrderStatus.SUBMITTED: {
            "supplier": "您有新訂單 #{order_number} 待確認",
            "restaurant": "訂單 #{order_number} 已提交，等待供應商確認"
        },
        OrderStatus.CONFIRMED: {
            "supplier": "訂單 #{order_number} 已確認",
            "restaurant": "好消息！訂單 #{order_number} 已被供應商確認"
        },
        OrderStatus.PREPARING: {
            "restaurant": "訂單 #{order_number} 正在備貨中"
        },
        OrderStatus.SHIPPED: {
            "restaurant": "訂單 #{order_number} 已出貨，預計今日送達"
        },
        OrderStatus.DELIVERED: {
            "restaurant": "訂單 #{order_number} 已送達，請進行驗收"
        },
        OrderStatus.ACCEPTED: {
            "supplier": "訂單 #{order_number} 已完成驗收",
            "restaurant": "訂單 #{order_number} 驗收完成"
        },
        OrderStatus.COMPLETED: {
            "supplier": "訂單 #{order_number} 已結案",
            "restaurant": "訂單 #{order_number} 已結案，感謝您的使用"
        },
        OrderStatus.CANCELLED: {
            "supplier": "訂單 #{order_number} 已取消",
            "restaurant": "訂單 #{order_number} 已取消"
        },
        OrderStatus.DISPUTED: {
            "supplier": "訂單 #{order_number} 有爭議待處理",
            "restaurant": "訂單 #{order_number} 爭議已提交，我們會盡快處理"
        }
    }

    def __init__(self):
        """初始化通知客戶端"""
        self.notification_service_url = os.getenv(
            "NOTIFICATION_SERVICE_URL",
            "http://localhost:3006"
        )
        self.timeout = float(os.getenv("NOTIFICATION_TIMEOUT", "5.0"))
        self.enabled = os.getenv("ENABLE_NOTIFICATIONS", "true").lower() == "true"

    async def notify_order_status_change(
        self,
        order_id: str,
        order_number: str,
        from_status: Optional[OrderStatus],
        to_status: OrderStatus,
        tenant_id: str,
        restaurant_id: str,
        supplier_id: str,
        changed_by: str,
        reason: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        發送訂單狀態變更通知

        Args:
            order_id: 訂單 ID
            order_number: 訂單編號
            from_status: 原狀態
            to_status: 新狀態
            tenant_id: 租戶 ID
            restaurant_id: 餐廳 ID
            supplier_id: 供應商 ID
            changed_by: 變更者 ID
            reason: 變更原因
            extra_data: 額外數據

        Returns:
            是否成功發送通知
        """
        if not self.enabled:
            logger.debug("notification.disabled", order_id=order_id)
            return True

        try:
            # 獲取狀態對應的消息模板
            messages = self.STATUS_MESSAGES.get(to_status, {})

            # 組建通知事件
            event = {
                "event_type": "order.status_changed",
                "order_id": order_id,
                "order_number": order_number,
                "from_status": from_status.value if from_status else None,
                "to_status": to_status.value,
                "tenant_id": tenant_id,
                "restaurant_id": restaurant_id,
                "supplier_id": supplier_id,
                "changed_by": changed_by,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat(),
                "messages": {
                    role: msg.format(order_number=order_number)
                    for role, msg in messages.items()
                },
                "extra_data": extra_data or {}
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.notification_service_url}/api/events",
                    json=event
                )

                if response.status_code in (200, 201, 202):
                    logger.info(
                        "notification.sent",
                        order_id=order_id,
                        to_status=to_status.value
                    )
                    return True
                else:
                    logger.warning(
                        "notification.failed",
                        order_id=order_id,
                        status_code=response.status_code,
                        response=response.text[:200]
                    )
                    return False

        except httpx.TimeoutException:
            logger.warning("notification.timeout", order_id=order_id)
            return False
        except httpx.ConnectError:
            logger.warning(
                "notification.connection_error",
                order_id=order_id,
                service_url=self.notification_service_url
            )
            return False
        except Exception as e:
            logger.error(
                "notification.error",
                order_id=order_id,
                error=str(e)
            )
            return False

    async def notify_new_order(
        self,
        order_id: str,
        order_number: str,
        tenant_id: str,
        restaurant_id: str,
        supplier_id: str,
        total_amount: float,
        delivery_date: str,
        item_count: int
    ) -> bool:
        """
        發送新訂單通知給供應商

        Args:
            order_id: 訂單 ID
            order_number: 訂單編號
            tenant_id: 租戶 ID
            restaurant_id: 餐廳 ID
            supplier_id: 供應商 ID
            total_amount: 訂單總金額
            delivery_date: 預計交貨日期
            item_count: 訂單項目數量

        Returns:
            是否成功發送通知
        """
        if not self.enabled:
            return True

        try:
            event = {
                "event_type": "order.created",
                "order_id": order_id,
                "order_number": order_number,
                "tenant_id": tenant_id,
                "restaurant_id": restaurant_id,
                "supplier_id": supplier_id,
                "total_amount": total_amount,
                "delivery_date": delivery_date,
                "item_count": item_count,
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"新訂單 #{order_number}，共 {item_count} 項商品，" \
                           f"預計 {delivery_date} 交貨"
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.notification_service_url}/api/events",
                    json=event
                )
                return response.status_code in (200, 201, 202)

        except Exception as e:
            logger.error("notification.new_order_error", order_id=order_id, error=str(e))
            return False

    async def notify_delivery_reminder(
        self,
        order_id: str,
        order_number: str,
        supplier_id: str,
        delivery_date: str,
        hours_until_delivery: int
    ) -> bool:
        """
        發送配送提醒通知

        Args:
            order_id: 訂單 ID
            order_number: 訂單編號
            supplier_id: 供應商 ID
            delivery_date: 預計交貨日期
            hours_until_delivery: 距離交貨時間（小時）

        Returns:
            是否成功發送通知
        """
        if not self.enabled:
            return True

        try:
            event = {
                "event_type": "order.delivery_reminder",
                "order_id": order_id,
                "order_number": order_number,
                "supplier_id": supplier_id,
                "delivery_date": delivery_date,
                "hours_until_delivery": hours_until_delivery,
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"提醒：訂單 #{order_number} 將於 {hours_until_delivery} 小時後交貨"
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.notification_service_url}/api/events",
                    json=event
                )
                return response.status_code in (200, 201, 202)

        except Exception as e:
            logger.error("notification.reminder_error", order_id=order_id, error=str(e))
            return False


# 全局單例
notification_client = NotificationClient()
