import asyncio
import io
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from core.constants import settings
from core.job_store import get_job
from core.b2_storage import upload_job_optimized_files

router = APIRouter()


@router.get("/download-all/{job_id}")
async def download_all(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    if job.status != "complete":
        raise HTTPException(
            status_code=400,
            detail=f"Job is still {job.status}. Wait for completion.",
        )

    optimized_dir = Path(settings.UPLOAD_DIR) / job_id / "optimized"
    if not optimized_dir.exists():
        raise HTTPException(status_code=404, detail="No optimized files found.")

    # Build ZIP — organized by image name
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for result in job.results:
            stem = Path(result.original_name).stem
            size_labels = set(v.size_label for v in result.variants)
            has_multiple_sizes = len(size_labels) > 1

            for variant in result.variants:
                file_path = optimized_dir / variant.filename
                if file_path.exists():
                    if has_multiple_sizes:
                        arc_name = f"{stem}/{variant.size_label}/{variant.filename}"
                    else:
                        arc_name = f"{stem}/{variant.filename}"
                    zf.write(file_path, arc_name)

    zip_buffer.seek(0)
    zip_filename = f"optimized-{job_id}.zip"

    # Upload all optimized files to B2 in background (fire and forget)
    asyncio.create_task(
        asyncio.to_thread(upload_job_optimized_files, job_id, str(optimized_dir))
    )

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_filename}"',
        },
    )
