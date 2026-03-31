from fastapi import APIRouter, HTTPException, Depends

from core.api_auth import validate_api_key
from core.job_store import get_job
from models.schemas import JobStatusResponse

router = APIRouter()


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_v1_job_status(
    job_id: str,
    api_key: str = Depends(validate_api_key),
):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    total_original = sum(r.original_size for r in job.results)
    total_optimized = 0
    for r in job.results:
        if r.variants:
            best_per_size: dict[str, int] = {}
            for v in r.variants:
                if v.size_label not in best_per_size or v.file_size < best_per_size[v.size_label]:
                    best_per_size[v.size_label] = v.file_size
            total_optimized += min(best_per_size.values()) if best_per_size else r.original_size

    total_reduction = (
        ((total_original - total_optimized) / total_original * 100)
        if total_original > 0
        else 0.0
    )

    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        results=job.results,
        total_original_size=total_original,
        total_optimized_size=total_optimized,
        total_reduction_percent=round(total_reduction, 1),
        error=job.error,
    )
