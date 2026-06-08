"""
Order State Machine
訂單狀態機 - 管理訂單狀態流轉規則
"""
from typing import Optional, Set, Dict
from app.modules.orders.models.enums import OrderStatus


class OrderStateMachine:
    """
    訂單狀態機

    定義合法的狀態轉換規則，確保訂單狀態流轉的正確性
    """

    # 狀態轉換規則表：from_status -> set of valid to_statuses
    TRANSITIONS: Dict[OrderStatus, Set[OrderStatus]] = {
        OrderStatus.DRAFT: {
            OrderStatus.SUBMITTED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.SUBMITTED: {
            OrderStatus.CONFIRMED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.CONFIRMED: {
            OrderStatus.PREPARING,
            OrderStatus.CANCELLED,
        },
        OrderStatus.PREPARING: {
            OrderStatus.SHIPPED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.SHIPPED: {
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.DELIVERED: {
            OrderStatus.ACCEPTED,
            OrderStatus.DISPUTED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.DISPUTED: {
            OrderStatus.ACCEPTED,  # 爭議解決後可接受
            OrderStatus.CANCELLED,
        },
        OrderStatus.ACCEPTED: {
            OrderStatus.COMPLETED,
            OrderStatus.CANCELLED,
        },
        OrderStatus.COMPLETED: set(),  # 完成後不可變更
        OrderStatus.CANCELLED: set(),  # 取消後不可變更
    }

    # 角色對應可執行的狀態轉換
    ROLE_TRANSITIONS: Dict[str, Set[tuple]] = {
        "restaurant": {
            (OrderStatus.DRAFT, OrderStatus.SUBMITTED),
            (OrderStatus.DRAFT, OrderStatus.CANCELLED),
            (OrderStatus.SUBMITTED, OrderStatus.CANCELLED),
            (OrderStatus.DELIVERED, OrderStatus.ACCEPTED),
            (OrderStatus.DELIVERED, OrderStatus.DISPUTED),
        },
        "supplier": {
            (OrderStatus.SUBMITTED, OrderStatus.CONFIRMED),
            (OrderStatus.SUBMITTED, OrderStatus.CANCELLED),
            (OrderStatus.CONFIRMED, OrderStatus.PREPARING),
            (OrderStatus.PREPARING, OrderStatus.SHIPPED),
            (OrderStatus.SHIPPED, OrderStatus.DELIVERED),
        },
        "admin": {
            # Admin 可以執行所有合法轉換
            (from_status, to_status)
            for from_status, to_statuses in TRANSITIONS.items()
            for to_status in to_statuses
        },
    }

    @classmethod
    def is_valid_transition(
        cls,
        from_status: OrderStatus,
        to_status: OrderStatus
    ) -> bool:
        """
        檢查狀態轉換是否合法

        Args:
            from_status: 當前狀態
            to_status: 目標狀態

        Returns:
            bool: 轉換是否合法
        """
        valid_targets = cls.TRANSITIONS.get(from_status, set())
        return to_status in valid_targets

    @classmethod
    def can_transition(
        cls,
        from_status: OrderStatus,
        to_status: OrderStatus,
        role: Optional[str] = None
    ) -> tuple[bool, Optional[str]]:
        """
        檢查是否可以執行狀態轉換（含角色檢查）

        Args:
            from_status: 當前狀態
            to_status: 目標狀態
            role: 執行者角色（可選）

        Returns:
            tuple: (是否允許, 錯誤訊息或 None)
        """
        # 檢查基本轉換合法性
        if not cls.is_valid_transition(from_status, to_status):
            return False, f"無法從 '{from_status.value}' 轉換到 '{to_status.value}'"

        # 如果提供了角色，檢查角色權限
        if role and role != "admin":
            allowed_transitions = cls.ROLE_TRANSITIONS.get(role, set())
            if (from_status, to_status) not in allowed_transitions:
                return False, f"角色 '{role}' 無權執行此狀態轉換"

        return True, None

    @classmethod
    def get_next_valid_statuses(
        cls,
        current_status: OrderStatus,
        role: Optional[str] = None
    ) -> Set[OrderStatus]:
        """
        獲取當前狀態可以轉換到的所有合法狀態

        Args:
            current_status: 當前狀態
            role: 執行者角色（可選，用於過濾）

        Returns:
            Set[OrderStatus]: 可轉換的狀態集合
        """
        valid_statuses = cls.TRANSITIONS.get(current_status, set())

        if role and role != "admin":
            allowed_transitions = cls.ROLE_TRANSITIONS.get(role, set())
            valid_statuses = {
                to_status
                for from_status, to_status in allowed_transitions
                if from_status == current_status and to_status in valid_statuses
            }

        return valid_statuses

    @classmethod
    def get_status_display(cls, status: OrderStatus) -> str:
        """獲取狀態的顯示名稱（中文）"""
        display_names = {
            OrderStatus.DRAFT: "草稿",
            OrderStatus.SUBMITTED: "待確認",
            OrderStatus.CONFIRMED: "已確認",
            OrderStatus.PREPARING: "備貨中",
            OrderStatus.SHIPPED: "已出貨",
            OrderStatus.DELIVERED: "已送達",
            OrderStatus.ACCEPTED: "已驗收",
            OrderStatus.COMPLETED: "已完成",
            OrderStatus.CANCELLED: "已取消",
            OrderStatus.DISPUTED: "爭議中",
        }
        return display_names.get(status, status.value)

    @classmethod
    def is_terminal_status(cls, status: OrderStatus) -> bool:
        """檢查是否為終態（不可再變更）"""
        return status in {OrderStatus.COMPLETED, OrderStatus.CANCELLED}

    @classmethod
    def is_cancellable(cls, status: OrderStatus) -> bool:
        """檢查訂單是否可取消"""
        return OrderStatus.CANCELLED in cls.TRANSITIONS.get(status, set())
