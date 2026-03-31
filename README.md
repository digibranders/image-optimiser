# Image Optimizer

Internal developer tool for compressing and converting images before deploying them to websites. Upload images, pick a target resolution per image, and download optimized versions in **AVIF, WebP, JPEG, and PNG** — all from a single interface. Optimized files are automatically backed up to **Backblaze B2** for CDN access.

---

## Why This Exists

Heavy images slow down websites. Instead of manually resizing and converting each image with different tools, this tool does it all in one step:

1. Drop your images in
2. Pick a resolution for each (or keep original size)
3. Get 4 optimized formats back, ready for production
4. Files are auto-stored in Backblaze B2 on download

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Tailwind CSS 4 + Vite 8 |
| **Backend** | Python 3.12 + FastAPI + Pillow + pillow-avif-plugin |
| **Storage** | Backblaze B2 (S3-compatible) via boto3 |
| **Package Manager** | npm (frontend), uv (backend) |
| **Deployment** | Docker Compose (optional) |

---

## Project Structure

```
image-optimizer/
├── backend/
│   ├── api/
│   │   ├── upload.py          # Main upload endpoint
│   │   ├── status.py          # Job polling endpoint
│   │   ├── download.py        # File download + B2 upload
│   │   ├── download_all.py    # ZIP download + B2 batch upload
│   │   ├── b2_status.py       # B2 storage status endpoint
│   │   └── v1/
│   │       └── optimize.py    # Developer API (API key auth)
│   ├── core/
│   │   ├── image_pipeline.py  # Resize + format conversion logic
│   │   ├── constants.py       # Settings, quality presets, formats
│   │   ├── b2_storage.py      # Backblaze B2 upload service
│   │   ├── job_store.py       # In-memory job state
│   │   ├── file_validation.py # MIME, magic bytes, Pillow checks
│   │   ├── rate_limiter.py    # IP + API key rate limiting
│   │   └── api_auth.py        # API key validation
│   ├── models/
│   │   └── schemas.py         # Pydantic request/response models
│   ├── main.py                # FastAPI app entrypoint
│   ├── .env                   # Environment config (not committed)
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main app with staging flow
│   │   ├── components/
│   │   │   ├── UploadZone.tsx       # Drag & drop upload area
│   │   │   ├── StagedImageCard.tsx  # Per-image resolution picker
│   │   │   ├── ResolutionSelector.tsx # Resolution presets + custom
│   │   │   ├── ProgressBar.tsx      # Smooth upload/processing bar
│   │   │   ├── ResultsGrid.tsx      # Optimized results display
│   │   │   ├── ImageCard.tsx        # Single result card + comparison
│   │   │   ├── StatsBar.tsx         # Summary stats + download ZIP
│   │   │   └── FolderTree.tsx       # Output file tree sidebar
│   │   ├── hooks/
│   │   │   ├── useUpload.ts         # XHR upload with progress
│   │   │   └── useJobPolling.ts     # 1-second status polling
│   │   ├── api/
│   │   │   └── client.ts            # API call functions
│   │   └── types/
│   │       └── index.ts             # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml
```

---

