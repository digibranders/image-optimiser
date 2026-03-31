import asyncio
import uuid

from fastapi import APIRouter, UploadFile, File, Request, Depends, HTTPException

from core.constants import settings
from core.file_validation import validate_file, ValidationError
from core.image_pipeline import process_single_image
from core.job_store import create_job, update_job_progress, set_job_error, get_job
from core.rate_limiter import api_limiter
from core.api_auth import validate_api_key
from models.schemas import V1OptimizeResponse

router = APIRouter()


@router.post("/optimize", response_model=V1OptimizeResponse)
async def optimize_images(
    request: Request,
    images: list[UploadFile] = File(...),
    api_key: str = Depends(validate_api_key),
):
    # Rate limit by API key
    api_limiter.check(f"apikey:{api_key}")

    if len(images) > settings.MAX_FILES_PER_UPLOAD:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files. Maximum {settings.MAX_FILES_PER_UPLOAD}.",
        )

    # Read and validate
    validated_files: list[tuple[bytes, str, str]] = []
    for img in images:
        file_bytes = await img.read()
        content_type = img.content_type or "application/octet-stream"
        filename = img.filename or "unknown"

        try:
            pillow_format = validate_file(content_type, file_bytes, filename)
        except ValidationError as e:
            raise HTTPException(status_code=400, detail=str(e))

        validated_files.append((file_bytes, filename, pillow_format))

    job_id = uuid.uuid4().hex[:12]
    create_job(job_id, total_files=len(validated_files))

    # For single image, process synchronously and return results
    if len(validated_files) == 1:
        file_bytes, filename, pillow_format = validated_files[0]
        from main import get_executor

        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(
                get_executor(),
                process_single_image,
                job_id,
                file_bytes,
                filename,
                pillow_format,
            )
            update_job_progress(job_id, result)
        except Exception as e:
            set_job_error(job_id, str(e))
            raise HTTPException(status_code=500, detail=f"Processing failed: {e}")

        job = get_job(job_id)
        return V1OptimizeResponse(
            job_id=job_id,
            status="complete",
            file_count=1,
            results=job.results if job else [],
        )

    # For bulk, process async and return job_id for polling
    asyncio.create_task(_process_bulk(job_id, validated_files))

    return V1OptimizeResponse(
        job_id=job_id,
        status="processing",
        file_count=len(validated_files),
    )


async def _process_bulk(
    job_id: str,
    files: list[tuple[bytes, str, str]],
) -> None:
    from main import get_executor

    loop = asyncio.get_event_loop()
    executor = get_executor()

    for file_bytes, filename, pillow_format in files:
        try:
            result = await loop.run_in_executor(
                executor, process_single_image, job_id, file_bytes, filename, pillow_format
            )
            update_job_progress(job_id, result)
        except Exception as e:
            set_job_error(job_id, f"Error processing {filename}: {e}")
            return
