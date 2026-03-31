from fastapi import Request, HTTPException

from core.constants import settings


def validate_api_key(request: Request) -> str:
    """Validate X-API-Key header. Returns the key if valid."""
    api_key = request.headers.get("x-api-key")
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing X-API-Key header.",
        )

    valid_keys = settings.api_keys_list
    if not valid_keys:
        raise HTTPException(
            status_code=503,
            detail="API keys not configured on server.",
        )

    if api_key not in valid_keys:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key.",
        )

    return api_key
