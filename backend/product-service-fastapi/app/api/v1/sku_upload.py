"""
SKU Batch Upload API Endpoints
Handles CSV uploads with AI validation (max 200 rows)
"""
import io
import csv
import json
import uuid
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.models.sku_upload import SKUUpload, SKUUploadItem, SKUUploadAuditLog, UploadStatus, ItemStatus, UploadType
from app.services.id_generator import IDGeneratorService
from app.services.duplicate_detector import AIDuplicateDetector
from app.services.category_matcher import AICategoryValidator
from app.schemas.sku_upload import (
    SKUUploadCreate,
    SKUUploadResponse,
    SKUUploadItemResponse,
    UploadProgressResponse,
    AIValidationResponse,
    CSVTemplateResponse,
    UploadValidationResult
)

logger = logging.getLogger(__name__)
router = APIRouter()

# AI service instances
duplicate_detector = AIDuplicateDetector()
category_validator = AICategoryValidator()


# Constants
MAX_UPLOAD_ROWS = 200
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_FILE_TYPES = {'csv', 'text/csv', 'application/csv'}


def generate_csv_template() -> str:
    """Generate CSV template with required fields (no ID fields)"""
    template_data = [
        {
            'product_name': 'Example Product Name',
            'category_name': 'Example Category',
            'variant_size': 'Large',
            'variant_type': 'Organic',
            'variant_grade': 'A',
            'stock_quantity': '100',
            'min_stock': '10',
            'max_stock': '500',
            'weight': '1.5',
            'package_type': 'Box',
            'shelf_life_days': '365',
            'storage_conditions': 'Cool and dry place'
        }
    ]
    
    output = io.StringIO()
    fieldnames = [
        'product_name', 'category_name', 'variant_size', 'variant_type', 'variant_grade',
        'stock_quantity', 'min_stock', 'max_stock', 'weight', 'package_type',
        'shelf_life_days', 'storage_conditions'
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(template_data)
    
    return output.getvalue()


def validate_csv_structure(content: str) -> UploadValidationResult:
    """Validate CSV file structure and content"""
    errors = []
    warnings = []
    
    try:
        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(content))
        rows = list(csv_reader)
        
        # Check row count
        if len(rows) == 0:
            errors.append("CSV file is empty")
            return UploadValidationResult(
                is_valid=False,
                row_count=0,
                errors=errors,
                warnings=warnings
            )
        
        if len(rows) > MAX_UPLOAD_ROWS:
            errors.append(f"CSV file exceeds maximum {MAX_UPLOAD_ROWS} rows (found {len(rows)} rows)")
        
        # Check required fields
        required_fields = ['product_name', 'category_name', 'stock_quantity', 'min_stock']
        fieldnames = csv_reader.fieldnames or []
        
        missing_fields = [field for field in required_fields if field not in fieldnames]
        if missing_fields:
            errors.append(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Validate each row
        for i, row in enumerate(rows, 1):
            row_errors = []
            
            # Required field validation
            if not row.get('product_name', '').strip():
                row_errors.append("product_name is required")
            
            if not row.get('category_name', '').strip():
                row_errors.append("category_name is required")
            
            # Numeric field validation
            try:
                stock_qty = int(row.get('stock_quantity', 0))
                if stock_qty < 0:
                    row_errors.append("stock_quantity must be non-negative")
            except ValueError:
                row_errors.append("stock_quantity must be a valid number")
            
            try:
                min_stock = int(row.get('min_stock', 0))
                if min_stock < 0:
                    row_errors.append("min_stock must be non-negative")
            except ValueError:
                row_errors.append("min_stock must be a valid number")
            
            # Optional numeric fields
            if row.get('max_stock'):
                try:
                    max_stock = int(row['max_stock'])
                    if max_stock < min_stock:
                        row_errors.append("max_stock must be greater than or equal to min_stock")
                except ValueError:
                    row_errors.append("max_stock must be a valid number")
            
            if row.get('weight'):
                try:
                    weight = float(row['weight'])
                    if weight <= 0:
                        row_errors.append("weight must be positive")
                except ValueError:
                    row_errors.append("weight must be a valid number")
            
            if row.get('shelf_life_days'):
                try:
                    shelf_life = int(row['shelf_life_days'])
                    if shelf_life <= 0:
                        row_errors.append("shelf_life_days must be positive")
                except ValueError:
                    row_errors.append("shelf_life_days must be a valid number")
            
            if row_errors:
                errors.append(f"Row {i}: {'; '.join(row_errors)}")
        
        return UploadValidationResult(
            is_valid=len(errors) == 0,
            row_count=len(rows),
            errors=errors,
            warnings=warnings
        )
        
    except Exception as e:
        errors.append(f"Failed to parse CSV file: {str(e)}")
        return UploadValidationResult(
            is_valid=False,
            row_count=0,
            errors=errors,
            warnings=warnings
        )


async def process_upload_with_ai(
    upload_id: str,
    csv_content: str,
    user_id: str,
    db: AsyncSession
):
    """Background task to process upload with AI validation"""
    try:
        logger.info(f"Starting AI processing for upload {upload_id}")
        
        # Update upload status
        upload = await db.get(SKUUpload, upload_id)
        if not upload:
            logger.error(f"Upload {upload_id} not found")
            return
        
        upload.status = UploadStatus.ai_validating.value
        await db.commit()
        
        # Parse CSV and create upload items
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        rows = list(csv_reader)
        
        batch_items = []
        ai_results = []
        
        for i, row in enumerate(rows, 1):
            # Extract variant data
            variant = {}
            if row.get('variant_size'):
                variant['size'] = row['variant_size']
            if row.get('variant_type'):
                variant['type'] = row['variant_type']
            if row.get('variant_grade'):
                variant['grade'] = row['variant_grade']
            
            # Create upload item
            item_data = {
                'product_name': row['product_name'].strip(),
                'category_name': row['category_name'].strip(),
                'variant': variant,
                'stock_quantity': int(row.get('stock_quantity', 0)),
                'min_stock': int(row.get('min_stock', 0)),
                'max_stock': int(row['max_stock']) if row.get('max_stock') else None,
                'weight': float(row['weight']) if row.get('weight') else None,
                'package_type': row.get('package_type', '').strip() or None,
                'shelf_life_days': int(row['shelf_life_days']) if row.get('shelf_life_days') else None,
                'storage_conditions': row.get('storage_conditions', '').strip() or None
            }
            
            batch_items.append(item_data)
        
        # Run AI validation on all items
        logger.info(f"Running duplicate detection for {len(batch_items)} items")
        duplicate_results = await duplicate_detector.batch_detect_duplicates(db, batch_items)
        
        logger.info(f"Running category validation for {len(batch_items)} items")
        category_results = await category_validator.batch_validate_categories(db, batch_items)
        
        # Create upload items with AI results
        total_duplicates = 0
        total_category_corrections = 0
        
        for i, (item_data, dup_result, cat_result) in enumerate(zip(batch_items, duplicate_results, category_results)):
            # Generate system IDs
            sku_code = await IDGeneratorService.generate_sku_code(
                db, 
                item_data['product_name'], 
                item_data['category_name'], 
                item_data['variant']
            )
            product_id = await IDGeneratorService.generate_product_id()
            
            # Determine item status
            item_status = ItemStatus.valid.value
            if dup_result.is_duplicate_detected:
                item_status = ItemStatus.duplicate_detected.value
                total_duplicates += 1
            elif not cat_result.is_correct:
                item_status = ItemStatus.category_mismatch.value
                total_category_corrections += 1
            
            # Create upload item
            upload_item = SKUUploadItem(
                id=await IDGeneratorService.generate_upload_item_id(),
                upload_id=upload_id,
                row_number=i + 1,
                system_generated_sku_code=sku_code,
                system_generated_product_id=product_id,
                product_name=item_data['product_name'],
                category_name=item_data['category_name'],
                variant=item_data['variant'],
                stock_quantity=item_data['stock_quantity'],
                min_stock=item_data['min_stock'],
                max_stock=item_data['max_stock'],
                weight=item_data['weight'],
                package_type=item_data['package_type'],
                shelf_life_days=item_data['shelf_life_days'],
                storage_conditions=item_data['storage_conditions'],
                ai_duplicate_score=dup_result.confidence_score,
                ai_category_match_score=cat_result.confidence_score,
                suggested_category_id=cat_result.matched_category_id,
                suggested_category_path=cat_result.suggestions[0].category_path if cat_result.suggestions else None,
                duplicate_candidates=duplicate_detector.format_detection_summary(dup_result)['candidates'],
                category_suggestions=[
                    {
                        'category_id': s.category_id,
                        'category_name': s.category_name,
                        'confidence_score': s.confidence_score,
                        'match_reason': s.match_reason
                    }
                    for s in cat_result.suggestions
                ],
                status=item_status,
                ai_validation_results={
                    'duplicate_detection': duplicate_detector.format_detection_summary(dup_result),
                    'category_validation': category_validator.format_validation_summary(cat_result)
                },
                original_data=item_data,
                processed_data=item_data
            )
            
            db.add(upload_item)
        
        # Update upload with final results
        upload.processed_rows = len(batch_items)
        upload.valid_rows = len(batch_items) - total_duplicates - total_category_corrections
        upload.duplicate_rows = total_duplicates
        upload.category_corrections = total_category_corrections
        upload.ai_validation_completed = True
        upload.ai_validation_results = {
            'total_items': len(batch_items),
            'duplicates_detected': total_duplicates,
            'category_corrections': total_category_corrections,
            'processing_completed_at': datetime.utcnow().isoformat()
        }
        upload.status = UploadStatus.review_required.value if (total_duplicates > 0 or total_category_corrections > 0) else UploadStatus.approved.value
        upload.completed_at = datetime.utcnow()
        
        await db.commit()
        
        logger.info(f"Completed AI processing for upload {upload_id}: {upload.valid_rows}/{upload.total_rows} valid items")
        
    except Exception as e:
        logger.error(f"Error processing upload {upload_id}: {str(e)}")
        if upload:
            upload.status = UploadStatus.failed.value
            upload.error_summary = {'error': str(e)}
            await db.commit()


@router.get("/sku-upload/template", response_class=StreamingResponse)
async def download_csv_template():
    """Download CSV template for SKU batch upload"""
    content = generate_csv_template()
    
    def iter_content():
        yield content.encode('utf-8')
    
    return StreamingResponse(
        iter_content(),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=sku_upload_template.csv'}
    )


@router.post("/sku-upload", response_model=SKUUploadResponse)
async def upload_sku_batch(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Query(..., description="User ID performing the upload"),
    organization_id: Optional[str] = Query(None, description="Organization ID"),
    db: AsyncSession = Depends(get_async_session)
):
    """Upload CSV file for batch SKU creation with AI validation"""
    
    # Validate file type
    if file.content_type not in ALLOWED_FILE_TYPES and not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only CSV files are allowed."
        )
    
    # Read file content
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum {MAX_FILE_SIZE // (1024*1024)}MB limit"
            )
        
        csv_content = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid file encoding. Please use UTF-8 encoded CSV files."
        )
    
    # Validate CSV structure
    validation_result = validate_csv_structure(csv_content)
    if not validation_result.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "CSV validation failed",
                "errors": validation_result.errors,
                "warnings": validation_result.warnings
            }
        )
    
    # Create upload record
    upload_id = await IDGeneratorService.generate_upload_id()
    upload = SKUUpload(
        id=upload_id,
        user_id=user_id,
        organization_id=organization_id,
        filename=f"upload_{upload_id}_{file.filename}",
        original_filename=file.filename,
        file_size=len(content),
        total_rows=validation_result.row_count,
        status=UploadStatus.processing.value,
        upload_type=UploadType.create.value
    )
    
    db.add(upload)
    await db.commit()
    
    # Add audit log
    audit_log = SKUUploadAuditLog(
        id=str(uuid.uuid4()),
        upload_id=upload_id,
        user_id=user_id,
        action="upload_started",
        details={
            "filename": file.filename,
            "file_size": len(content),
            "row_count": validation_result.row_count
        }
    )
    db.add(audit_log)
    await db.commit()
    
    # Start background processing
    background_tasks.add_task(
        process_upload_with_ai,
        upload_id,
        csv_content,
        user_id,
        db
    )
    
    return SKUUploadResponse(
        id=upload_id,
        filename=file.filename,
        status=upload.status,
        total_rows=upload.total_rows,
        processed_rows=0,
        valid_rows=0,
        error_rows=0,
        duplicate_rows=0,
        category_corrections=0,
        progress_percentage=0.0,
        ai_validation_completed=False,
        started_at=upload.started_at,
        completed_at=None
    )


