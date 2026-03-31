import asyncio
import json
import uuid

from fastapi import APIRouter, UploadFile, File, Form, Request, HTTPException

from core.constants import settings
from core.file_validation import validate_file, ValidationError
from core.image_pipeline import process_single_image
from core.job_store import create_job, update_job_progress, set_job_error
from core.rate_limiter import web_limiter, get_client_ip
from models.schemas import UploadResponse

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_images(
    request: Request,
    images: list[UploadFile] = File(..., description="Image files to optimize"),
    resolutions_map: str = Form(
        default="",
        description='JSON object mapping filename to {width, height}, e.g. {"photo.jpg":{"width":1920,"height":1080}}',
    ),
):
    # Rate limit
    client_ip = get_client_ip(request)
    web_limiter.check(client_ip)

    # Validate file count
    if len(images) > settings.MAX_FILES_PER_UPLOAD:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files. Maximum {settings.MAX_FILES_PER_UPLOAD} per upload.",
        )

    if not images:
        raise HTTPException(status_code=400, detail="No files provided.")

    # Parse per-image resolutions map
    parsed_map: dict[str, tuple[int, int]] = {}
    if resolutions_map and resolutions_map.strip():
        try:
            raw = json.loads(resolutions_map)
            if not isinstance(raw, dict):
                raise ValueError("Must be an object")
            for fname, dims in raw.items():
                w = int(dims.get("width", 0))
                h = int(dims.get("height", 0))
                if 1 <= w <= 10000 and 1 <= h <= 10000:
                    parsed_map[fname] = (w, h)
        except (json.JSONDecodeError, ValueError, AttributeError):
            raise HTTPException(
                status_code=400,
                detail="Invalid resolutions_map format. Expected JSON object of {filename: {width, height}}.",
            )

    # Read and validate all files first
    validated_files: list[tuple[bytes, str, str, tuple[int, int] | None]] = []

    for img in images:
        file_bytes = await img.read()
        content_type = img.content_type or "application/octet-stream"
        filename = img.filename or "unknown"

        try:
            pillow_format = validate_file(content_type, file_bytes, filename)
        except ValidationError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Get this file's target resolution (or None for original)
        target = parsed_map.get(filename)
        validated_files.append((file_bytes, filename, pillow_format, target))

    # Create job
    job_id = uuid.uuid4().hex[:12]
    create_job(job_id, total_files=len(validated_files))

    # Process images in background
    asyncio.create_task(
        _process_images_background(job_id, validated_files)
    )

    return UploadResponse(
        job_id=job_id,
        file_count=len(validated_files),
        status="processing",
    )


async def _process_images_background(
    job_id: str,
    files: list[tuple[bytes, str, str, tuple[int, int] | None]],
) -> None:
    """Process all images in background using ProcessPoolExecutor."""
    from main import get_executor

    loop = asyncio.get_event_loop()
    executor = get_executor()

    for file_bytes, filename, pillow_format, target in files:
        try:
            result = await loop.run_in_executor(
                executor,
                process_single_image,
                job_id,
                file_bytes,
                filename,
                pillow_format,
                target,
            )
            update_job_progress(job_id, result)
        except Exception as e:
            set_job_error(job_id, f"Error processing {filename}: {str(e)}")
            return
