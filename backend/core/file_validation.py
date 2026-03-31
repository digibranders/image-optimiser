from core.constants import MAGIC_BYTES, ALLOWED_MIME_TYPES, settings


class ValidationError(Exception):
    pass


def validate_file(content_type: str, file_bytes: bytes, filename: str) -> str:
    """
    Validate an uploaded file. Returns the Pillow format string.
    Raises ValidationError if invalid.
    """
    # Check content type
    if content_type not in ALLOWED_MIME_TYPES:
        raise ValidationError(
            f"Unsupported file type: {content_type}. "
            f"Allowed: {', '.join(ALLOWED_MIME_TYPES.keys())}"
        )

    # Check file size
    if len(file_bytes) > settings.max_file_size_bytes:
        raise ValidationError(
            f"File '{filename}' exceeds {settings.MAX_FILE_SIZE_MB}MB limit "
            f"({len(file_bytes) / (1024 * 1024):.1f}MB)"
        )

    # Check magic bytes
    if content_type in MAGIC_BYTES:
        signatures = MAGIC_BYTES[content_type]
        matched = any(file_bytes.startswith(sig) for sig in signatures)
        # Special case for WebP: RIFF....WEBP
        if content_type == "image/webp" and not matched:
            matched = file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"WEBP"
        if not matched:
            raise ValidationError(
                f"File '{filename}' content doesn't match declared type {content_type}. "
                "File may be corrupted or misnamed."
            )

    # Verify Pillow can open it
    from PIL import Image
    from io import BytesIO

    try:
        img = Image.open(BytesIO(file_bytes))
        img.verify()
    except Exception:
        raise ValidationError(
            f"File '{filename}' is not a valid image or is corrupted."
        )

    return ALLOWED_MIME_TYPES[content_type]
