import asyncio
from concurrent.futures import ProcessPoolExecutor
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.cleanup import cleanup_loop
from core.constants import settings

# Import and register pillow-avif-plugin
import pillow_avif  # noqa: F401

from api.upload import router as upload_router
from api.status import router as status_router
from api.download import router as download_router
from api.download_all import router as download_all_router
from api.b2_status import router as b2_status_router
from api.v1.optimize import router as v1_optimize_router
from api.v1.status import router as v1_status_router
from api.v1.download import router as v1_download_router


# Global executor for CPU-bound image processing
executor: ProcessPoolExecutor | None = None


def get_executor() -> ProcessPoolExecutor:
    assert executor is not None, "Executor not initialized"
    return executor


@asynccontextmanager
async def lifespan(app: FastAPI):
    global executor
    # Startup
    executor = ProcessPoolExecutor(max_workers=settings.MAX_WORKERS)

    # Start background cleanup task
    cleanup_task = asyncio.create_task(cleanup_loop())

    yield

    # Shutdown
    cleanup_task.cancel()
    executor.shutdown(wait=False)


app = FastAPI(
    title="Image Optimizer API",
    description="Production-level image optimization service. Upload images, get optimized AVIF/WebP/JPEG variants.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Web UI routes
app.include_router(upload_router, tags=["Web UI"])
app.include_router(status_router, tags=["Web UI"])
app.include_router(download_router, tags=["Web UI"])
app.include_router(download_all_router, tags=["Web UI"])
app.include_router(b2_status_router, tags=["Web UI"])

# Developer API v1
app.include_router(v1_optimize_router, prefix="/api/v1", tags=["Developer API"])
app.include_router(v1_status_router, prefix="/api/v1", tags=["Developer API"])
app.include_router(v1_download_router, prefix="/api/v1", tags=["Developer API"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
