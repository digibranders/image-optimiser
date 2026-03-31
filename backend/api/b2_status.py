"""Endpoint to check B2 upload status and list stored files for a job."""

from fastapi import APIRouter, HTTPException

from core.b2_storage import _is_configured, _get_client
from core.constants import settings
from core.job_store import get_job

router = APIRouter()


@router.get("/b2-status/{job_id}")
async def b2_status(job_id: str):
    """List all files stored in B2 for a given job."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    if not _is_configured():
        return {
            "configured": False,
            "message": "Backblaze B2 is not configured. Set B2_KEY_ID, B2_APP_KEY, B2_BUCKET_NAME, B2_ENDPOINT in .env",
            "files": [],
        }

    try:
        client = _get_client()
        prefix = f"optimized/{job_id}/"
        response = client.list_objects_v2(
            Bucket=settings.B2_BUCKET_NAME,
            Prefix=prefix,
        )

        files = []
        for obj in response.get("Contents", []):
            key = obj["Key"]
            filename = key.split("/")[-1]
            url = f"{settings.B2_ENDPOINT}/{settings.B2_BUCKET_NAME}/{key}"
            files.append({
                "filename": filename,
                "url": url,
                "size": obj["Size"],
                "last_modified": obj["LastModified"].isoformat(),
            })

        return {
            "configured": True,
            "job_id": job_id,
            "bucket": settings.B2_BUCKET_NAME,
            "file_count": len(files),
            "files": files,
        }
    except Exception as e:
        return {
            "configured": True,
            "error": str(e),
            "files": [],
        }
