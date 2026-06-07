"""
BackgroundJobService - Async task processing service for long-running operations

This service provides:
- Background task management for migrations and bulk operations
- Job queue management with priority and retry logic
- Progress tracking and status monitoring
- Error handling and recovery mechanisms
- Resource management and throttling
"""

from typing import Dict, List, Optional, Any, Union, Callable
import asyncio
import uuid
from datetime import datetime, timedelta
from enum import Enum
import structlog
from dataclasses import dataclass, field
import pickle
import json

logger = structlog.get_logger(__name__)


class JobStatus(str, Enum):
    """Background job status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class JobPriority(int, Enum):
    """Job priority levels"""
    LOW = 3
    NORMAL = 2
    HIGH = 1
    CRITICAL = 0


@dataclass
class BackgroundJob:
    """Background job container"""
    job_id: str
    job_type: str
    function: Callable
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    priority: JobPriority = JobPriority.NORMAL
    max_retries: int = 3
    retry_delay: float = 5.0
    timeout: Optional[float] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: JobStatus = JobStatus.PENDING
    progress: Dict[str, Any] = field(default_factory=dict)
    result: Any = None
    error: Optional[str] = None
    retry_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


class BackgroundJobService:
    """
    Comprehensive background job processing service
    
    Key Features:
    - Async job queue with priority-based execution
    - Automatic retry logic with exponential backoff
    - Progress tracking and real-time monitoring
    - Resource management and concurrency control
    - Job persistence and recovery
    - Graceful shutdown and cleanup
    """
    
    def __init__(self, max_workers: int = 5, max_queue_size: int = 1000):
        self.max_workers = max_workers
        self.max_queue_size = max_queue_size
        self.job_queue = asyncio.PriorityQueue(maxsize=max_queue_size)
        self.active_jobs: Dict[str, BackgroundJob] = {}
        self.completed_jobs: Dict[str, BackgroundJob] = {}
        self.workers: List[asyncio.Task] = []
        self.running = False
        self.shutdown_event = asyncio.Event()
        
        # Performance metrics
        self.metrics = {
            "total_jobs_processed": 0,
            "successful_jobs": 0,
            "failed_jobs": 0,
            "retried_jobs": 0,
            "avg_execution_time": 0.0,
            "queue_size": 0,
            "active_workers": 0
        }
        
        # Job type handlers
        self.job_handlers: Dict[str, Callable] = {}
        self.job_cleanup_handlers: Dict[str, Callable] = {}
    
    async def start(self):
        """Start the background job service"""
        if self.running:
            logger.warning("Background job service is already running")
            return
        
        self.running = True
        self.shutdown_event.clear()
        
        # Start worker tasks
        for i in range(self.max_workers):
            worker_task = asyncio.create_task(
                self._worker(f"worker-{i}")
            )
            self.workers.append(worker_task)
        
        logger.info(
            "Background job service started",
            max_workers=self.max_workers,
            max_queue_size=self.max_queue_size
        )
    
    async def stop(self, timeout: float = 30.0):
        """Stop the background job service gracefully"""
        if not self.running:
            return
        
        logger.info("Stopping background job service...")
        
        self.running = False
        self.shutdown_event.set()
        
        # Wait for workers to finish current jobs
        try:
            await asyncio.wait_for(
                asyncio.gather(*self.workers, return_exceptions=True),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            logger.warning("Worker shutdown timeout, cancelling remaining tasks")
            for worker in self.workers:
                worker.cancel()
        
        # Cancel any remaining active jobs
        for job in self.active_jobs.values():
            if job.status == JobStatus.RUNNING:
                job.status = JobStatus.CANCELLED
                job.completed_at = datetime.utcnow()
                job.error = "Service shutdown"
        
        self.workers.clear()
        logger.info("Background job service stopped")
    
    async def submit_job(
        self,
        job_type: str,
        function: Callable,
        *args,
        priority: JobPriority = JobPriority.NORMAL,
        max_retries: int = 3,
        retry_delay: float = 5.0,
        timeout: Optional[float] = None,
        scheduled_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> str:
        """
        Submit a background job for execution
        
        Args:
            job_type: Type identifier for the job
            function: Async function to execute
            *args: Positional arguments for the function
            priority: Job priority level
            max_retries: Maximum retry attempts
            retry_delay: Delay between retries in seconds
            timeout: Job execution timeout in seconds
            scheduled_at: Schedule job for future execution
            metadata: Additional job metadata
            **kwargs: Keyword arguments for the function
            
        Returns:
            Job ID for tracking
        """
        try:
            job_id = str(uuid.uuid4())
            
            job = BackgroundJob(
                job_id=job_id,
                job_type=job_type,
                function=function,
                args=args,
                kwargs=kwargs,
                priority=priority,
                max_retries=max_retries,
                retry_delay=retry_delay,
                timeout=timeout,
                scheduled_at=scheduled_at,
                metadata=metadata or {}
            )
            
            # Add to queue
            if self.job_queue.qsize() >= self.max_queue_size:
                raise Exception("Job queue is full")
            
            # Use priority as queue priority (lower number = higher priority)
            await self.job_queue.put((priority.value, datetime.utcnow(), job))
            
            self.metrics["queue_size"] = self.job_queue.qsize()
            
            logger.info(
                "Job submitted",
                job_id=job_id,
                job_type=job_type,
                priority=priority.name,
                scheduled_at=scheduled_at.isoformat() if scheduled_at else None
            )
            
            return job_id
            
        except Exception as e:
            logger.error(
                "Failed to submit job",
                error=str(e),
                job_type=job_type
            )
            raise
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get job status and progress information
        
        Args:
            job_id: Job identifier
            
        Returns:
            Job status dictionary or None if not found
        """
        # Check active jobs first
        if job_id in self.active_jobs:
            job = self.active_jobs[job_id]
        elif job_id in self.completed_jobs:
            job = self.completed_jobs[job_id]
        else:
            return None
        
        return {
            "job_id": job.job_id,
            "job_type": job.job_type,
            "status": job.status,
            "priority": job.priority.name,
            "progress": job.progress,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "retry_count": job.retry_count,
            "max_retries": job.max_retries,
            "error": job.error,
            "metadata": job.metadata
        }
    
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a pending or running job
        
        Args:
            job_id: Job identifier
            
        Returns:
            True if job was cancelled, False if not found or already completed
        """
        try:
            if job_id in self.active_jobs:
                job = self.active_jobs[job_id]
                
                if job.status in [JobStatus.PENDING, JobStatus.RUNNING, JobStatus.RETRYING]:
                    job.status = JobStatus.CANCELLED
                    job.completed_at = datetime.utcnow()
                    job.error = "Cancelled by user"
                    
                    # Move to completed jobs
                    self.completed_jobs[job_id] = job
                    del self.active_jobs[job_id]
                    
                    logger.info("Job cancelled", job_id=job_id)
                    return True
            
            return False
            
        except Exception as e:
            logger.error("Failed to cancel job", job_id=job_id, error=str(e))
            return False
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get job queue statistics"""
        return {
            "queue_size": self.job_queue.qsize(),
            "active_jobs": len(self.active_jobs),
            "completed_jobs": len(self.completed_jobs),
            "running_workers": len([w for w in self.workers if not w.done()]),
            "total_workers": len(self.workers),
            "service_running": self.running,
            "metrics": self.metrics.copy()
        }
    
    def register_job_handler(self, job_type: str, handler: Callable):
        """
        Register a specialized handler for a job type
        
        Args:
            job_type: Job type identifier
            handler: Handler function for preprocessing/postprocessing
        """
        self.job_handlers[job_type] = handler
        logger.info("Job handler registered", job_type=job_type)
    
    def register_cleanup_handler(self, job_type: str, cleanup_handler: Callable):
        """
        Register a cleanup handler for job type
        
        Args:
            job_type: Job type identifier
            cleanup_handler: Cleanup function called after job completion
        """
        self.job_cleanup_handlers[job_type] = cleanup_handler
        logger.info("Cleanup handler registered", job_type=job_type)
    
    async def _worker(self, worker_name: str):
        """Background worker task"""
        logger.info("Worker started", worker_name=worker_name)
        
        try:
            while self.running and not self.shutdown_event.is_set():
                try:
                    # Get job from queue with timeout
                    try:
                        priority, queued_at, job = await asyncio.wait_for(
                            self.job_queue.get(),
                            timeout=1.0
                        )
                        self.metrics["queue_size"] = self.job_queue.qsize()
                    except asyncio.TimeoutError:
                        continue
                    
                    # Check if job should be delayed
                    if job.scheduled_at and datetime.utcnow() < job.scheduled_at:
                        # Put job back in queue
                        await self.job_queue.put((priority, queued_at, job))
                        await asyncio.sleep(1)
                        continue
                    
                    # Execute job
                    await self._execute_job(job, worker_name)
                    
                except asyncio.CancelledError:
                    logger.info("Worker cancelled", worker_name=worker_name)
                    break
                except Exception as e:
                    logger.error(
                        "Worker error",
                        worker_name=worker_name,
                        error=str(e)
                    )
                    await asyncio.sleep(1)  # Brief pause before continuing
        
        finally:
            logger.info("Worker stopped", worker_name=worker_name)
    
    async def _execute_job(self, job: BackgroundJob, worker_name: str):
        """Execute a single job"""
        self.active_jobs[job.job_id] = job
        
        try:
            # Update job status
            job.status = JobStatus.RUNNING
            job.started_at = datetime.utcnow()
            
            # Call pre-execution handler if registered
            if job.job_type in self.job_handlers:
                try:
                    await self.job_handlers[job.job_type](job, "pre_execution")
                except Exception as e:
                    logger.warning(
                        "Pre-execution handler failed",
                        job_id=job.job_id,
                        error=str(e)
                    )
            
            logger.info(
                "Executing job",
                job_id=job.job_id,
                job_type=job.job_type,
                worker=worker_name,
                retry_count=job.retry_count
            )
            
            # Execute the job function
            start_time = datetime.utcnow()
            
            if job.timeout:
                job.result = await asyncio.wait_for(
                    job.function(*job.args, **job.kwargs),
                    timeout=job.timeout
                )
            else:
                job.result = await job.function(*job.args, **job.kwargs)
            
            # Calculate execution time
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Update job status
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            
            # Update metrics
            self.metrics["total_jobs_processed"] += 1
            self.metrics["successful_jobs"] += 1
            self._update_avg_execution_time(execution_time)
            
            logger.info(
                "Job completed successfully",
                job_id=job.job_id,
                job_type=job.job_type,
                execution_time=execution_time,
                worker=worker_name
            )
            
        except asyncio.CancelledError:
            job.status = JobStatus.CANCELLED
            job.completed_at = datetime.utcnow()
            job.error = "Job cancelled"
            logger.info("Job cancelled during execution", job_id=job.job_id)
            
        except asyncio.TimeoutError:
            job.error = f"Job timed out after {job.timeout} seconds"
            await self._handle_job_failure(job, worker_name)
            
        except Exception as e:
            job.error = str(e)
            await self._handle_job_failure(job, worker_name)
            
        finally:
            # Call post-execution handler if registered
            if job.job_type in self.job_handlers:
                try:
                    await self.job_handlers[job.job_type](job, "post_execution")
                except Exception as e:
                    logger.warning(
                        "Post-execution handler failed",
                        job_id=job.job_id,
                        error=str(e)
                    )
            
            # Call cleanup handler if registered
            if job.job_type in self.job_cleanup_handlers:
                try:
                    await self.job_cleanup_handlers[job.job_type](job)
                except Exception as e:
                    logger.warning(
                        "Cleanup handler failed",
                        job_id=job.job_id,
                        error=str(e)
                    )
            
            # Move job to completed jobs
            if job.job_id in self.active_jobs:
                self.completed_jobs[job.job_id] = job
                del self.active_jobs[job.job_id]
            
            # Cleanup old completed jobs (keep only last 1000)
            if len(self.completed_jobs) > 1000:
                oldest_jobs = sorted(
                    self.completed_jobs.values(),
                    key=lambda j: j.completed_at or datetime.min
                )[:100]
                
                for old_job in oldest_jobs:
                    if old_job.job_id in self.completed_jobs:
                        del self.completed_jobs[old_job.job_id]
    
    async def _handle_job_failure(self, job: BackgroundJob, worker_name: str):
        """Handle job failure with retry logic"""
        job.retry_count += 1
        
        logger.error(
            "Job failed",
            job_id=job.job_id,
            job_type=job.job_type,
            error=job.error,
            retry_count=job.retry_count,
            max_retries=job.max_retries,
            worker=worker_name
        )
        
        # Check if we should retry
        if job.retry_count <= job.max_retries:
            job.status = JobStatus.RETRYING
            
            # Calculate retry delay with exponential backoff
            retry_delay = job.retry_delay * (2 ** (job.retry_count - 1))
            retry_delay = min(retry_delay, 300)  # Max 5 minutes
            
            # Schedule retry
            job.scheduled_at = datetime.utcnow() + timedelta(seconds=retry_delay)
            
            # Put job back in queue
            await self.job_queue.put((
                job.priority.value,
                datetime.utcnow(),
                job
            ))
            
            self.metrics["retried_jobs"] += 1
            
            logger.info(
                "Job scheduled for retry",
                job_id=job.job_id,
                retry_count=job.retry_count,
                retry_delay=retry_delay
            )
        else:
            # Max retries exceeded
            job.status = JobStatus.FAILED
            job.completed_at = datetime.utcnow()
            
            self.metrics["total_jobs_processed"] += 1
            self.metrics["failed_jobs"] += 1
            
            logger.error(
                "Job failed permanently",
                job_id=job.job_id,
                job_type=job.job_type,
                final_error=job.error,
                total_retries=job.retry_count
            )
    
    def _update_avg_execution_time(self, execution_time: float):
        """Update average execution time metric"""
        total_successful = self.metrics["successful_jobs"]
        current_avg = self.metrics["avg_execution_time"]
        
        self.metrics["avg_execution_time"] = (
            (current_avg * (total_successful - 1) + execution_time) / total_successful
            if total_successful > 0 else execution_time
        )