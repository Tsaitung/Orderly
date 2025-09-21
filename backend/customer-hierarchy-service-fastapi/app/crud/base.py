"""
Base CRUD operations for Customer Hierarchy Service
"""
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, and_, or_, func, desc, asc
from sqlalchemy.orm import selectinload, joinedload
from app.models.base import BaseModel as DBBaseModel
import structlog

logger = structlog.get_logger(__name__)

ModelType = TypeVar("ModelType", bound=DBBaseModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Base class for CRUD operations"""
    
    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).
        
        **Parameters**
        * `model`: A SQLAlchemy model class
        """
        self.model = model
    
    async def get(
        self, 
        db: AsyncSession, 
        id: Any,
        include_inactive: bool = False
    ) -> Optional[ModelType]:
        """Get a single record by ID"""
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
        order_direction: str = "asc"
    ) -> List[ModelType]:
        """Get multiple records with pagination"""
        query = select(self.model)
        
        if not include_inactive:
            query = query.where(self.model.is_active == True)
        
        # Apply ordering
        if order_by:
            order_column = getattr(self.model, order_by, None)
            if order_column:
                if order_direction.lower() == "desc":
                    query = query.order_by(desc(order_column))
                else:
                    query = query.order_by(asc(order_column))
        else:
            # Default ordering by creation date
            query = query.order_by(desc(self.model.created_at))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def count(
        self,
        db: AsyncSession,
        *,
        include_inactive: bool = False,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Count records with optional filters"""
        query = select(func.count(self.model.id))
        
        if not include_inactive:
            query = query.where(self.model.is_active == True)
        
        # Apply filters
        if filters:
            conditions = self._build_filter_conditions(filters)
            if conditions:
                query = query.where(and_(*conditions))
        
        result = await db.execute(query)
        return result.scalar()
    
    async def create(
        self, 
        db: AsyncSession, 
        *, 
        obj_in: CreateSchemaType,
        created_by: str
    ) -> ModelType:
        """Create new record"""
        obj_data = obj_in.dict() if hasattr(obj_in, 'dict') else obj_in
        
        # Add audit fields
        obj_data['created_by'] = created_by
        
        # Generate ID if not provided
        if 'id' not in obj_data or not obj_data['id']:
            obj_data['id'] = self.model.generate_id()
        
        db_obj = self.model(**obj_data)
        db.add(db_obj)
        
        try:
            await db.commit()
            await db.refresh(db_obj)
            
            # Log creation
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
    
    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]],
        updated_by: str
    ) -> ModelType:
        """Update existing record"""
        obj_data = obj_in.dict(exclude_unset=True) if hasattr(obj_in, 'dict') else obj_in
        
        # Add audit fields
        obj_data['updated_by'] = updated_by
        
        # Update fields
        for field, value in obj_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        try:
            await db.commit()
            await db.refresh(db_obj)
            
            # Log update
            db_obj.audit_log('updated', updated_by, obj_data)
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
    
    async def remove(
        self, 
        db: AsyncSession, 
        *, 
        id: Any,
        deleted_by: str,
        hard_delete: bool = False
    ) -> Optional[ModelType]:
        """Remove record (soft delete by default)"""
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
                # Soft delete
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
        """Restore soft deleted record"""
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
    
    async def search(
        self,
        db: AsyncSession,
        *,
        query: str,
        search_fields: List[str],
        skip: int = 0,
        limit: int = 20,
        include_inactive: bool = False
    ) -> List[ModelType]:
        """Search records by text query"""
        search_query = select(self.model)
        
        if not include_inactive:
            search_query = search_query.where(self.model.is_active == True)
        
        # Build search conditions
        search_conditions = []
        for field_name in search_fields:
            field = getattr(self.model, field_name, None)
            if field:
                search_conditions.append(field.ilike(f"%{query}%"))
        
        if search_conditions:
            search_query = search_query.where(or_(*search_conditions))
        
        search_query = search_query.offset(skip).limit(limit)
        
        result = await db.execute(search_query)
        return result.scalars().all()
    
    async def exists(
        self,
        db: AsyncSession,
        *,
        filters: Dict[str, Any],
        exclude_id: Optional[str] = None
    ) -> bool:
        """Check if record exists with given filters"""
        query = select(func.count(self.model.id))
        
        # Build filter conditions
        conditions = self._build_filter_conditions(filters)
        
        # Exclude specific ID if provided
        if exclude_id:
            conditions.append(self.model.id != exclude_id)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        result = await db.execute(query)
        count = result.scalar()
        return count > 0
    
    def _build_filter_conditions(self, filters: Dict[str, Any]) -> List:
        """Build SQLAlchemy filter conditions from dictionary"""
        conditions = []
        
        for field_name, value in filters.items():
            if value is None:
                continue
            
            field = getattr(self.model, field_name, None)
            if not field:
                continue
            
            if isinstance(value, list):
                conditions.append(field.in_(value))
            elif isinstance(value, dict):
                # Handle range queries, etc.
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
            else:
                conditions.append(field == value)
        
        return conditions
    
    async def bulk_create(
        self,
        db: AsyncSession,
        *,
        objects_in: List[CreateSchemaType],
        created_by: str
    ) -> List[ModelType]:
        """Create multiple records in bulk"""
        db_objects = []
        
        for obj_in in objects_in:
            obj_data = obj_in.dict() if hasattr(obj_in, 'dict') else obj_in
            obj_data['created_by'] = created_by
            
            if 'id' not in obj_data or not obj_data['id']:
                obj_data['id'] = self.model.generate_id()
            
            db_obj = self.model(**obj_data)
            db_objects.append(db_obj)
        
        try:
            db.add_all(db_objects)
            await db.commit()
            
            # Refresh all objects
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
    
    async def bulk_update(
        self,
        db: AsyncSession,
        *,
        updates: Dict[str, Dict[str, Any]],
        updated_by: str
    ) -> int:
        """Update multiple records in bulk"""
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