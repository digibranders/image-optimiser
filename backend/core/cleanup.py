import asyncio
import shutil
import time
from pathlib import Path

from core.constants import settings
from core.job_store import get_all_jobs, delete_job


async def cleanup_loop() -> None:
    """Background task that removes expired jobs and their files."""
    while True:
        await asyncio.sleep(600)  # Run every 10 minutes
        try:
            _cleanup_expired_jobs()
        except Exception:
            pass  # Don't let cleanup errors crash the background task


def _cleanup_expired_jobs() -> None:
    now = time.time()
    jobs = get_all_jobs()
    expired_ids = [
        job_id
        for job_id, job in jobs.items()
        if now - job.created_at > settings.CLEANUP_TTL_SECONDS
    ]

    for job_id in expired_ids:
        # Remove files from disk
        job_dir = Path(settings.UPLOAD_DIR) / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)
        # Remove from memory
        delete_job(job_id)
