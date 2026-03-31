from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MAX_FILE_SIZE_MB: int = 10
    MAX_FILES_PER_UPLOAD: int = 20
    CLEANUP_TTL_SECONDS: int = 3600
    UPLOAD_DIR: str = "uploads"
    RATE_LIMIT_REQUESTS: int = 30
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    API_KEYS: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    MAX_WORKERS: int = 4

    # Backblaze B2 (S3-compatible)
    B2_KEY_ID: str = ""
    B2_APP_KEY: str = ""
    B2_BUCKET_NAME: str = ""
    B2_ENDPOINT: str = ""

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def api_keys_list(self) -> list[str]:
        return [k.strip() for k in self.API_KEYS.split(",") if k.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


# Size presets: kept empty — resolutions now come from user selection
SIZE_PRESETS: dict[str, int] = {}

# Available resolution options the user can choose from
RESOLUTION_OPTIONS: list[int] = [1920, 1280, 1024, 800, 640, 480]

# All output formats to generate for every image
OUTPUT_FORMATS: list[str] = ["AVIF", "WEBP", "JPEG", "PNG"]

# Quality presets per format
QUALITY_PRESETS: dict[str, dict] = {
    "AVIF": {"quality": 65},
    "WEBP": {"quality": 80, "method": 4},
    "JPEG": {"quality": 80, "optimize": True},
    "PNG": {"optimize": True},
}

# Allowed MIME types and their corresponding Pillow formats
ALLOWED_MIME_TYPES: dict[str, str] = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/gif": "GIF",
    "image/tiff": "TIFF",
}

# Magic bytes for file type verification
MAGIC_BYTES: dict[str, list[bytes]] = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
    "image/gif": [b"GIF87a", b"GIF89a"],
    "image/tiff": [b"II\x2a\x00", b"MM\x00\x2a"],
}
