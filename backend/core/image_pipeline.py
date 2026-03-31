import os
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

import pillow_avif  # noqa: F401

from core.constants import QUALITY_PRESETS, OUTPUT_FORMATS, settings
from models.schemas import ImageResult, VariantResult


def process_single_image(
    job_id: str,
    file_bytes: bytes,
    original_name: str,
    original_format: str,
    target: tuple[int, int] | None = None,
) -> ImageResult:
    """
    Process a single image: resize to target resolution, convert to multiple formats.
    This runs in a ProcessPoolExecutor (separate process).

    target: (width, height) tuple. If None, uses original dimensions.
    """
    # Create output directories
    job_dir = Path(settings.UPLOAD_DIR) / job_id
    original_dir = job_dir / "original"
    optimized_dir = job_dir / "optimized"
    original_dir.mkdir(parents=True, exist_ok=True)
    optimized_dir.mkdir(parents=True, exist_ok=True)

    # Open and auto-orient the image
    img = Image.open(BytesIO(file_bytes))
    img = ImageOps.exif_transpose(img)

    original_width, original_height = img.size
    original_size = len(file_bytes)

    # Save original for comparison serving
    stem = Path(original_name).stem
    original_path = original_dir / original_name
    with open(original_path, "wb") as f:
        f.write(file_bytes)

    variants: list[VariantResult] = []

    # Determine target dimensions
    if target:
        target_w, target_h = target
    else:
        target_w, target_h = original_width, original_height

    # Resize the image to target dimensions
    if target_w == original_width and target_h == original_height:
        resized = img.copy()
        size_label = "original"
    else:
        resized = img.copy()
        resized.thumbnail((target_w, target_h), Image.LANCZOS)
        size_label = f"{target_w}x{target_h}"

    actual_w, actual_h = resized.size

    # Generate all format variants (AVIF, WebP, JPEG, PNG)
    for fmt in OUTPUT_FORMATS:
        variant = _save_variant(
            resized, optimized_dir, stem, size_label, fmt, actual_w, actual_h, original_size
        )
        if variant:
            variants.append(variant)

    return ImageResult(
        original_name=original_name,
        original_size=original_size,
        original_width=original_width,
        original_height=original_height,
        variants=variants,
    )


def _save_variant(
    img: Image.Image,
    output_dir: Path,
    stem: str,
    size_label: str,
    fmt: str,
    width: int,
    height: int,
    original_size: int,
) -> VariantResult | None:
    """Save a single variant and return its stats."""
    ext_map = {"AVIF": "avif", "WEBP": "webp", "JPEG": "jpg", "PNG": "png"}
    ext = ext_map.get(fmt, "jpg")
    filename = f"{stem}-{size_label}.{ext}"
    filepath = output_dir / filename

    try:
        save_kwargs = dict(QUALITY_PRESETS.get(fmt, {}))

        # Handle mode conversion for formats that don't support alpha
        save_img = img
        if fmt in ("JPEG", "AVIF") and img.mode in ("RGBA", "P", "PA", "LA"):
            save_img = img.convert("RGB")
        elif fmt == "PNG" and img.mode == "P":
            save_img = img.convert("RGBA")

        save_img.save(str(filepath), fmt, **save_kwargs)

        file_size = os.path.getsize(filepath)
        reduction = ((original_size - file_size) / original_size) * 100

        return VariantResult(
            format=fmt.lower(),
            size_label=size_label,
            width=width,
            height=height,
            file_size=file_size,
            reduction_percent=round(reduction, 1),
            filename=filename,
        )
    except Exception:
        return None
