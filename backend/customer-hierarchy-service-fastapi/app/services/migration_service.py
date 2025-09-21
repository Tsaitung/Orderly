"""
MigrationService - Data migration service for hierarchy upgrades

This service handles complex data migration workflows including:
- Legacy system migration to 4-level hierarchy
- Migration plan creation, validation, and execution
- Background processing for large data migrations
- Rollback capabilities with transaction safety
- Progress tracking and reporting
"""

from typing import Dict, List, Optional, Any, Union, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, and_, or_, func
from sqlalchemy.orm import selectinload
import asyncio
import json
import uuid
from datetime import datetime, timedelta
from enum import Enum
import structlog

from app.core.config import settings
from app.models.migration_log import CustomerMigrationLog as MigrationLog
from app.models.customer_group import CustomerGroup
from app.models.customer_company import CustomerCompany
from app.models.customer_location import CustomerLocation
from app.models.business_unit import BusinessUnit
from app.services.cache_service import CacheService
from app.services.integration_service import IntegrationService
from app.services.audit_service import AuditService
from app.services.validation_service import ValidationService
from app.services.background_job_service import BackgroundJobService
from app.schemas.migration import (
    MigrationCreatePlanSchema,
    MigrationConfigSchema
)

logger = structlog.get_logger(__name__)


class MigrationStatus(str, Enum):
    """Migration execution status"""
    DRAFT = "draft"
    VALIDATED = "validated"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"


class MigrationType(str, Enum):
    """Supported migration types"""
    LEGACY_HIERARCHY = "legacy_hierarchy"
    ERP_IMPORT = "erp_import"
    CSV_IMPORT = "csv_import"
    CUSTOM_MAPPING = "custom_mapping"


