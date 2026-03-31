"""
Backblaze B2 storage integration (S3-compatible API).

Uploads optimized images to B2 when the user downloads them.
Returns public/signed URLs for CDN access.
"""

import logging
from pathlib import Path

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from core.constants import settings

logger = logging.getLogger(__name__)

# MIME type mapping
MIME_TYPES = {
    ".avif": "image/avif",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".zip": "application/zip",
}


def _is_configured() -> bool:
    """Check if B2 credentials are set."""
    return bool(
        settings.B2_KEY_ID
        and settings.B2_APP_KEY
        and settings.B2_BUCKET_NAME
        and settings.B2_ENDPOINT
        and settings.B2_KEY_ID != "your-key-id-here"
    )


def _get_client():
    """Create a boto3 S3 client for Backblaze B2."""
    from botocore.client import Config
    import urllib.parse
    
    region_name = "us-west-004" # Default fallback
    if settings.B2_ENDPOINT:
        # Extract region from endpoint (e.g. https://s3.us-west-004.backblazeb2.com -> us-west-004)
        parsed = urllib.parse.urlparse(settings.B2_ENDPOINT)
        parts = parsed.netloc.split('.')
        if len(parts) >= 2 and parts[0] == 's3':
            region_name = parts[1]

    return boto3.client(
        "s3",
        endpoint_url=settings.B2_ENDPOINT,
        aws_access_key_id=settings.B2_KEY_ID,
        aws_secret_access_key=settings.B2_APP_KEY,
        region_name=region_name,
        config=Config(signature_version='s3v4'),
    )


def upload_file(local_path: str | Path, b2_key: str) -> str | None:
    """
    Upload a single file to B2.

    Args:
        local_path: Absolute path to the local file.
        b2_key: The object key in the bucket (e.g. "jobs/abc123/optimized/image-original.avif").

    Returns:
        The public URL if successful, None otherwise.
    """
    if not _is_configured():
        logger.debug("B2 not configured — skipping upload.")
        return None

    local_path = Path(local_path)
    if not local_path.exists():
        logger.warning("File not found for B2 upload: %s", local_path)
        return None

    ext = local_path.suffix.lower()
    content_type = MIME_TYPES.get(ext, "application/octet-stream")

    try:
        client = _get_client()
        client.upload_file(
            str(local_path),
            settings.B2_BUCKET_NAME,
            b2_key,
            ExtraArgs={"ContentType": content_type},
        )
        url = f"{settings.B2_ENDPOINT}/{settings.B2_BUCKET_NAME}/{b2_key}"
        logger.info("Uploaded to B2: %s", url)
        return url
    except (ClientError, NoCredentialsError) as e:
        logger.error("B2 upload failed for %s: %s", b2_key, e)
        return None


def upload_bytes(data: bytes, b2_key: str, content_type: str = "application/octet-stream") -> str | None:
    """
    Upload raw bytes to B2.

    Args:
        data: File bytes.
        b2_key: The object key in the bucket.
        content_type: MIME type.

    Returns:
        The public URL if successful, None otherwise.
    """
    if not _is_configured():
        logger.debug("B2 not configured — skipping upload.")
        return None

    try:
        import io
        client = _get_client()
        client.upload_fileobj(
            io.BytesIO(data),
            settings.B2_BUCKET_NAME,
            b2_key,
            ExtraArgs={"ContentType": content_type},
        )
        url = f"{settings.B2_ENDPOINT}/{settings.B2_BUCKET_NAME}/{b2_key}"
        logger.info("Uploaded to B2: %s", url)
        return url
    except (ClientError, NoCredentialsError) as e:
        logger.error("B2 upload failed for %s: %s", b2_key, e)
        return None


def upload_job_optimized_files(job_id: str, optimized_dir: str | Path) -> dict[str, str]:
    """
    Upload all optimized files in a job directory to B2.

    Returns:
        Dict of {filename: b2_url} for all successfully uploaded files.
    """
    if not _is_configured():
        return {}

    optimized_dir = Path(optimized_dir)
    if not optimized_dir.exists():
        return {}

    urls: dict[str, str] = {}
    for filepath in optimized_dir.iterdir():
        if filepath.is_file():
            b2_key = f"optimized/{job_id}/{filepath.name}"
            url = upload_file(filepath, b2_key)
            if url:
                urls[filepath.name] = url

    return urls
