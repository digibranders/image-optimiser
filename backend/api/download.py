import asyncio
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from core.constants import settings
from core.job_store import get_job
from core.b2_storage import upload_file as b2_upload_file

router = APIRouter()

# MIME type mapping
MIME_TYPES = {
    ".avif": "image/avif",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


@router.get("/download/{job_id}")
async def download_file(
    job_id: str,
    file: str = Query(..., description="Filename of the variant to download"),
):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    # Sanitize filename — prevent path traversal
    safe_filename = Path(file).name
    if safe_filename != file or ".." in file:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    filepath = Path(settings.UPLOAD_DIR) / job_id / "optimized" / safe_filename
    if not filepath.exists():
        # Also check original directory
        filepath = Path(settings.UPLOAD_DIR) / job_id / "original" / safe_filename
        if not filepath.exists():
            raise HTTPException(status_code=404, detail=f"File '{file}' not found.")

    ext = filepath.suffix.lower()
    media_type = MIME_TYPES.get(ext, "application/octet-stream")

    # Upload to B2 in background (fire and forget — doesn't block the download)
    b2_key = f"optimized/{job_id}/{safe_filename}"
    asyncio.create_task(
        asyncio.to_thread(b2_upload_file, str(filepath), b2_key)
    )

    return FileResponse(
        path=str(filepath),
        media_type=media_type,
        filename=safe_filename,
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )
