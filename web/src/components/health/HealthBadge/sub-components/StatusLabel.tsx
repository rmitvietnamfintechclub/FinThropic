import { Pill } from "@/common/ui/Pill";
import type { HealthDto } from "@/contracts/health.dto";

export function StatusLabel({ health }: { health: HealthDto }) {
  return (
    <Pill tone={health.status === "ok" ? "ok" : "warn"}>
      <span aria-hidden>●</span>
      {health.status === "ok" ? "Server is up" : "Server is degraded"}
    </Pill>
  );
}
