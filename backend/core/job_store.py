import time
from dataclasses import dataclass, field

from models.schemas import ImageResult


@dataclass
class Job:
    id: str
    status: str = "processing"  # "processing" | "complete" | "error"
    progress: float = 0.0  # 0-100
    created_at: float = field(default_factory=time.time)
    results: list[ImageResult] = field(default_factory=list)
    total_files: int = 0
    processed_files: int = 0
    error: str | None = None
    resolutions: list[int] = field(default_factory=list)


# In-memory job store
_jobs: dict[str, Job] = {}


def create_job(job_id: str, total_files: int, resolutions: list[int] | None = None) -> Job:
    job = Job(id=job_id, total_files=total_files, resolutions=resolutions or [])
    _jobs[job_id] = job
    return job


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)


def update_job_progress(job_id: str, result: ImageResult) -> None:
    job = _jobs.get(job_id)
    if job is None:
        return
    job.results.append(result)
    job.processed_files += 1
    job.progress = (job.processed_files / job.total_files) * 100
    if job.processed_files >= job.total_files:
        job.status = "complete"
        job.progress = 100.0


def set_job_error(job_id: str, error: str) -> None:
    job = _jobs.get(job_id)
    if job is None:
        return
    job.status = "error"
    job.error = error


def get_all_jobs() -> dict[str, Job]:
    return _jobs


def delete_job(job_id: str) -> None:
    _jobs.pop(job_id, None)
