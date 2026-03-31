import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import Request, HTTPException


@dataclass
class RateBucket:
    timestamps: list[float] = field(default_factory=list)


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, RateBucket] = defaultdict(RateBucket)

    def check(self, key: str) -> None:
        """Raise HTTPException 429 if rate limit exceeded."""
        now = time.time()
        bucket = self._buckets[key]

        # Remove timestamps outside the window
        cutoff = now - self.window_seconds
        bucket.timestamps = [t for t in bucket.timestamps if t > cutoff]

        if len(bucket.timestamps) >= self.max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {self.max_requests} requests per {self.window_seconds}s.",
            )

        bucket.timestamps.append(now)


# Global rate limiter instances
from core.constants import settings

web_limiter = RateLimiter(
    max_requests=settings.RATE_LIMIT_REQUESTS,
    window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
)

api_limiter = RateLimiter(
    max_requests=100,
    window_seconds=60,
)


def get_client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For for proxied setups."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"