@router.get("/sku-upload/{upload_id}", response_model=SKUUploadResponse)
async def get_upload_status(
    upload_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Get upload status and progress"""
    upload = await db.get(SKUUpload, upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    return SKUUploadResponse(
        id=upload.id,
        filename=upload.original_filename,
        status=upload.status,
        total_rows=upload.total_rows,
        processed_rows=upload.processed_rows,
        valid_rows=upload.valid_rows,
        error_rows=upload.error_rows,
        duplicate_rows=upload.duplicate_rows,
        category_corrections=upload.category_corrections,
        progress_percentage=upload.progress_percentage,
        ai_validation_completed=upload.ai_validation_completed,
        started_at=upload.started_at,
        completed_at=upload.completed_at
    )


@router.get("/sku-upload/{upload_id}/items")
async def get_upload_items(
    upload_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, description="Filter by item status"),
    db: AsyncSession = Depends(get_async_session)
):
    """Get upload items with AI validation results"""
    upload = await db.get(SKUUpload, upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Build query
    query = select(SKUUploadItem).where(SKUUploadItem.upload_id == upload_id)
    
    if status_filter:
        query = query.where(SKUUploadItem.status == status_filter)
    
    query = query.offset(skip).limit(limit).order_by(SKUUploadItem.row_number)
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    # Format response
    return {
        "upload_id": upload_id,
        "items": [
            {
                "id": item.id,
                "row_number": item.row_number,
                "status": item.status,
                "system_generated_sku_code": item.system_generated_sku_code,
                "product_name": item.product_name,
                "category_name": item.category_name,
                "variant": item.variant,
                "ai_duplicate_score": item.ai_duplicate_score,
                "ai_category_match_score": item.ai_category_match_score,
                "duplicate_candidates": item.duplicate_candidates,
                "category_suggestions": item.category_suggestions,
                "validation_errors": item.validation_errors,
                "validation_warnings": item.validation_warnings
            }
            for item in items
        ],
        "total_items": upload.total_rows,
        "skip": skip,
        "limit": limit
    }


@router.get("/sku-upload/{upload_id}/ai-summary", response_model=AIValidationResponse)
async def get_ai_validation_summary(
    upload_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """Get AI validation summary for upload"""
    upload = await db.get(SKUUpload, upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    if not upload.ai_validation_completed:
        raise HTTPException(status_code=400, detail="AI validation not completed yet")
    
    # Get item statistics
    items_query = select(SKUUploadItem).where(SKUUploadItem.upload_id == upload_id)
    items_result = await db.execute(items_query)
    items = items_result.scalars().all()
    
    # Calculate statistics
    high_duplicate_risk = len([i for i in items if i.ai_duplicate_score and i.ai_duplicate_score > 0.85])
    medium_duplicate_risk = len([i for i in items if i.ai_duplicate_score and 0.60 <= i.ai_duplicate_score <= 0.85])
    category_mismatches = len([i for i in items if i.ai_category_match_score and i.ai_category_match_score < 0.70])
    
    return AIValidationResponse(
        upload_id=upload_id,
        total_items_validated=len(items),
        duplicates_detected=upload.duplicate_rows,
        category_corrections_needed=upload.category_corrections,
        high_risk_duplicates=high_duplicate_risk,
        medium_risk_duplicates=medium_duplicate_risk,
        category_mismatches=category_mismatches,
        ai_processing_completed=upload.ai_validation_completed,
        validation_summary=upload.ai_validation_results,
        recommendations={
            "review_required": upload.status == UploadStatus.review_required.value,
            "items_need_attention": high_duplicate_risk + category_mismatches,
            "ready_for_approval": upload.status == UploadStatus.approved.value
        }
    )


@router.post("/sku-upload/{upload_id}/approve")
async def approve_upload(
    upload_id: str,
    user_id: str = Query(..., description="User ID approving the upload"),
    db: AsyncSession = Depends(get_async_session)
):
    """Approve upload and create SKUs"""
    upload = await db.get(SKUUpload, upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    if upload.status != UploadStatus.review_required.value:
        raise HTTPException(
            status_code=400, 
            detail=f"Upload cannot be approved in current status: {upload.status}"
        )
    
    # Update upload status
    upload.status = UploadStatus.approved.value
    upload.approved_at = datetime.utcnow()
    upload.approved_by = user_id
    
    # Add audit log
    audit_log = SKUUploadAuditLog(
        id=str(uuid.uuid4()),
        upload_id=upload_id,
        user_id=user_id,
        action="upload_approved",
        details={"approved_at": datetime.utcnow().isoformat()}
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {"message": "Upload approved successfully", "upload_id": upload_id}


@router.get("/sku-uploads")
async def list_uploads(
    user_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_session)
):
    """List recent uploads with filtering"""
    query = select(SKUUpload)
    
    if user_id:
        query = query.where(SKUUpload.user_id == user_id)
    
    if status:
        query = query.where(SKUUpload.status == status)
    
    query = query.order_by(desc(SKUUpload.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    uploads = result.scalars().all()
    
    return {
        "uploads": [upload.get_summary() for upload in uploads],
        "skip": skip,
        "limit": limit
    }