## Setup (Local Development)

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.12+
- **uv** (Python package manager) — install: `pip install uv` or see [docs.astral.sh/uv](https://docs.astral.sh/uv/)

### 1. Clone and install

```bash
cd image-optimizer

# Backend
cd backend
uv sync
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 2. Configure environment

Create/edit `backend/.env`:

```env
# Core settings
MAX_FILE_SIZE_MB=10
MAX_FILES_PER_UPLOAD=20
CLEANUP_TTL_SECONDS=3600
UPLOAD_DIR=uploads
RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW_SECONDS=60
API_KEYS=dev-key-1,dev-key-2
ALLOWED_ORIGINS=http://localhost:5173
MAX_WORKERS=4

# Backblaze B2 — optimized images are uploaded here on download
B2_KEY_ID=your-b2-key-id
B2_APP_KEY=your-b2-application-key
B2_BUCKET_NAME=your-bucket-name
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
```

> **B2 is optional.** If the B2 variables are empty or set to placeholder values, the tool works normally — images just won't be uploaded to cloud storage.

### 3. Start the backend

```bash
cd backend
uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be live at **http://localhost:8000**.

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

The UI will be live at **http://localhost:5173**. Vite proxies all API calls to the backend automatically.

### 5. Open and use

Go to **http://localhost:5173** in your browser.

---

## Setup (Docker)

```bash
cd image-optimizer
docker compose up --build
```

- Frontend: **http://localhost:3000**
- Backend API: **http://localhost:8000**

---

## How It Works

### User Flow

```
Upload images  →  Pick resolution per image  →  Click Optimize  →  Download results
                                                                     ↓
                                                              Auto-upload to B2
```

**Step 1 — Upload**
Drag and drop images (JPEG, PNG, WebP, GIF, TIFF) into the upload zone. Up to 20 files at once, max 10 MB each.

**Step 2 — Configure**
Each image appears as a card with its own resolution picker. Choose from:

| Option | Resolution |
|--------|-----------|
| **Original** | Keep the image's native dimensions, just compress |
| **1920 x 1080** | Full HD |
| **1200 x 800** | Standard web |
| **300 x 300** | Icon / avatar / thumbnail |
| **Custom** | Enter any width x height |

You can also click **"Apply to all unset"** to quickly assign the same resolution to every image that doesn't have one yet. Add more images anytime with the **"+ Add more"** button.

**Step 3 — Optimize**
Click the **Optimize** button. The tool uploads your images to the backend and processes them:

1. **Resize** — scales each image to its chosen resolution using Lanczos resampling
2. **Convert** — generates 4 format variants per image:
   - **AVIF** (quality 65) — best compression, modern browsers
   - **WebP** (quality 80) — great compression, 97% browser support
   - **JPEG** (quality 80, optimized) — universal fallback
   - **PNG** (optimized) — lossless, good for graphics with transparency

**Step 4 — Download**
View results with before/after comparison slider. Download individual formats or grab everything as a ZIP.

When you download (single file or ZIP), the optimized files are **automatically uploaded to Backblaze B2** in the background. The download is not blocked — B2 upload happens asynchronously.

### Processing Pipeline (Backend)

```
Upload → Validate (MIME + magic bytes + Pillow) → Create job
  → Background ProcessPoolExecutor:
     For each image:
       1. Open with Pillow, auto-orient EXIF
       2. Resize to target (width × height) using thumbnail() + LANCZOS
       3. Convert to AVIF, WebP, JPEG, PNG with quality presets
       4. Save to uploads/{job_id}/optimized/
       5. Update job progress
  → Poll /status/{job_id} every 1 second until complete
  → On download → async upload to Backblaze B2 (fire-and-forget)
```

### Backblaze B2 Storage

When B2 is configured, optimized files are uploaded to your bucket when the user downloads them:

- **Single file download** (`GET /download/{job_id}?file=...`) — uploads that specific file to B2
- **ZIP download** (`GET /download-all/{job_id}`) — uploads ALL optimized files for the job to B2

Files are stored under the key pattern: `optimized/{job_id}/{filename}`

**Check B2 status** for a job:
```bash
curl http://localhost:8000/b2-status/{job_id}
```

Returns a list of all files stored in B2 for that job with their URLs and sizes.

### File Validation

Every uploaded file goes through 3 checks:

1. **MIME type** — must be an image type (image/jpeg, image/png, etc.)
2. **Magic bytes** — file header bytes match expected format signature
3. **Pillow verify** — Pillow successfully opens and validates the image

---

## Developer API

For programmatic access, use the `/api/v1/optimize` endpoint with an API key.

### Set API keys

Add to `backend/.env`:

```env
API_KEYS=your-key-1,your-key-2
```

### Usage

```bash
curl -X POST http://localhost:8000/api/v1/optimize \
  -H "X-API-Key: your-key-1" \
  -F "images=@photo.jpg"
```

Returns optimized variants with download URLs.

---

## Configuration

All settings are configurable via environment variables or a `.env` file in `backend/`:

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_FILE_SIZE_MB` | 10 | Max file size per image |
| `MAX_FILES_PER_UPLOAD` | 20 | Max images per upload |
| `CLEANUP_TTL_SECONDS` | 3600 | Auto-delete processed files after (seconds) |
| `UPLOAD_DIR` | uploads | Directory for temporary file storage |
| `RATE_LIMIT_REQUESTS` | 30 | Max requests per window (web UI) |
| `RATE_LIMIT_WINDOW_SECONDS` | 60 | Rate limit window duration |
| `API_KEYS` | (empty) | Comma-separated API keys for /api/v1/ |
| `ALLOWED_ORIGINS` | http://localhost:5173 | CORS allowed origins |
| `MAX_WORKERS` | 4 | ProcessPoolExecutor worker count |
| `B2_KEY_ID` | (empty) | Backblaze B2 application key ID |
| `B2_APP_KEY` | (empty) | Backblaze B2 application key |
| `B2_BUCKET_NAME` | (empty) | B2 bucket name for storing optimized images |
| `B2_ENDPOINT` | (empty) | B2 S3-compatible endpoint URL |

---

## Quality Presets

| Format | Settings | Typical Reduction |
|--------|----------|------------------|
| AVIF | quality: 65 | 70-90% |
| WebP | quality: 80, method: 4 | 50-80% |
| JPEG | quality: 80, optimize: true | 30-60% |
| PNG | optimize: true | 10-30% |

---

## Backblaze B2 Setup Guide

1. **Create a B2 bucket** at [backblaze.com](https://www.backblaze.com/cloud-storage)
   - Choose **Public** if you want direct CDN URLs, or **Private** for signed URLs
   - Note the bucket name

2. **Create an application key**
   - Go to App Keys in your B2 dashboard
   - Create a new key with read/write access to your bucket
   - Note the `keyID` and `applicationKey`

3. **Find your endpoint**
   - The endpoint depends on your bucket region
   - Format: `https://s3.{region}.backblazeb2.com`
   - Example: `https://s3.us-west-004.backblazeb2.com`

4. **Add to `.env`**
   ```env
   B2_KEY_ID=004abc123def456
   B2_APP_KEY=K004xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   B2_BUCKET_NAME=my-optimized-images
   B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
   ```

5. **Test** — upload and download an image, then check:
   ```bash
   curl http://localhost:8000/b2-status/{job_id}
   ```

---

## Future Scope

- Public-facing hosted version with user accounts
- Batch URL scraper (paste a website URL, optimize all its images)
- CDN integration (Cloudflare R2, CloudFront) for direct delivery
- Webhook notifications on completion
- Custom quality slider per format
