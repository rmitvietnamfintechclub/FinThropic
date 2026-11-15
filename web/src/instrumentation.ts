// Runs once when the server starts. If a required variable is missing, the server refuses to start.
export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return; // CI build has no secrets
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("@/server/config/env");
    getEnv();
  }
}