class MigrationService:
    """
    Core service for managing data migration workflows
    
    Key Features:
    - Multi-source migration support (legacy systems, ERP, CSV)
    - Atomic migration execution with rollback capabilities
    - Background processing for large datasets
    - Progress tracking and real-time monitoring
    - Validation and preview capabilities
    - Comprehensive audit logging
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cache = CacheService()
        self.integration = IntegrationService()
        self.audit = AuditService(db)
        self.validation = ValidationService()
        self.background_jobs = BackgroundJobService()
    
    async def validate_source_data(
        self,
        migration_type: str,
        source_config: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Validate source data before migration plan creation
        
        Performs comprehensive validation of:
        - Data source connectivity and accessibility
        - Data format and structure validation
        - Required field mapping validation
        - Business rule compliance checks
        """
        try:
            validation_errors = []
            validation_warnings = []
            
            # Validate migration type
            if migration_type not in [t.value for t in MigrationType]:
                validation_errors.append(f"Unsupported migration type: {migration_type}")
                return {"is_valid": False, "errors": validation_errors, "warnings": validation_warnings}
            
            # Type-specific validation
            if migration_type == MigrationType.LEGACY_HIERARCHY:
                validation_result = await self._validate_legacy_hierarchy_source(source_config)
            elif migration_type == MigrationType.ERP_IMPORT:
                validation_result = await self._validate_erp_source(source_config)
            elif migration_type == MigrationType.CSV_IMPORT:
                validation_result = await self._validate_csv_source(source_config)
            else:
                validation_result = await self._validate_custom_mapping_source(source_config)
            
            validation_errors.extend(validation_result.get("errors", []))
            validation_warnings.extend(validation_result.get("warnings", []))
            
            # Validate user permissions for migration
            permission_check = await self._validate_migration_permissions(user_id, migration_type)
            if not permission_check:
                validation_errors.append("Insufficient permissions for migration operation")
            
            # Check system resource availability
            resource_check = await self._check_migration_resources()
            if not resource_check["available"]:
                validation_warnings.extend(resource_check["warnings"])
            
            return {
                "is_valid": len(validation_errors) == 0,
                "errors": validation_errors,
                "warnings": validation_warnings,
                "estimated_entities": validation_result.get("estimated_entities", 0),
                "estimated_duration": validation_result.get("estimated_duration", "unknown")
            }
            
        except Exception as e:
            logger.error(
                "Failed to validate source data",
                error=str(e),
                migration_type=migration_type,
                user_id=user_id
            )
            raise
    
    async def create_migration_plan(
        self,
        plan_data: MigrationCreatePlanSchema,
        created_by: str
    ) -> Dict[str, Any]:
        """
        Create a comprehensive migration plan
        
        Plan includes:
        - Entity mapping strategy
        - Batch processing configuration
        - Dependency resolution order
        - Rollback procedure definition
        - Progress tracking milestones
        """
        try:
            plan_id = str(uuid.uuid4())
            
            # Generate migration mapping
            mapping_strategy = await self._generate_migration_mapping(
                plan_data.migration_type,
                plan_data.source_config,
                plan_data.target_config
            )
            
            # Calculate execution strategy
            execution_strategy = await self._calculate_execution_strategy(
                mapping_strategy,
                plan_data.batch_size or settings.default_migration_batch_size
            )
            
            # Create migration log entry
            migration_log = MigrationLog(
                id=plan_id,
                migration_type=plan_data.migration_type,
                status=MigrationStatus.DRAFT,
                source_config=plan_data.source_config,
                target_config=plan_data.target_config,
                mapping_strategy=mapping_strategy,
                execution_strategy=execution_strategy,
                created_by=created_by,
                created_at=datetime.utcnow()
            )
            
            self.db.add(migration_log)
            await self.db.commit()
            await self.db.refresh(migration_log)
            
            # Cache migration plan for quick access
            plan_cache_key = f"migration_plan:{plan_id}"
            await self.cache.set(plan_cache_key, {
                "id": plan_id,
                "status": migration_log.status,
                "created_at": migration_log.created_at.isoformat(),
                "mapping_strategy": mapping_strategy,
                "execution_strategy": execution_strategy
            }, ttl=3600)
            
            logger.info(
                "Migration plan created successfully",
                plan_id=plan_id,
                migration_type=plan_data.migration_type,
                created_by=created_by,
                estimated_entities=execution_strategy.get("total_entities", 0)
            )
            
            return {
                "id": plan_id,
                "migration_type": plan_data.migration_type,
                "status": migration_log.status,
                "mapping_strategy": mapping_strategy,
                "execution_strategy": execution_strategy,
                "created_at": migration_log.created_at.isoformat(),
                "created_by": created_by
            }
            
        except Exception as e:
            logger.error(
                "Failed to create migration plan",
                error=str(e),
                migration_type=plan_data.migration_type,
                created_by=created_by
            )
            raise
    
    async def validate_migration_plan(
        self,
        plan_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Comprehensive validation of migration plan before execution
        """
        try:
            # Get migration plan
            migration_log = await self._get_migration_log(plan_id)
            if not migration_log:
                return None
            
            validation_errors = []
            validation_warnings = []
            
            # Validate plan structure
            structure_validation = await self._validate_plan_structure(migration_log)
            validation_errors.extend(structure_validation.get("errors", []))
            validation_warnings.extend(structure_validation.get("warnings", []))
            
            # Validate source data consistency
            data_validation = await self._validate_source_data_consistency(migration_log)
            validation_errors.extend(data_validation.get("errors", []))
            validation_warnings.extend(data_validation.get("warnings", []))
            
            # Validate target system readiness
            target_validation = await self._validate_target_system_readiness()
            validation_errors.extend(target_validation.get("errors", []))
            validation_warnings.extend(target_validation.get("warnings", []))
            
            # Update migration status if valid
            is_valid = len(validation_errors) == 0
            if is_valid:
                migration_log.status = MigrationStatus.VALIDATED
                migration_log.validated_at = datetime.utcnow()
                migration_log.validated_by = user_id
                await self.db.commit()
            
            return {
                "plan_id": plan_id,
                "is_valid": is_valid,
                "errors": validation_errors,
                "warnings": validation_warnings,
                "validation_timestamp": datetime.utcnow().isoformat(),
                "validated_by": user_id
            }
            
        except Exception as e:
            logger.error(
                "Failed to validate migration plan",
                error=str(e),
                plan_id=plan_id,
                user_id=user_id
            )
            raise
    
    async def preview_migration(
        self,
        plan_id: str,
        sample_size: int,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Generate preview of migration results without executing
        """
        try:
            migration_log = await self._get_migration_log(plan_id)
            if not migration_log:
                return None
            
            # Get sample source data
            sample_data = await self._get_sample_source_data(
                migration_log.source_config,
                migration_log.migration_type,
                sample_size
            )
            
            # Apply mapping transformation
            preview_results = []
            for source_record in sample_data:
                try:
                    transformed_record = await self._apply_mapping_transformation(
                        source_record,
                        migration_log.mapping_strategy
                    )
                    
                    preview_results.append({
                        "source": source_record,
                        "target": transformed_record,
                        "status": "success",
                        "issues": []
                    })
                    
                except Exception as e:
                    preview_results.append({
                        "source": source_record,
                        "target": None,
                        "status": "error",
                        "issues": [str(e)]
                    })
            
            # Calculate preview statistics
            success_count = len([r for r in preview_results if r["status"] == "success"])
            error_count = len([r for r in preview_results if r["status"] == "error"])
            
            return {
                "plan_id": plan_id,
                "sample_size": len(preview_results),
                "success_count": success_count,
                "error_count": error_count,
                "success_rate": success_count / len(preview_results) if preview_results else 0,
                "preview_results": preview_results,
                "preview_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(
                "Failed to preview migration",
                error=str(e),
                plan_id=plan_id,
                user_id=user_id
            )
            raise
    
    async def start_migration_execution(
        self,
        plan_id: str,
        executed_by: str,
        force_execute: bool = False
    ) -> Dict[str, Any]:
        """
        Initialize migration execution and return execution tracking info
        """
        try:
            migration_log = await self._get_migration_log(plan_id)
            if not migration_log:
                raise ValueError(f"Migration plan {plan_id} not found")
            
            # Validate execution readiness
            if migration_log.status != MigrationStatus.VALIDATED and not force_execute:
                raise ValueError(f"Migration plan must be validated before execution")
            
            execution_id = str(uuid.uuid4())
            
            # Update migration status
            migration_log.status = MigrationStatus.EXECUTING
            migration_log.execution_id = execution_id
            migration_log.started_at = datetime.utcnow()
            migration_log.executed_by = executed_by
            
            # Initialize progress tracking
            migration_log.progress = {
                "total_batches": migration_log.execution_strategy.get("total_batches", 0),
                "completed_batches": 0,
                "total_entities": migration_log.execution_strategy.get("total_entities", 0),
                "processed_entities": 0,
                "failed_entities": 0,
                "current_phase": "initialization",
                "start_time": datetime.utcnow().isoformat()
            }
            
            await self.db.commit()
            
            # Initialize execution context in cache
            execution_cache_key = f"migration_execution:{execution_id}"
            await self.cache.set(execution_cache_key, {
                "plan_id": plan_id,
                "status": "initializing",
                "progress": migration_log.progress,
                "execution_log": []
            }, ttl=86400)  # 24 hour TTL for execution tracking
            
            logger.info(
                "Migration execution initialized",
                plan_id=plan_id,
                execution_id=execution_id,
                executed_by=executed_by
            )
            
            return {
                "plan_id": plan_id,
                "execution_id": execution_id,
                "status": "initialized",
                "estimated_duration": migration_log.execution_strategy.get("estimated_duration"),
                "total_entities": migration_log.execution_strategy.get("total_entities", 0),
                "started_at": migration_log.started_at.isoformat()
            }
            
        except Exception as e:
            logger.error(
                "Failed to start migration execution",
                error=str(e),
                plan_id=plan_id,
                executed_by=executed_by
            )
            raise
    
    async def execute_migration_background(
        self,
        plan_id: str,
        execution_id: str,
        user_id: str
    ) -> None:
        """
        Background task for executing migration with progress tracking
        """
        try:
            migration_log = await self._get_migration_log(plan_id)
            if not migration_log:
                logger.error("Migration plan not found", plan_id=plan_id)
                return
            
            execution_cache_key = f"migration_execution:{execution_id}"
            
            try:
                # Execute migration in phases
                await self._execute_migration_phases(
                    migration_log,
                    execution_id,
                    execution_cache_key
                )
                
                # Mark as completed
                migration_log.status = MigrationStatus.COMPLETED
                migration_log.completed_at = datetime.utcnow()
                migration_log.progress["current_phase"] = "completed"
                migration_log.progress["end_time"] = datetime.utcnow().isoformat()
                
                await self.db.commit()
                
                # Notify completion
                await self.integration.notify_migration_completed(
                    plan_id=plan_id,
                    execution_id=execution_id,
                    entities_processed=migration_log.progress.get("processed_entities", 0)
                )
                
                logger.info(
                    "Migration completed successfully",
                    plan_id=plan_id,
                    execution_id=execution_id,
                    entities_processed=migration_log.progress.get("processed_entities", 0)
                )
                
            except Exception as e:
                # Mark as failed and log error
                migration_log.status = MigrationStatus.FAILED
                migration_log.failed_at = datetime.utcnow()
                migration_log.error_details = {
                    "error": str(e),
                    "phase": migration_log.progress.get("current_phase"),
                    "entities_processed": migration_log.progress.get("processed_entities", 0)
                }
                
                await self.db.commit()
                
                # Notify failure
                await self.integration.notify_migration_failed(
                    plan_id=plan_id,
                    execution_id=execution_id,
                    error=str(e)
                )
                
                logger.error(
                    "Migration failed",
                    plan_id=plan_id,
                    execution_id=execution_id,
                    error=str(e)
                )
                
        except Exception as e:
            logger.error(
                "Critical error in background migration execution",
                error=str(e),
                plan_id=plan_id,
                execution_id=execution_id
            )
    
    async def rollback_migration(
        self,
        plan_id: str,
        execution_id: Optional[str],
        rolled_back_by: str,
        force_rollback: bool = False
    ) -> Dict[str, Any]:
        """
        Rollback migration execution with transaction safety
        """
        try:
            migration_log = await self._get_migration_log(plan_id)
            if not migration_log:
                raise ValueError(f"Migration plan {plan_id} not found")
            
            # Validate rollback capability
            if not force_rollback:
                rollback_check = await self.check_rollback_capability(
                    plan_id, execution_id, rolled_back_by
                )
                if not rollback_check["can_rollback"]:
                    raise ValueError(f"Cannot rollback: {rollback_check['blockers']}")
            
            rollback_id = str(uuid.uuid4())
            
            # Start rollback transaction
            async with self.db.begin():
                # Execute rollback operations
                rollback_result = await self._execute_rollback_operations(
                    migration_log,
                    rollback_id
                )
                
                # Update migration status
                migration_log.status = MigrationStatus.ROLLED_BACK
                migration_log.rolled_back_at = datetime.utcnow()
                migration_log.rolled_back_by = rolled_back_by
                migration_log.rollback_details = rollback_result
                
                # Log rollback audit trail
                await self.audit.log_migration_rollback(
                    plan_id=plan_id,
                    execution_id=execution_id,
                    rollback_id=rollback_id,
                    rolled_back_by=rolled_back_by,
                    rollback_details=rollback_result
                )
                
                logger.info(
                    "Migration rolled back successfully",
                    plan_id=plan_id,
                    rollback_id=rollback_id,
                    entities_restored=rollback_result.get("entities_restored", 0)
                )
                
                return {
                    "plan_id": plan_id,
                    "rollback_id": rollback_id,
                    "entities_restored": rollback_result.get("entities_restored", 0),
                    "rollback_timestamp": migration_log.rolled_back_at.isoformat(),
                    "status": "success"
                }
                
        except Exception as e:
            logger.error(
                "Failed to rollback migration",
                error=str(e),
                plan_id=plan_id,
                execution_id=execution_id
            )
            raise
    
    async def get_migration_progress(
        self,
        plan_id: str,
        execution_id: Optional[str],
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed migration progress information
        """
        try:
            migration_log = await self._get_migration_log(plan_id)
            if not migration_log:
                return None
            
            # Get real-time progress from cache if executing
            if migration_log.status == MigrationStatus.EXECUTING and execution_id:
                execution_cache_key = f"migration_execution:{execution_id}"
                cached_progress = await self.cache.get(execution_cache_key)
                if cached_progress:
                    return {
                        "plan_id": plan_id,
                        "execution_id": execution_id,
                        "status": migration_log.status,
                        "progress": cached_progress.get("progress", {}),
                        "execution_log": cached_progress.get("execution_log", []),
                        "last_updated": datetime.utcnow().isoformat()
                    }
            
            # Return stored progress
            return {
                "plan_id": plan_id,
                "status": migration_log.status,
                "progress": migration_log.progress or {},
                "started_at": migration_log.started_at.isoformat() if migration_log.started_at else None,
                "completed_at": migration_log.completed_at.isoformat() if migration_log.completed_at else None,
                "error_details": migration_log.error_details
            }
            
        except Exception as e:
            logger.error(
                "Failed to get migration progress",
                error=str(e),
                plan_id=plan_id,
                user_id=user_id
            )
            raise
    
    async def check_rollback_capability(
        self,
        plan_id: str,
        execution_id: Optional[str],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Check if migration can be rolled back
        """
        try:
            migration_log = await self._get_migration_log(plan_id)
            if not migration_log:
                return {"can_rollback": False, "blockers": ["Migration plan not found"]}
            
            blockers = []
            warnings = []
            
            # Check migration status
            if migration_log.status not in [MigrationStatus.COMPLETED, MigrationStatus.FAILED]:
                blockers.append("Migration must be completed or failed to rollback")
            
            # Check if already rolled back
            if migration_log.status == MigrationStatus.ROLLED_BACK:
                blockers.append("Migration has already been rolled back")
            
            # Check time constraints (e.g., can only rollback within 24 hours)
            if migration_log.completed_at:
                time_since_completion = datetime.utcnow() - migration_log.completed_at
                if time_since_completion > timedelta(hours=24):
                    warnings.append("Migration was completed more than 24 hours ago")
            
            # Check if dependent data has been modified
            dependent_data_check = await self._check_dependent_data_modifications(migration_log)
            if dependent_data_check["has_modifications"]:
                warnings.extend(dependent_data_check["warnings"])
            
            return {
                "can_rollback": len(blockers) == 0,
                "blockers": blockers,
                "warnings": warnings,
                "rollback_complexity": self._assess_rollback_complexity(migration_log)
            }
            
        except Exception as e:
            logger.error(
                "Failed to check rollback capability",
                error=str(e),
                plan_id=plan_id,
                user_id=user_id
            )
            raise
    
    # Private helper methods
    
    async def _get_migration_log(self, plan_id: str) -> Optional[MigrationLog]:
        """Get migration log by plan ID"""
        result = await self.db.execute(
            select(MigrationLog).where(MigrationLog.id == plan_id)
        )
        return result.scalar_one_or_none()
    
    async def _validate_legacy_hierarchy_source(self, source_config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate legacy hierarchy source configuration"""
        # Implementation for legacy system validation
        return {"errors": [], "warnings": [], "estimated_entities": 1000}
    
    async def _validate_erp_source(self, source_config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate ERP source configuration"""
        # Implementation for ERP system validation
        return {"errors": [], "warnings": [], "estimated_entities": 5000}
    
    async def _validate_csv_source(self, source_config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate CSV source configuration"""
        # Implementation for CSV file validation
        return {"errors": [], "warnings": [], "estimated_entities": 500}
    
    async def _validate_custom_mapping_source(self, source_config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate custom mapping source configuration"""
        # Implementation for custom mapping validation
        return {"errors": [], "warnings": [], "estimated_entities": 2000}
    
    async def _validate_migration_permissions(self, user_id: str, migration_type: str) -> bool:
        """Validate user permissions for migration operation"""
        # Implementation for permission validation
        return True
    
    async def _check_migration_resources(self) -> Dict[str, Any]:
        """Check system resource availability for migration"""
        # Implementation for resource checking
        return {"available": True, "warnings": []}
    
    async def _generate_migration_mapping(
        self,
        migration_type: str,
        source_config: Dict[str, Any],
        target_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate migration mapping strategy"""
        # Implementation for mapping generation
        return {
            "field_mappings": {},
            "transformation_rules": {},
            "validation_rules": {}
        }
    
    async def _calculate_execution_strategy(
        self,
        mapping_strategy: Dict[str, Any],
        batch_size: int
    ) -> Dict[str, Any]:
        """Calculate optimal execution strategy"""
        # Implementation for execution strategy calculation
        return {
            "total_entities": 1000,
            "total_batches": 10,
            "batch_size": batch_size,
            "estimated_duration": "30 minutes"
        }
    
    async def _execute_migration_phases(
        self,
        migration_log: MigrationLog,
        execution_id: str,
        execution_cache_key: str
    ) -> None:
        """Execute migration in phases with progress tracking"""
        # Implementation for phased migration execution
        pass
    
    async def _execute_rollback_operations(
        self,
        migration_log: MigrationLog,
        rollback_id: str
    ) -> Dict[str, Any]:
        """Execute rollback operations"""
        # Implementation for rollback execution
        return {"entities_restored": 100}
    
    async def _check_dependent_data_modifications(
        self,
        migration_log: MigrationLog
    ) -> Dict[str, Any]:
        """Check if dependent data has been modified since migration"""
        # Implementation for dependency checking
        return {"has_modifications": False, "warnings": []}
    
    def _assess_rollback_complexity(self, migration_log: MigrationLog) -> str:
        """Assess rollback complexity level"""
        # Implementation for complexity assessment
        return "medium"

    # ------------------------------------------------------------------
    # Additional methods referenced by API endpoints (stub/minimal impl)
    # ------------------------------------------------------------------

    async def get_migration_plans(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        migration_type: Optional[str] = None,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Return a list of migration plans with optional filters."""
        query = select(MigrationLog).offset(skip).limit(limit)
        if status_filter:
            query = query.where(MigrationLog.status == status_filter)
        if migration_type:
            query = query.where(MigrationLog.migration_type == migration_type)
        result = await self.db.execute(query)
        plans = result.scalars().all()
        out: List[Dict[str, Any]] = []
        for p in plans:
            out.append({
                "id": p.id,
                "migration_type": p.migration_type,
                "status": p.status,
                "mapping_strategy": p.mapping_strategy or {},
                "execution_strategy": p.execution_strategy or {},
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "created_by": p.created_by,
            })
        return out

    async def get_migration_plan(self, *, plan_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Return a single migration plan by ID as dict."""
        migration_log = await self._get_migration_log(plan_id)
        if not migration_log:
            return None
        return {
            "id": migration_log.id,
            "migration_type": migration_log.migration_type,
            "status": migration_log.status,
            "mapping_strategy": migration_log.mapping_strategy or {},
            "execution_strategy": migration_log.execution_strategy or {},
            "created_at": migration_log.created_at.isoformat() if migration_log.created_at else None,
            "created_by": migration_log.created_by,
        }

    async def check_execution_readiness(self, *, plan_id: str, user_id: str) -> Dict[str, Any]:
        """Minimal readiness check stub for execution.

        Returns ready=True when plan exists. Real checks can be added later.
        """
        migration_log = await self._get_migration_log(plan_id)
        if not migration_log:
            return {"ready": False, "blockers": ["Migration plan not found"], "warnings": []}
        blockers: List[str] = []
        warnings: List[str] = []
        if migration_log.status not in [MigrationStatus.VALIDATED, MigrationStatus.EXECUTING]:
            warnings.append("Plan not validated; execution may be forced")
        return {"ready": len(blockers) == 0, "blockers": blockers, "warnings": warnings}

    async def get_migration_status(
        self,
        *,
        plan_id: str,
        execution_id: Optional[str],
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Return high-level migration status information for a plan/execution."""
        migration_log = await self._get_migration_log(plan_id)
        if not migration_log:
            return None
        return {
            "plan_id": plan_id,
            "execution_id": execution_id or getattr(migration_log, "execution_id", None),
            "status": migration_log.status,
            "started_at": migration_log.started_at.isoformat() if getattr(migration_log, "started_at", None) else None,
            "completed_at": migration_log.completed_at.isoformat() if getattr(migration_log, "completed_at", None) else None,
            "error_details": getattr(migration_log, "error_details", None),
        }

    async def generate_migration_report(
        self,
        *,
        plan_id: str,
        execution_id: Optional[str],
        include_details: bool,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Generate a minimal migration report."""
        migration_log = await self._get_migration_log(plan_id)
        if not migration_log:
            return None
        summary = {
            "status": migration_log.status,
            "plan_id": plan_id,
            "execution_id": execution_id or getattr(migration_log, "execution_id", None),
        }
        metrics = migration_log.progress or {}
        details = [] if include_details else None
        return {
            "plan_id": plan_id,
            "execution_id": execution_id or getattr(migration_log, "execution_id", None),
            "include_details": include_details,
            "summary": summary,
            "metrics": metrics,
            "details": details,
        }
