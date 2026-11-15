"use client";

import { useEffect, useState } from "react";
import type { HealthDto } from "@/contracts/health.dto";
import { fetchHealth } from "./health.service";

// Hook: state and effects for this package. Calls the service, never fetch directly.
export function useHealth(deep = false) {
  const [health, setHealth] = useState<HealthDto | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchHealth(deep)
      .then((value) => !cancelled && setHealth(value))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [deep]);

  return { health, failed, loading: health === null && !failed };
}
