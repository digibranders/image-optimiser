import { useState, useEffect, useRef, useCallback } from "react";
import { getJobStatus } from "../api/client";
import type { JobStatusResponse } from "../types";

interface UseJobPollingReturn {
  jobStatus: JobStatusResponse | null;
  isPolling: boolean;
  error: string | null;
  startPolling: (jobId: string) => void;
  reset: () => void;
}

export function useJobPolling(): UseJobPollingReturn {
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(
    (jobId: string) => {
      setIsPolling(true);
      setError(null);
      setJobStatus(null);

      const poll = async () => {
        try {
          const status = await getJobStatus(jobId);
          setJobStatus(status);

          if (status.status === "complete" || status.status === "error") {
            stopPolling();
            if (status.status === "error") {
              setError(status.error || "Processing failed");
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to get status");
          stopPolling();
        }
      };

      // Poll immediately, then every 1 second
      poll();
      intervalRef.current = setInterval(poll, 1000);
    },
    [stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setJobStatus(null);
    setError(null);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { jobStatus, isPolling, error, startPolling, reset };
}
