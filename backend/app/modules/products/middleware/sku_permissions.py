"""
SKU 權限控制中間件
實施 RBAC 和訪問隔離機制
"""
from typing import List, Optional, Set
from enum import Enum
from fastapi import HTTPException, status
from pydantic import BaseModel


class UserRole(str, Enum):
    """用戶角色枚舉"""
    PLATFORM_ADMIN = "platform_admin"
    SUPPLIER = "supplier"
    RESTAURANT = "restaurant"
    GUEST = "guest"


class SKUPermission(str, Enum):
    """SKU 權限枚舉"""
    VIEW = "view"
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"
    SHARE = "share"
    PARTICIPATE = "participate"
    APPROVE = "approve"


class UserContext(BaseModel):
    """用戶上下文資訊"""
    user_id: str
    role: UserRole
    organization_id: Optional[str] = None
    permissions: Set[str] = set()


class SKUPermissionChecker:
    """SKU 權限檢查器"""
    
    # 角色權限矩陣
    ROLE_PERMISSIONS = {
        UserRole.PLATFORM_ADMIN: {
            SKUPermission.VIEW,
            SKUPermission.CREATE,
            SKUPermission.EDIT,
            SKUPermission.DELETE,
            SKUPermission.SHARE,
            SKUPermission.APPROVE
        },
        UserRole.SUPPLIER: {
            SKUPermission.VIEW,
            SKUPermission.CREATE,
            SKUPermission.EDIT,
            SKUPermission.SHARE,
            SKUPermission.PARTICIPATE
        },
        UserRole.RESTAURANT: {
            SKUPermission.VIEW
        },
        UserRole.GUEST: set()
    }
    
    @classmethod
    def has_permission(cls, user: UserContext, permission: SKUPermission) -> bool:
        """檢查用戶是否有指定權限"""
        if user.role not in cls.ROLE_PERMISSIONS:
            return False
        
        return permission in cls.ROLE_PERMISSIONS[user.role]
    
    @classmethod
    def can_view_sku(cls, user: UserContext, sku_type: str, sku_creator_id: Optional[str] = None) -> bool:
        """檢查用戶是否可以查看 SKU"""
        # 平台管理員可以查看所有 SKU
        if user.role == UserRole.PLATFORM_ADMIN:
            return True
        
        # 共享型 SKU 所有人都可以查看
        if sku_type == "public":
            return cls.has_permission(user, SKUPermission.VIEW)
        
        # 私有 SKU 只有創建者可以查看
        if sku_type == "private":
            if sku_creator_id and user.organization_id == sku_creator_id:
                return cls.has_permission(user, SKUPermission.VIEW)
            return False
        
        return False
    
    @classmethod
    def can_edit_sku(cls, user: UserContext, sku_type: str, sku_creator_id: Optional[str] = None) -> bool:
        """檢查用戶是否可以編輯 SKU"""
        # 平台管理員可以編輯所有 SKU
        if user.role == UserRole.PLATFORM_ADMIN:
            return True
        
        # 供應商只能編輯自己創建的 SKU
        if user.role == UserRole.SUPPLIER:
            if sku_creator_id and user.organization_id == sku_creator_id:
                return cls.has_permission(user, SKUPermission.EDIT)
        
        return False
    
    @classmethod
    def can_share_sku(cls, user: UserContext, sku_creator_id: Optional[str] = None) -> bool:
        """檢查用戶是否可以將 SKU 轉為共享"""
        # 平台管理員可以共享任何 SKU
        if user.role == UserRole.PLATFORM_ADMIN:
            return True
        
        # 供應商只能共享自己創建的 SKU
        if user.role == UserRole.SUPPLIER:
            if sku_creator_id and user.organization_id == sku_creator_id:
                return cls.has_permission(user, SKUPermission.SHARE)
        
        return False
    
    @classmethod
    def can_participate_in_sku(cls, user: UserContext, sku_type: str) -> bool:
        """檢查供應商是否可以參與銷售共享 SKU"""
        # 只有供應商可以參與共享 SKU
        if user.role == UserRole.SUPPLIER and sku_type == "public":
            return cls.has_permission(user, SKUPermission.PARTICIPATE)
        
        return False
    
    @classmethod
    def can_approve_sharing(cls, user: UserContext) -> bool:
        """檢查用戶是否可以審核 SKU 共享申請"""
        return user.role == UserRole.PLATFORM_ADMIN and cls.has_permission(user, SKUPermission.APPROVE)
    
    @classmethod
    def filter_visible_skus(cls, user: UserContext, skus: List[dict]) -> List[dict]:
        """根據用戶權限過濾可見的 SKU 列表"""
        visible_skus = []
        
        for sku in skus:
            sku_type = sku.get("type", "private")
            sku_creator_id = sku.get("creator_id")
            
            if cls.can_view_sku(user, sku_type, sku_creator_id):
                visible_skus.append(sku)
        
        return visible_skus


def require_permission(permission: SKUPermission):
    """權限檢查裝飾器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # 從請求中獲取用戶上下文 (這裡需要根據實際的認證系統調整)
            # user = get_current_user()
            # if not SKUPermissionChecker.has_permission(user, permission):
            #     raise HTTPException(
            #         status_code=status.HTTP_403_FORBIDDEN,
            #         detail=f"Permission denied: {permission.value} required"
            #     )
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_sku_access(sku_type: str, creator_id: Optional[str] = None):
    """SKU 訪問權限檢查裝飾器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # 從請求中獲取用戶上下文
            # user = get_current_user()
            # if not SKUPermissionChecker.can_view_sku(user, sku_type, creator_id):
            #     raise HTTPException(
            #         status_code=status.HTTP_403_FORBIDDEN,
            #         detail="Access denied: insufficient permissions for this SKU"
            #     )
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class SKUAccessControl:
    """SKU 訪問控制工具類"""
    
    @staticmethod
    def create_access_policy(sku_type: str, creator_id: str) -> dict:
        """創建 SKU 訪問策略"""
        if sku_type == "public":
            return {
                "type": "public",
                "visibility": "all",
                "edit_permissions": ["platform_admin", "creator"],
                "participate_permissions": ["supplier"],
                "view_permissions": ["all"]
            }
        else:
            return {
                "type": "private",
                "visibility": "creator_only",
                "edit_permissions": ["platform_admin", "creator"],
                "participate_permissions": [],
                "view_permissions": ["platform_admin", "creator"]
            }
    
    @staticmethod
    def check_organization_access(user_org_id: str, target_org_id: str) -> bool:
        """檢查組織間訪問權限"""
        # 同一組織內可以訪問
        if user_org_id == target_org_id:
            return True
        
        # 可以在這裡添加跨組織訪問規則
        # 例如：合作夥伴關係、供應鏈關係等
        
        return False
    
    @staticmethod
    def get_user_accessible_sku_types(user_role: UserRole) -> List[str]:
        """獲取用戶可訪問的 SKU 類型列表"""
        if user_role == UserRole.PLATFORM_ADMIN:
            return ["public", "private"]
        elif user_role == UserRole.SUPPLIER:
            return ["public", "private"]  # 私有 SKU 需要額外檢查創建者
        elif user_role == UserRole.RESTAURANT:
            return ["public"]
        else:
            return []


# 示例用法：
# @require_permission(SKUPermission.CREATE)
# async def create_sku(sku_data: dict):
#     # 創建 SKU 的邏輯
#     pass
#
# @require_sku_access("private", "supplier123")
# async def edit_private_sku(sku_id: str):
#     # 編輯私有 SKU 的邏輯
#     pass