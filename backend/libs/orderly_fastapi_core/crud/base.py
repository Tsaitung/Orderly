"""
井然 Orderly Platform - Unified CRUD Base Class

統一的 CRUD 操作基礎類別，整合自 customer-hierarchy-service 的最佳實踐。
所有微服務的 CRUD 類別應繼承此基礎類別以確保一致性。

Features:
- 通用 CRUD 操作（Create, Read, Update, Delete）
- 軟刪除與還原
- 批量操作（bulk_create, bulk_update）
- 搜索與分頁
- 過濾與排序
- 審計日誌整合

Example:
    from orderly_fastapi_core.crud import CRUDBase
    from app.models.user import User
    from app.schemas.user import UserCreate, UserUpdate

    class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
        pass

    crud_user = CRUDUser(User)
"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union

import structlog
from pydantic import BaseModel
from sqlalchemy import and_, asc, delete, desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from ..models.base import UnifiedBaseModel

logger = structlog.get_logger(__name__)

# Type variables for generic CRUD operations
ModelType = TypeVar("ModelType", bound=UnifiedBaseModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    統一的 CRUD 操作基礎類別

    提供標準化的資料庫操作方法，支援軟刪除、審計日誌、批量操作等功能。

    Type Parameters:
        ModelType: SQLAlchemy 模型類型
        CreateSchemaType: 建立資料的 Pydantic schema
        UpdateSchemaType: 更新資料的 Pydantic schema

    Example:
        class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
            pass

        crud_product = CRUDProduct(Product)
        product = await crud_product.get(db, id="xxx")
    """

    def __init__(self, model: Type[ModelType]):
        """
        初始化 CRUD 物件

        Args:
            model: SQLAlchemy 模型類別
        """
        self.model = model

    # ==================== Read Operations ====================

    async def get(
        self,
        db: AsyncSession,
        id: Any,
        include_inactive: bool = False
    ) -> Optional[ModelType]:
        """
        透過 ID 取得單一記錄

        Args:
            db: 資料庫 session
            id: 記錄 ID
            include_inactive: 是否包含已軟刪除的記錄

        Returns:
            找到的記錄或 None
        """
        query = select(self.model).where(self.model.id == id)

        if not include_inactive:
            query = query.where(self.model.is_active == True)

        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        include_inactive: bool = False,
        order_by: Optional[str] = None,
        order_direction: str = "asc",
        filters: Optional[Dict[str, Any]] = None
    ) -> List[ModelType]:
        """
        取得多筆記錄（支援分頁、排序、過濾）

        Args:
            db: 資料庫 session
            skip: 跳過的記錄數
            limit: 回傳的最大記錄數
            include_inactive: 是否包含已軟刪除的記錄
            order_by: 排序欄位名
            order_direction: 排序方向 ("asc" 或 "desc")
            filters: 過濾條件字典

        Returns:
            記錄列表
        """
        query = select(self.model)

        if not include_inactive:
            query = query.where(self.model.is_active == True)

        # 應用過濾條件
        if filters:
            conditions = self._build_filter_conditions(filters)
            if conditions:
                query = query.where(and_(*conditions))

        # 應用排序
        if order_by:
            order_column = getattr(self.model, order_by, None)
            if order_column is not None:
                if order_direction.lower() == "desc":
                    query = query.order_by(desc(order_column))
                else:
                    query = query.order_by(asc(order_column))
        else:
            # 預設依建立時間倒序
            query = query.order_by(desc(self.model.created_at))

        # 應用分頁
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def count(
        self,
        db: AsyncSession,
        *,
        include_inactive: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        計算記錄總數

        Args:
            db: 資料庫 session
            include_inactive: 是否包含已軟刪除的記錄
            filters: 過濾條件字典

        Returns:
            記錄總數
        """
        query = select(func.count(self.model.id))

        if not include_inactive:
            query = query.where(self.model.is_active == True)

        # 應用過濾條件
        if filters:
            conditions = self._build_filter_conditions(filters)
            if conditions:
                query = query.where(and_(*conditions))

        result = await db.execute(query)
        return result.scalar() or 0

    async def exists(
        self,
        db: AsyncSession,
        *,
        filters: Dict[str, Any],
        exclude_id: Optional[str] = None,
        include_inactive: bool = False
    ) -> bool:
        """
        檢查是否存在符合條件的記錄

        Args:
            db: 資料庫 session
            filters: 過濾條件字典
            exclude_id: 排除的 ID
            include_inactive: 是否包含已軟刪除的記錄

        Returns:
            是否存在
        """
        query = select(func.count(self.model.id))

        if not include_inactive:
            query = query.where(self.model.is_active == True)

        # 建構過濾條件
        conditions = self._build_filter_conditions(filters)

        # 排除特定 ID
        if exclude_id:
            conditions.append(self.model.id != exclude_id)

        if conditions:
            query = query.where(and_(*conditions))

        result = await db.execute(query)
        count = result.scalar() or 0
        return count > 0

    async def search(
        self,
        db: AsyncSession,
        *,
        query_text: str,
        search_fields: List[str],
        skip: int = 0,
        limit: int = 20,
        include_inactive: bool = False
    ) -> List[ModelType]:
        """
        文字搜索記錄

        Args:
            db: 資料庫 session
            query_text: 搜索文字
            search_fields: 要搜索的欄位列表
            skip: 跳過的記錄數
            limit: 回傳的最大記錄數
            include_inactive: 是否包含已軟刪除的記錄

        Returns:
            符合搜索條件的記錄列表
        """
        search_query = select(self.model)

        if not include_inactive:
            search_query = search_query.where(self.model.is_active == True)

        # 建構搜索條件
        search_conditions = []
        for field_name in search_fields:
            field = getattr(self.model, field_name, None)
            if field is not None:
                search_conditions.append(field.ilike(f"%{query_text}%"))

        if search_conditions:
            search_query = search_query.where(or_(*search_conditions))

        search_query = search_query.offset(skip).limit(limit)

        result = await db.execute(search_query)
        return list(result.scalars().all())

    # ==================== Create Operations ====================

    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: Union[CreateSchemaType, Dict[str, Any]],
        created_by: str,
        commit: bool = True
    ) -> ModelType:
        """
        建立新記錄

        Args:
            db: 資料庫 session
            obj_in: 建立資料（Pydantic schema 或字典）
            created_by: 建立者使用者 ID
            commit: 是否自動提交

        Returns:
            新建立的記錄

        Raises:
            Exception: 建立失敗時拋出
        """
        # 轉換為字典
        if hasattr(obj_in, 'model_dump'):
            obj_data = obj_in.model_dump()
        elif hasattr(obj_in, 'dict'):
            obj_data = obj_in.dict()
        else:
            obj_data = dict(obj_in)

        # 設定審計欄位
        obj_data['created_by'] = created_by
        obj_data['updated_by'] = created_by

        # 產生 ID（如未提供）
        if 'id' not in obj_data or not obj_data['id']:
            obj_data['id'] = self.model.generate_id()

        db_obj = self.model(**obj_data)
        db.add(db_obj)

        try:
            if commit:
                await db.commit()
                await db.refresh(db_obj)

                # 記錄審計日誌
                db_obj.audit_log('created', created_by)
                await db.commit()

            logger.info(
                "Entity created",
                entity_type=self.model.__name__,
                entity_id=db_obj.id,
                created_by=created_by
            )

            return db_obj

        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to create entity",
                entity_type=self.model.__name__,
                error=str(e),
                created_by=created_by
            )
            raise

    async def bulk_create(
        self,
        db: AsyncSession,
        *,
        objects_in: List[Union[CreateSchemaType, Dict[str, Any]]],
        created_by: str
    ) -> List[ModelType]:
        """
        批量建立記錄

        Args:
            db: 資料庫 session
            objects_in: 建立資料列表
            created_by: 建立者使用者 ID

        Returns:
            新建立的記錄列表

        Raises:
            Exception: 建立失敗時拋出
        """
        db_objects = []

        for obj_in in objects_in:
            # 轉換為字典
            if hasattr(obj_in, 'model_dump'):
                obj_data = obj_in.model_dump()
            elif hasattr(obj_in, 'dict'):
                obj_data = obj_in.dict()
            else:
                obj_data = dict(obj_in)

            obj_data['created_by'] = created_by
            obj_data['updated_by'] = created_by

            if 'id' not in obj_data or not obj_data['id']:
                obj_data['id'] = self.model.generate_id()

            db_obj = self.model(**obj_data)
            db_objects.append(db_obj)

        try:
            db.add_all(db_objects)
            await db.commit()

            # Refresh 所有物件
            for db_obj in db_objects:
                await db.refresh(db_obj)

            logger.info(
                "Bulk entities created",
                entity_type=self.model.__name__,
                count=len(db_objects),
                created_by=created_by
            )

            return db_objects

        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to bulk create entities",
                entity_type=self.model.__name__,
                count=len(objects_in),
                error=str(e),
                created_by=created_by
            )
            raise

    # ==================== Update Operations ====================

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]],
        updated_by: str,
        commit: bool = True
    ) -> ModelType:
        """
        更新記錄

        Args:
            db: 資料庫 session
            db_obj: 要更新的記錄
            obj_in: 更新資料（Pydantic schema 或字典）
            updated_by: 更新者使用者 ID
            commit: 是否自動提交

        Returns:
            更新後的記錄

        Raises:
            Exception: 更新失敗時拋出
        """
        # 轉換為字典（只包含有設定的欄位）
        if hasattr(obj_in, 'model_dump'):
            obj_data = obj_in.model_dump(exclude_unset=True)
        elif hasattr(obj_in, 'dict'):
            obj_data = obj_in.dict(exclude_unset=True)
        else:
            obj_data = dict(obj_in)

        # 設定審計欄位
        obj_data['updated_by'] = updated_by

        # 記錄變更前的值（用於審計）
        changed_fields = {}

        # 更新欄位
        for field, value in obj_data.items():
            if hasattr(db_obj, field):
                old_value = getattr(db_obj, field)
                if old_value != value:
                    changed_fields[field] = {'old': old_value, 'new': value}
                setattr(db_obj, field, value)

        try:
            if commit:
                await db.commit()
                await db.refresh(db_obj)

                # 記錄審計日誌（含變更詳情）
                if changed_fields:
                    db_obj.audit_log('updated', updated_by, {'changes': changed_fields})
                    await db.commit()

            logger.info(
                "Entity updated",
                entity_type=self.model.__name__,
                entity_id=db_obj.id,
                updated_by=updated_by,
                updated_fields=list(obj_data.keys())
            )

            return db_obj

        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to update entity",
                entity_type=self.model.__name__,
                entity_id=db_obj.id,
                error=str(e),
                updated_by=updated_by
            )
            raise

    async def bulk_update(
        self,
        db: AsyncSession,
        *,
        updates: Dict[str, Dict[str, Any]],
        updated_by: str
    ) -> int:
        """
        批量更新記錄

        Args:
            db: 資料庫 session
            updates: 更新資料字典 {id: {field: value}}
            updated_by: 更新者使用者 ID

        Returns:
            更新的記錄數

        Raises:
            Exception: 更新失敗時拋出
        """
        try:
            updated_count = 0

            for entity_id, update_data in updates.items():
                update_data['updated_by'] = updated_by

                query = (
                    update(self.model)
                    .where(self.model.id == entity_id)
                    .values(**update_data)
                )
                result = await db.execute(query)
                updated_count += result.rowcount

            await db.commit()

            logger.info(
                "Bulk entities updated",
                entity_type=self.model.__name__,
                count=updated_count,
                updated_by=updated_by
            )

            return updated_count

        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to bulk update entities",
                entity_type=self.model.__name__,
                error=str(e),
                updated_by=updated_by
            )
            raise

    # ==================== Delete Operations ====================

    async def remove(
        self,
        db: AsyncSession,
        *,
        id: Any,
        deleted_by: str,
        hard_delete: bool = False
    ) -> Optional[ModelType]:
        """
        刪除記錄（預設軟刪除）

        Args:
            db: 資料庫 session
            id: 記錄 ID
            deleted_by: 刪除者使用者 ID
            hard_delete: 是否硬刪除（永久刪除）

        Returns:
            被刪除的記錄或 None

        Raises:
            Exception: 刪除失敗時拋出
        """
        db_obj = await self.get(db, id=id, include_inactive=True)
        if not db_obj:
            return None

        try:
            if hard_delete:
                await db.delete(db_obj)
                logger.info(
                    "Entity hard deleted",
                    entity_type=self.model.__name__,
                    entity_id=id,
                    deleted_by=deleted_by
                )
            else:
                # 軟刪除
                db_obj.soft_delete(deleted_by)
                logger.info(
                    "Entity soft deleted",
                    entity_type=self.model.__name__,
                    entity_id=id,
                    deleted_by=deleted_by
                )

            await db.commit()
            return db_obj

        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to delete entity",
                entity_type=self.model.__name__,
                entity_id=id,
                error=str(e),
                deleted_by=deleted_by
            )
            raise

    async def restore(
        self,
        db: AsyncSession,
        *,
        id: Any,
        restored_by: str
    ) -> Optional[ModelType]:
        """
        還原軟刪除的記錄

        Args:
            db: 資料庫 session
            id: 記錄 ID
            restored_by: 還原者使用者 ID

        Returns:
            被還原的記錄或 None

        Raises:
            Exception: 還原失敗時拋出
        """
        db_obj = await self.get(db, id=id, include_inactive=True)
        if not db_obj or db_obj.is_active:
            return None

        try:
            db_obj.restore(restored_by)
            await db.commit()

            logger.info(
                "Entity restored",
                entity_type=self.model.__name__,
                entity_id=id,
                restored_by=restored_by
            )

            return db_obj

        except Exception as e:
            await db.rollback()
            logger.error(
                "Failed to restore entity",
                entity_type=self.model.__name__,
                entity_id=id,
                error=str(e),
                restored_by=restored_by
            )
            raise

    # ==================== Helper Methods ====================

    def _build_filter_conditions(self, filters: Dict[str, Any]) -> List:
        """
        從字典建構 SQLAlchemy 過濾條件

        支援的過濾格式：
        - 直接值: {"field": value}
        - 列表（IN 查詢）: {"field": [value1, value2]}
        - 範圍查詢: {"field": {"gte": min, "lte": max}}
        - 模糊搜索: {"field": {"contains": "text"}}

        Args:
            filters: 過濾條件字典

        Returns:
            SQLAlchemy 條件列表
        """
        conditions = []

        for field_name, value in filters.items():
            if value is None:
                continue

            field = getattr(self.model, field_name, None)
            if field is None:
                continue

            if isinstance(value, list):
                # IN 查詢
                conditions.append(field.in_(value))
            elif isinstance(value, dict):
                # 範圍和特殊查詢
                if 'gte' in value:
                    conditions.append(field >= value['gte'])
                if 'lte' in value:
                    conditions.append(field <= value['lte'])
                if 'gt' in value:
                    conditions.append(field > value['gt'])
                if 'lt' in value:
                    conditions.append(field < value['lt'])
                if 'contains' in value:
                    conditions.append(field.ilike(f"%{value['contains']}%"))
                if 'startswith' in value:
                    conditions.append(field.ilike(f"{value['startswith']}%"))
                if 'endswith' in value:
                    conditions.append(field.ilike(f"%{value['endswith']}"))
                if 'ne' in value:
                    conditions.append(field != value['ne'])
                if 'is_null' in value:
                    if value['is_null']:
                        conditions.append(field.is_(None))
                    else:
                        conditions.append(field.isnot(None))
            else:
                # 等值查詢
                conditions.append(field == value)

        return conditions
