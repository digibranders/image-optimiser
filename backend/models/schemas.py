from pydantic import BaseModel


class UploadResponse(BaseModel):
    job_id: str
    file_count: int
    status: str = "processing"


class VariantResult(BaseModel):
    format: str
    size_label: str
    width: int
    height: int
    file_size: int
    reduction_percent: float
    filename: str


class ImageResult(BaseModel):
    original_name: str
    original_size: int
    original_width: int
    original_height: int
    variants: list[VariantResult]


class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # "processing" | "complete" | "error"
    progress: float  # 0-100
    results: list[ImageResult]
    total_original_size: int = 0
    total_optimized_size: int = 0
    total_reduction_percent: float = 0.0
    error: str | None = None


class ErrorResponse(BaseModel):
    detail: str


class V1OptimizeResponse(BaseModel):
    job_id: str
    status: str
    file_count: int
    results: list[ImageResult] | None = None
