"""
Job scheduler for automated billing tasks
"""
import asyncio
import structlog
from datetime import datetime, timedelta
from typing import Dict, Any, List, Callable
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.tasks.billing_tasks import (
    generate_monthly_statements_task,
    daily_billing_updates_task,
    billing_reminders_task
)
from app.tasks.commission_tasks import (
    initialize_default_rate_tiers_task,
    update_commission_rates_task
)
from app.tasks.rating_tasks import (
    calculate_all_supplier_ratings_task,
    update_rating_discounts_task
)

logger = structlog.get_logger()


class BillingScheduler:
    """
    Automated task scheduler for billing operations
    """
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.running_jobs = set()
        self.job_history = []
        
    async def start(self):
        """
        Start the scheduler and register all billing jobs
        """
        try:
            logger.info("Starting billing scheduler")
            
            # Register all scheduled jobs
            await self._register_jobs()
            
            # Start the scheduler
            self.scheduler.start()
            
            logger.info("Billing scheduler started successfully")
            
        except Exception as e:
            logger.error("Failed to start billing scheduler", error=str(e))
            raise
    
    async def stop(self):
        """
        Stop the scheduler gracefully
        """
        try:
            logger.info("Stopping billing scheduler")
            self.scheduler.shutdown(wait=True)
            logger.info("Billing scheduler stopped")
            
        except Exception as e:
            logger.error("Failed to stop billing scheduler", error=str(e))
    
    async def _register_jobs(self):
        """
        Register all scheduled billing jobs
        """
        try:
            # Daily jobs
            self._add_daily_jobs()
            
            # Weekly jobs
            self._add_weekly_jobs()
            
            # Monthly jobs
            self._add_monthly_jobs()
            
            # Hourly jobs
            self._add_hourly_jobs()
            
            # One-time initialization jobs
            self._add_initialization_jobs()
            
            logger.info("All billing jobs registered successfully")
            
        except Exception as e:
            logger.error("Failed to register billing jobs", error=str(e))
            raise
    
    def _add_daily_jobs(self):
        """
        Add daily scheduled jobs
        """
        # Daily billing updates at 2:00 AM
        self.scheduler.add_job(
            func=self._run_with_logging,
            args=[daily_billing_updates_task, "daily_billing_updates"],
            trigger=CronTrigger(hour=2, minute=0),
            id="daily_billing_updates",
            name="Daily Billing Updates",
            replace_existing=True
        )
        
        # Daily commission rate updates at 3:00 AM
        self.scheduler.add_job(
            func=self._run_with_logging,
            args=[update_commission_rates_task, "commission_rate_updates"],
            trigger=CronTrigger(hour=3, minute=0),
            id="commission_rate_updates",
            name="Daily Commission Rate Updates",
            replace_existing=True
        )
        
        # Daily billing reminders at 9:00 AM
        self.scheduler.add_job(
            func=self._run_with_logging,
            args=[lambda: billing_reminders_task(7), "billing_reminders"],
            trigger=CronTrigger(hour=9, minute=0),
            id="billing_reminders",
            name="Daily Billing Reminders",
            replace_existing=True
        )
        
        logger.info("Daily jobs registered")
    
    def _add_weekly_jobs(self):
        """
        Add weekly scheduled jobs
        """
        # Weekly supplier rating calculations on Mondays at 1:00 AM
        self.scheduler.add_job(
            func=self._run_with_logging,
            args=[calculate_all_supplier_ratings_task, "weekly_rating_calculation"],
            trigger=CronTrigger(day_of_week='mon', hour=1, minute=0),
            id="weekly_rating_calculation",
            name="Weekly Supplier Rating Calculation",
            replace_existing=True
        )
        
        # Weekly rating-based discount updates on Mondays at 2:30 AM
        self.scheduler.add_job(
            func=self._run_with_logging,
            args=[update_rating_discounts_task, "weekly_discount_updates"],
            trigger=CronTrigger(day_of_week='mon', hour=2, minute=30),
            id="weekly_discount_updates",
            name="Weekly Rating Discount Updates",
            replace_existing=True
        )
        
        logger.info("Weekly jobs registered")
    
    def _add_monthly_jobs(self):
        """
        Add monthly scheduled jobs
        """
        # Monthly statement generation on the 1st at 4:00 AM
        self.scheduler.add_job(
            func=self._run_with_logging,
            args=[generate_monthly_statements_task, "monthly_statement_generation"],
            trigger=CronTrigger(day=1, hour=4, minute=0),
            id="monthly_statement_generation",
            name="Monthly Statement Generation",
            replace_existing=True
        )
        
        # Monthly comprehensive rating calculation on the 1st at 5:00 AM
        self.scheduler.add_job(
            func=self._run_with_logging,
            args=[lambda: calculate_all_supplier_ratings_task(None), "monthly_rating_calculation"],
            trigger=CronTrigger(day=1, hour=5, minute=0),
            id="monthly_rating_calculation",
            name="Monthly Comprehensive Rating Calculation",
            replace_existing=True
        )
        
        logger.info("Monthly jobs registered")
    
    def _add_hourly_jobs(self):
        """
        Add hourly scheduled jobs for monitoring
        """
        # Health check and cleanup every hour
        self.scheduler.add_job(
            func=self._health_check_and_cleanup,
            trigger=IntervalTrigger(hours=1),
            id="hourly_health_check",
            name="Hourly Health Check and Cleanup",
            replace_existing=True
        )
        
        logger.info("Hourly jobs registered")
    
    def _add_initialization_jobs(self):
        """
        Add one-time initialization jobs
        """
        # Initialize default rate tiers if not exists
        self.scheduler.add_job(
            func=self._run_with_logging,
            args=[initialize_default_rate_tiers_task, "initialize_rate_tiers"],
            trigger='date',
            run_date=datetime.now() + timedelta(seconds=30),
            id="initialize_rate_tiers",
            name="Initialize Default Rate Tiers",
            replace_existing=True
        )
        
        logger.info("Initialization jobs registered")
    
    async def _run_with_logging(self, task_func: Callable, task_name: str, *args, **kwargs):
        """
        Run a task with comprehensive logging and error handling
        """
        job_id = f"{task_name}_{int(datetime.now().timestamp())}"
        
        try:
            if task_name in self.running_jobs:
                logger.warning("Task already running, skipping", task=task_name)
                return
            
            self.running_jobs.add(task_name)
            start_time = datetime.now()
            
            logger.info("Starting scheduled task", 
                       task=task_name, 
                       job_id=job_id,
                       start_time=start_time.isoformat())
            
            # Execute the task
            if asyncio.iscoroutinefunction(task_func):
                result = await task_func(*args, **kwargs)
            else:
                result = task_func(*args, **kwargs)
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Log successful completion
            logger.info("Scheduled task completed successfully",
                       task=task_name,
                       job_id=job_id,
                       duration_seconds=duration,
                       result=result)
            
            # Store job history
            self.job_history.append({
                "job_id": job_id,
                "task_name": task_name,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration,
                "status": "success",
                "result": result
            })
            
        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            logger.error("Scheduled task failed",
                        task=task_name,
                        job_id=job_id,
                        duration_seconds=duration,
                        error=str(e))
            
            # Store job history with error
            self.job_history.append({
                "job_id": job_id,
                "task_name": task_name,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": duration,
                "status": "failed",
                "error": str(e)
            })
            
        finally:
            self.running_jobs.discard(task_name)
            
            # Keep only last 100 job records
            if len(self.job_history) > 100:
                self.job_history = self.job_history[-100:]
    
    async def _health_check_and_cleanup(self):
        """
        Perform health checks and cleanup tasks
        """
        try:
            logger.info("Running hourly health check and cleanup")
            
            # Check scheduler health
            scheduler_health = {
                "running_jobs": list(self.running_jobs),
                "scheduled_jobs": len(self.scheduler.get_jobs()),
                "last_job_count": len(self.job_history)
            }
            
            logger.info("Scheduler health check", **scheduler_health)
            
            # Cleanup old job history (keep last 50 records)
            if len(self.job_history) > 50:
                removed_count = len(self.job_history) - 50
                self.job_history = self.job_history[-50:]
                logger.info("Cleaned up old job history", removed_count=removed_count)
            
        except Exception as e:
            logger.error("Health check and cleanup failed", error=str(e))
    
    def get_job_status(self) -> Dict[str, Any]:
        """
        Get current job status and statistics
        """
        try:
            jobs = self.scheduler.get_jobs()
            
            job_info = []
            for job in jobs:
                job_info.append({
                    "id": job.id,
                    "name": job.name,
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                    "trigger": str(job.trigger)
                })
            
            # Calculate job statistics
            recent_jobs = [job for job in self.job_history if 
                          datetime.fromisoformat(job["start_time"]) > datetime.now() - timedelta(hours=24)]
            
            success_count = len([job for job in recent_jobs if job["status"] == "success"])
            failed_count = len([job for job in recent_jobs if job["status"] == "failed"])
            
            return {
                "scheduler_running": self.scheduler.running,
                "active_jobs": job_info,
                "running_jobs": list(self.running_jobs),
                "job_statistics": {
                    "total_jobs_24h": len(recent_jobs),
                    "successful_jobs_24h": success_count,
                    "failed_jobs_24h": failed_count,
                    "success_rate_24h": (success_count / len(recent_jobs) * 100) if recent_jobs else 0
                },
                "recent_job_history": self.job_history[-10:],  # Last 10 jobs
                "status_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error("Failed to get job status", error=str(e))
            return {"error": str(e)}
    
    async def trigger_job_manually(self, job_id: str) -> Dict[str, Any]:
        """
        Manually trigger a scheduled job
        """
        try:
            job = self.scheduler.get_job(job_id)
            if not job:
                return {"status": "error", "message": f"Job {job_id} not found"}
            
            logger.info("Manually triggering job", job_id=job_id)
            
            # Trigger the job
            job.modify(next_run_time=datetime.now())
            
            return {
                "status": "success",
                "message": f"Job {job_id} triggered successfully",
                "triggered_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error("Failed to trigger job manually", job_id=job_id, error=str(e))
            return {"status": "error", "message": str(e)}


# Global scheduler instance
billing_scheduler = BillingScheduler()