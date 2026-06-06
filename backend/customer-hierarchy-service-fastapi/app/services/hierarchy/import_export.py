"""
Import/Export Operations Mixin for HierarchyService

Contains methods for import/export operations:
- export_hierarchy: Export hierarchy structure
- validate_import_data: Validate import data
- import_hierarchy: Import hierarchy data
- _export_to_csv: Export to CSV format
- _export_to_xlsx: Export to Excel format
- _validate_import_record: Validate single import record
- _check_duplicate_identifiers: Check for duplicates
- _validate_import_business_rules: Validate business rules
- _import_single_record: Import single record
- _invalidate_import_caches: Invalidate caches after import
"""

import csv
import io
import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


class ImportExportMixin:
    """Mixin class for import/export operations"""

    async def export_hierarchy(
        self,
        format: str = "json",
        root_id: Optional[str] = None,
        include_inactive: bool = False,
        max_depth: Optional[int] = None,
        user_context: Optional[Dict[str, Any]] = None,
        exported_by: str = None,
    ) -> Dict[str, Any]:
        """
        Export hierarchy structure in various formats

        Supported formats: json, csv, xlsx
        """
        try:
            # Get hierarchy tree data
            tree_data = await self.get_tree(
                root_id=root_id,
                max_depth=max_depth,
                include_inactive=include_inactive,
                include_stats=True,
                user_context=user_context,
            )

            if format.lower() == "json":
                export_data = json.dumps(tree_data, indent=2, default=str)
                content_type = "application/json"
            elif format.lower() == "csv":
                export_data = await self._export_to_csv(tree_data)
                content_type = "text/csv"
            elif format.lower() == "xlsx":
                export_data = await self._export_to_xlsx(tree_data)
                content_type = (
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
            else:
                raise ValueError(f"Unsupported export format: {format}")

            return {
                "format": format,
                "data": export_data,
                "content_type": content_type,
                "filename": f"hierarchy_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format}",
                "exported_at": datetime.utcnow().isoformat(),
                "exported_by": exported_by,
                "record_count": tree_data.get("total_nodes", 0),
            }

        except Exception as e:
            logger.error(
                "Failed to export hierarchy",
                error=str(e),
                format=format,
                root_id=root_id,
            )
            raise

    async def validate_import_data(
        self,
        import_data: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Validate import data structure and business rules
        """
        try:
            validation_errors = []
            warnings = []

            # Validate import data format
            if not isinstance(import_data.get("data"), list):
                validation_errors.append(
                    "Import data must be a list of hierarchy records"
                )
                return {
                    "is_valid": False,
                    "errors": validation_errors,
                    "warnings": warnings,
                }

            records = import_data["data"]

            # Validate each record
            for idx, record in enumerate(records):
                record_errors = await self._validate_import_record(record, idx)
                validation_errors.extend(record_errors)

            # Check for duplicate IDs or codes
            duplicate_errors = self._check_duplicate_identifiers(records)
            validation_errors.extend(duplicate_errors)

            # Business rule validations
            (
                business_errors,
                business_warnings,
            ) = await self._validate_import_business_rules(records)
            validation_errors.extend(business_errors)
            warnings.extend(business_warnings)

            return {
                "is_valid": len(validation_errors) == 0,
                "errors": validation_errors,
                "warnings": warnings,
                "record_count": len(records),
            }

        except Exception as e:
            logger.error("Failed to validate import data", error=str(e))
            raise

    async def import_hierarchy(
        self,
        import_data: Dict[str, Any],
        imported_by: str,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Import hierarchy data with transaction safety
        """
        try:
            records = import_data["data"]
            created_count = 0
            updated_count = 0
            skipped_count = 0
            errors = []

            async with self.db.begin():
                for idx, record in enumerate(records):
                    try:
                        result = await self._import_single_record(record, imported_by)
                        if result["action"] == "created":
                            created_count += 1
                        elif result["action"] == "updated":
                            updated_count += 1
                        else:
                            skipped_count += 1
                    except Exception as e:
                        error_detail = {
                            "record_index": idx,
                            "record_id": record.get("id", "unknown"),
                            "error": str(e),
                        }
                        errors.append(error_detail)
                        logger.warning(
                            "Failed to import record", record_index=idx, error=str(e)
                        )

                # Invalidate caches after successful import
                await self._invalidate_import_caches()

                return {
                    "created_records": created_count,
                    "updated_records": updated_count,
                    "skipped_records": skipped_count,
                    "error_records": len(errors),
                    "errors": errors,
                }

        except Exception as e:
            logger.error("Failed to import hierarchy", error=str(e))
            raise

    async def _export_to_csv(self, tree_data: Dict[str, Any]) -> str:
        """Export hierarchy tree to CSV format"""
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(
            [
                "ID",
                "Name",
                "Type",
                "Code",
                "Parent ID",
                "Parent Type",
                "Is Active",
                "Level",
                "Path",
            ]
        )

        # Write tree data (flattened)
        def write_nodes(
            nodes: List[Dict[str, Any]], level: int = 1, path: str = ""
        ) -> None:
            for node in nodes:
                node_path = f"{path}/{node['name']}" if path else node["name"]
                writer.writerow(
                    [
                        node["id"],
                        node["name"],
                        node["type"],
                        node.get("code", ""),
                        node.get("parent_id", ""),
                        node.get("parent_type", ""),
                        node["is_active"],
                        level,
                        node_path,
                    ]
                )

                # Write children recursively
                if node.get("children"):
                    write_nodes(node["children"], level + 1, node_path)

        write_nodes(tree_data.get("tree", []))

        return output.getvalue()

    async def _export_to_xlsx(self, tree_data: Dict[str, Any]) -> bytes:
        """Export hierarchy tree to Excel format"""
        # This would use openpyxl or similar library to create Excel file
        # For now, return CSV data as bytes
        csv_data = await self._export_to_csv(tree_data)
        return csv_data.encode("utf-8")

    async def _validate_import_record(
        self, record: Dict[str, Any], index: int
    ) -> List[str]:
        """Validate a single import record"""
        errors = []

        # Required fields
        required_fields = ["id", "name", "type"]
        for field in required_fields:
            if not record.get(field):
                errors.append(f"Record {index}: Missing required field '{field}'")

        # Validate entity type
        if record.get("type") not in self.entity_map:
            errors.append(f"Record {index}: Invalid entity type '{record.get('type')}'")

        # Type-specific validations
        entity_type = record.get("type")
        if entity_type == "company" and record.get("tax_id"):
            if not re.match(settings.taiwan_company_tax_id_pattern, record["tax_id"]):
                errors.append(f"Record {index}: Invalid tax ID format")

        return errors

    def _check_duplicate_identifiers(
        self, records: List[Dict[str, Any]]
    ) -> List[str]:
        """Check for duplicate IDs or codes in import data"""
        errors = []
        seen_ids = set()
        seen_codes: Dict[str, set] = {}

        for idx, record in enumerate(records):
            # Check ID duplicates
            record_id = record.get("id")
            if record_id:
                if record_id in seen_ids:
                    errors.append(
                        f"Duplicate ID '{record_id}' found in import data"
                    )
                seen_ids.add(record_id)

            # Check code duplicates within same type
            record_code = record.get("code")
            record_type = record.get("type")
            if record_code and record_type:
                type_codes = seen_codes.setdefault(record_type, set())
                if record_code in type_codes:
                    errors.append(
                        f"Duplicate code '{record_code}' for type '{record_type}' in import data"
                    )
                type_codes.add(record_code)

        return errors

    async def _validate_import_business_rules(
        self, records: List[Dict[str, Any]]
    ) -> Tuple[List[str], List[str]]:
        """Validate business rules for import data"""
        errors = []
        warnings = []

        # Check hierarchy relationships
        entity_ids = {record["id"]: record for record in records if record.get("id")}

        for record in records:
            parent_id = record.get("parent_id")
            if parent_id:
                # Check if parent exists in import data or database
                if parent_id not in entity_ids:
                    parent_exists = await self._node_exists(
                        parent_id, record.get("parent_type", "")
                    )
                    if not parent_exists:
                        errors.append(
                            f"Parent {parent_id} not found for record {record.get('id')}"
                        )

        return errors, warnings

    async def _import_single_record(
        self, record: Dict[str, Any], imported_by: str
    ) -> Dict[str, str]:
        """Import a single record"""
        entity_type = record["type"]
        entity_info = self.entity_map.get(entity_type)
        if not entity_info:
            raise ValueError(f"Unknown entity type: {entity_type}")

        crud_service = entity_info["crud"]

        # Check if record exists
        existing = await crud_service.get(self.db, id=record["id"])

        if existing:
            # Update existing record
            update_data = {k: v for k, v in record.items() if k != "id"}
            await crud_service.update(
                self.db, db_obj=existing, obj_in=update_data, updated_by=imported_by
            )
            return {"action": "updated"}
        else:
            # Create new record
            await crud_service.create(self.db, obj_in=record, created_by=imported_by)
            return {"action": "created"}

    async def _invalidate_import_caches(self) -> None:
        """Invalidate all caches after import"""
        cache_patterns = ["hierarchy_tree:*", "breadcrumb:*", "hierarchy_stats:*"]

        for pattern in cache_patterns:
            await self.cache.delete_pattern(pattern)
