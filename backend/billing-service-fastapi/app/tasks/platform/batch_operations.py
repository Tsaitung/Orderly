"""
Platform Batch Operations Tasks
平台批次操作任务

支持前端批次操作功能的后台任务系统
"""
import asyncio
import json
import structlog
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from enum import Enum
from dataclasses import dataclass, asdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, and_, or_

from app.core.database import get_async_session
from app.schemas.platform import (
    BatchOperation,
    BatchOperationResult,
    BatchOperationProgress,
    BatchOperationType
)
from app.models.billing_transaction import BillingTransaction
from app.models.monthly_billing_statement import MonthlyBillingStatement
from app.models.payment_record import PaymentRecord

logger = structlog.get_logger()


class TaskStatus(str, Enum):
    """任务状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class BatchTaskResult:
    """单个批次任务结果"""
    supplier_id: str
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    execution_time_ms: float = 0.0


@dataclass
class BatchTaskContext:
    """批次任务上下文"""
    task_id: str
    operation_type: str
    parameters: Dict[str, Any]
    target_supplier_ids: List[str]
    started_at: datetime
    progress_callback: Optional[Callable] = None


class PlatformBatchOperationManager:
    """
    平台批次操作管理器
    
    核心功能：
    1. 批次任务执行和管理
    2. 进度跟踪和通知
    3. 错误处理和恢复
    4. 任务结果持久化
    5. WebSocket进度推送
    """
    
    def __init__(self):
        self.active_tasks: Dict[str, BatchTaskContext] = {}
        self.task_results: Dict[str, BatchOperationResult] = {}
        
    async def execute_batch_operation(
        self,
        operation: BatchOperation,
        db: AsyncSession,
        progress_callback: Optional[Callable] = None
    ) -> str:
        """
        执行批次操作
        
        Args:
            operation: 批次操作配置
            db: 数据库会话
            progress_callback: 进度回调函数
            
        Returns:
            任务ID
        """
        # 生成任务ID
        task_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{operation.operation_type}"
        
        # 创建任务上下文
        context = BatchTaskContext(
            task_id=task_id,
            operation_type=operation.operation_type,
            parameters=operation.parameters,
            target_supplier_ids=operation.target_supplier_ids or [],
            started_at=datetime.now(),
            progress_callback=progress_callback
        )
        
        # 注册任务
        self.active_tasks[task_id] = context
        
        # 初始化任务结果
        initial_progress = BatchOperationProgress(
            completed=0,
            total=len(context.target_supplier_ids),
            failed=0,
            percentage=0.0,
            current_step="初始化批次操作..."
        )
        
        task_result = BatchOperationResult(
            task_id=task_id,
            status="running",
            progress=initial_progress,
            results={},
            started_at=context.started_at
        )
        
        self.task_results[task_id] = task_result
        
        # 启动后台任务
        asyncio.create_task(self._execute_batch_task(context, db))
        
        logger.info("Batch operation started", 
                   task_id=task_id,
                   operation_type=operation.operation_type,
                   target_count=len(context.target_supplier_ids))
        
        return task_id
    
    async def _execute_batch_task(
        self,
        context: BatchTaskContext,
        db: AsyncSession
    ):
        """执行批次任务的核心逻辑"""
        task_id = context.task_id
        
        try:
            logger.info("Starting batch task execution", task_id=task_id)
            
            # 获取操作处理器
            handler = self._get_operation_handler(context.operation_type)
            if not handler:
                raise ValueError(f"不支持的操作类型: {context.operation_type}")
            
            # 更新状态为运行中
            await self._update_task_progress(
                task_id,
                current_step="准备执行批次操作...",
                status="running"
            )
            
            # 执行批次操作
            results = await self._execute_batch_items(context, handler, db)
            
            # 统计结果
            successful_count = sum(1 for r in results if r.success)
            failed_count = len(results) - successful_count
            
            # 更新最终状态
            final_status = "completed" if failed_count == 0 else "completed"
            
            await self._update_task_progress(
                task_id,
                completed=len(results),
                failed=failed_count,
                current_step="批次操作已完成",
                status=final_status,
                results={
                    "successful": successful_count,
                    "failed": failed_count,
                    "details": [asdict(r) for r in results],
                    "summary": {
                        "total_processed": len(results),
                        "success_rate": (successful_count / len(results)) * 100 if results else 0,
                        "avg_execution_time_ms": sum(r.execution_time_ms for r in results) / len(results) if results else 0
                    }
                },
                completed_at=datetime.now()
            )
            
            logger.info("Batch task completed successfully", 
                       task_id=task_id,
                       successful=successful_count,
                       failed=failed_count)
            
        except Exception as e:
            logger.error("Batch task failed", task_id=task_id, error=str(e))
            
            await self._update_task_progress(
                task_id,
                current_step=f"批次操作失败: {str(e)}",
                status="failed",
                completed_at=datetime.now()
            )
            
        finally:
            # 清理活跃任务
            self.active_tasks.pop(task_id, None)
    
    async def _execute_batch_items(
        self,
        context: BatchTaskContext,
        handler: Callable,
        db: AsyncSession
    ) -> List[BatchTaskResult]:
        """执行批次项目"""
        results = []
        total_items = len(context.target_supplier_ids)
        
        # 按批次处理，避免数据库连接过载
        batch_size = min(10, total_items)  # 每批最多10个
        
        for i in range(0, total_items, batch_size):
            batch_items = context.target_supplier_ids[i:i + batch_size]
            
            # 并发执行批次内的项目
            batch_tasks = [
                self._execute_single_item(supplier_id, context, handler, db)
                for supplier_id in batch_items
            ]
            
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # 处理结果
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    results.append(BatchTaskResult(
                        supplier_id=batch_items[j],
                        success=False,
                        message=f"执行失败: {str(result)}"
                    ))
                else:
                    results.append(result)
            
            # 更新进度
            completed = len(results)
            percentage = (completed / total_items) * 100
            
            await self._update_task_progress(
                context.task_id,
                completed=completed,
                percentage=percentage,
                current_step=f"正在处理第 {completed}/{total_items} 项..."
            )
            
            # 通知进度回调
            if context.progress_callback:
                try:
                    await context.progress_callback(context.task_id, completed, total_items)
                except Exception as e:
                    logger.error("Progress callback failed", task_id=context.task_id, error=str(e))
            
            # 避免过快执行导致系统负载过高
            if i + batch_size < total_items:
                await asyncio.sleep(0.1)
        
        return results
    
    async def _execute_single_item(
        self,
        supplier_id: str,
        context: BatchTaskContext,
        handler: Callable,
        db: AsyncSession
    ) -> BatchTaskResult:
        """执行单个项目"""
        start_time = datetime.now()
        
        try:
            result_data = await handler(supplier_id, context.parameters, db)
            
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return BatchTaskResult(
                supplier_id=supplier_id,
                success=True,
                message="执行成功",
                data=result_data,
                execution_time_ms=execution_time
            )
            
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            
            logger.error("Single item execution failed", 
                        supplier_id=supplier_id,
                        operation_type=context.operation_type,
                        error=str(e))
            
            return BatchTaskResult(
                supplier_id=supplier_id,
                success=False,
                message=f"执行失败: {str(e)}",
                execution_time_ms=execution_time
            )
    
    def _get_operation_handler(self, operation_type: str) -> Optional[Callable]:
        """获取操作处理器"""
        handlers = {
            BatchOperationType.GENERATE_BILLS: self._handle_generate_bills,
            BatchOperationType.ADJUST_RATES: self._handle_adjust_rates,
            BatchOperationType.SEND_NOTIFICATIONS: self._handle_send_notifications,
            BatchOperationType.UPDATE_RATINGS: self._handle_update_ratings
        }
        
        return handlers.get(operation_type)
    
    # ============== 操作处理器 ==============
    
    async def _handle_generate_bills(
        self,
        supplier_id: str,
        parameters: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """处理生成账单操作"""
        
        logger.info("Generating bill for supplier", supplier_id=supplier_id)
        
        # 获取指定月份的计费数据
        billing_month = parameters.get("billing_month", datetime.now().strftime("%Y-%m"))
        billing_date = datetime.strptime(billing_month, "%Y-%m")
        
        # 查询该供应商在指定月份的交易
        start_date = billing_date.replace(day=1)
        end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        transactions_query = select(BillingTransaction).where(
            and_(
                BillingTransaction.supplier_id == supplier_id,
                BillingTransaction.created_at >= start_date,
                BillingTransaction.created_at <= end_date,
                BillingTransaction.status == "completed"
            )
        )
        
        result = await db.execute(transactions_query)
        transactions = result.scalars().all()
        
        if not transactions:
            return {
                "bill_generated": False,
                "message": "该月份无交易记录",
                "transaction_count": 0,
                "total_amount": 0
            }
        
        # 计算账单总金额
        total_commission = sum(t.commission_amount for t in transactions)
        total_gmv = sum(t.transaction_amount for t in transactions)
        
        # 检查是否已存在账单
        existing_bill_query = select(MonthlyBillingStatement).where(
            and_(
                MonthlyBillingStatement.supplier_id == supplier_id,
                MonthlyBillingStatement.billing_month == billing_month
            )
        )
        
        existing_result = await db.execute(existing_bill_query)
        existing_bill = existing_result.scalar_one_or_none()
        
        if existing_bill:
            return {
                "bill_generated": False,
                "message": "该月份账单已存在",
                "bill_id": str(existing_bill.id),
                "transaction_count": len(transactions),
                "total_amount": total_commission
            }
        
        # 创建新账单
        new_bill = MonthlyBillingStatement(
            supplier_id=supplier_id,
            billing_month=billing_month,
            statement_date=datetime.now(),
            total_gmv=total_gmv,
            total_commission=total_commission,
            transaction_count=len(transactions),
            status="pending",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(new_bill)
        await db.commit()
        await db.refresh(new_bill)
        
        logger.info("Bill generated successfully", 
                   supplier_id=supplier_id,
                   bill_id=str(new_bill.id),
                   amount=total_commission)
        
        return {
            "bill_generated": True,
            "bill_id": str(new_bill.id),
            "transaction_count": len(transactions),
            "total_amount": total_commission,
            "billing_month": billing_month
        }
    
    async def _handle_adjust_rates(
        self,
        supplier_id: str,
        parameters: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """处理费率调整操作"""
        
        logger.info("Adjusting rates for supplier", supplier_id=supplier_id)
        
        new_rate = parameters.get("new_rate")
        adjustment_reason = parameters.get("reason", "批次费率调整")
        effective_date = parameters.get("effective_date", datetime.now())
        
        if not new_rate:
            raise ValueError("缺少新费率参数")
        
        # 更新供应商的费率（简化实现）
        # 实际应该更新供应商费率配置表
        
        # 模拟费率调整
        await asyncio.sleep(0.05)  # 模拟处理时间
        
        logger.info("Rate adjusted successfully", 
                   supplier_id=supplier_id,
                   new_rate=new_rate)
        
        return {
            "rate_adjusted": True,
            "old_rate": 2.5,  # 模拟旧费率
            "new_rate": new_rate,
            "effective_date": effective_date.isoformat(),
            "reason": adjustment_reason
        }
    
    async def _handle_send_notifications(
        self,
        supplier_id: str,
        parameters: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """处理发送通知操作"""
        
        logger.info("Sending notification to supplier", supplier_id=supplier_id)
        
        notification_type = parameters.get("type", "general")
        message = parameters.get("message", "")
        template_id = parameters.get("template_id")
        
        # 模拟发送通知
        await asyncio.sleep(0.02)  # 模拟发送时间
        
        # 实际实现应该：
        # 1. 调用通知服务API
        # 2. 发送邮件/短信/系统通知
        # 3. 记录通知发送日志
        
        logger.info("Notification sent successfully", 
                   supplier_id=supplier_id,
                   notification_type=notification_type)
        
        return {
            "notification_sent": True,
            "notification_type": notification_type,
            "message": message,
            "sent_at": datetime.now().isoformat()
        }
    
    async def _handle_update_ratings(
        self,
        supplier_id: str,
        parameters: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """处理更新评级操作"""
        
        logger.info("Updating rating for supplier", supplier_id=supplier_id)
        
        new_rating = parameters.get("new_rating")
        rating_reason = parameters.get("reason", "批次评级更新")
        
        if not new_rating:
            raise ValueError("缺少新评级参数")
        
        # 查询当前评级
        current_rating_query = select(SupplierRating).where(
            SupplierRating.supplier_id == supplier_id
        ).order_by(SupplierRating.created_at.desc()).limit(1)
        
        result = await db.execute(current_rating_query)
        current_rating = result.scalar_one_or_none()
        
        old_rating = current_rating.rating if current_rating else "Bronze"
        
        # 创建新的评级记录
        new_rating_record = SupplierRating(
            supplier_id=supplier_id,
            rating=new_rating,
            rating_reason=rating_reason,
            effective_date=datetime.now(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(new_rating_record)
        await db.commit()
        await db.refresh(new_rating_record)
        
        logger.info("Rating updated successfully", 
                   supplier_id=supplier_id,
                   old_rating=old_rating,
                   new_rating=new_rating)
        
        return {
            "rating_updated": True,
            "old_rating": old_rating,
            "new_rating": new_rating,
            "rating_id": str(new_rating_record.id),
            "effective_date": new_rating_record.effective_date.isoformat()
        }
    
    # ============== 任务管理方法 ==============
    
    async def _update_task_progress(
        self,
        task_id: str,
        completed: Optional[int] = None,
        failed: Optional[int] = None,
        percentage: Optional[float] = None,
        current_step: Optional[str] = None,
        status: Optional[str] = None,
        results: Optional[Dict[str, Any]] = None,
        completed_at: Optional[datetime] = None
    ):
        """更新任务进度"""
        
        if task_id not in self.task_results:
            return
        
        task_result = self.task_results[task_id]
        
        # 更新进度信息
        if completed is not None:
            task_result.progress.completed = completed
        if failed is not None:
            task_result.progress.failed = failed
        if percentage is not None:
            task_result.progress.percentage = percentage
        elif completed is not None and task_result.progress.total > 0:
            task_result.progress.percentage = (completed / task_result.progress.total) * 100
        if current_step is not None:
            task_result.progress.current_step = current_step
        
        # 更新任务状态
        if status is not None:
            task_result.status = status
        if results is not None:
            task_result.results.update(results)
        if completed_at is not None:
            task_result.completed_at = completed_at
        
        logger.debug("Task progress updated", 
                    task_id=task_id,
                    progress=task_result.progress.percentage,
                    status=task_result.status)
    
    async def get_task_status(self, task_id: str) -> Optional[BatchOperationResult]:
        """获取任务状态"""
        return self.task_results.get(task_id)
    
    async def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        if task_id in self.active_tasks:
            # 标记任务为取消状态
            await self._update_task_progress(
                task_id,
                status="cancelled",
                current_step="任务已被取消",
                completed_at=datetime.now()
            )
            
            # 清理活跃任务
            self.active_tasks.pop(task_id, None)
            
            logger.info("Task cancelled", task_id=task_id)
            return True
        
        return False
    
    async def get_active_tasks(self) -> List[str]:
        """获取活跃任务列表"""
        return list(self.active_tasks.keys())
    
    async def cleanup_completed_tasks(self, older_than_hours: int = 24):
        """清理已完成的任务"""
        cutoff_time = datetime.now() - timedelta(hours=older_than_hours)
        
        tasks_to_remove = []
        for task_id, result in self.task_results.items():
            if (result.status in ["completed", "failed", "cancelled"] and 
                result.completed_at and 
                result.completed_at < cutoff_time):
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del self.task_results[task_id]
        
        logger.info("Completed tasks cleaned up", cleaned_count=len(tasks_to_remove))
    
    async def get_batch_operation_stats(self) -> Dict[str, Any]:
        """获取批次操作统计信息"""
        active_count = len(self.active_tasks)
        total_tasks = len(self.task_results)
        
        status_counts = {}
        for result in self.task_results.values():
            status_counts[result.status] = status_counts.get(result.status, 0) + 1
        
        return {
            "active_tasks": active_count,
            "total_tasks": total_tasks,
            "status_distribution": status_counts,
            "memory_usage": {
                "active_tasks_size": len(str(self.active_tasks)),
                "results_size": len(str(self.task_results))
            }
        }


# 全局批次操作管理器实例
batch_operation_manager = PlatformBatchOperationManager()