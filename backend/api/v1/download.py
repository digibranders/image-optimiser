import io
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse, StreamingResponse

from core.constants import settings
from core.api_auth import validate_api_key
from core.job_store import get_job

router = APIRouter()

MIME_TYPES = {
    ".avif": "image/avif",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


@router.get("/download/{job_id}")
async def v1_download(
    job_id: str,
    file: str | None = Query(None, description="Specific file to download. Omit for zip of all."),
    api_key: str = Depends(validate_api_key),
):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    if job.status != "complete":
        raise HTTPException(status_code=400, detail=f"Job is still {job.status}.")

    # If specific file requested
    if file:
        safe_filename = Path(file).name
        if safe_filename != file:
            raise HTTPException(status_code=400, detail="Invalid filename.")

        filepath = Path(settings.UPLOAD_DIR) / job_id / "optimized" / safe_filename
        if not filepath.exists():
            raise HTTPException(status_code=404, detail=f"File '{file}' not found.")

        ext = filepath.suffix.lower()
        media_type = MIME_TYPES.get(ext, "application/octet-stream")
        return FileResponse(path=str(filepath), media_type=media_type, filename=safe_filename)

    # Otherwise, return zip of all
    optimized_dir = Path(settings.UPLOAD_DIR) / job_id / "optimized"
    if not optimized_dir.exists():
        raise HTTPException(status_code=404, detail="No optimized files found.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(optimized_dir.iterdir()):
            if file_path.is_file() and "-original." in file_path.name:
                zf.write(file_path, file_path.name)

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="optimized-{job_id}.zip"'},
    )
