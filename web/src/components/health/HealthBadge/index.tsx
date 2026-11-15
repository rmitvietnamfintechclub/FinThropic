"use client";

import { Pill } from "@/common/ui/Pill";
import { StatusLabel } from "./sub-components/StatusLabel";
import { useHealth } from "./useHealth.hook";

// Package entry: view only. State in the hook, parts in sub-components/, never imports another package.
export function HealthBadge() {
  const { health, failed, loading } = useHealth();
  if (loading) return <Pill tone="muted">Checking server…</Pill>;
  if (failed || !health) return <Pill tone="warn">Server not reachable</Pill>;
  return <StatusLabel health={health} />;
}
