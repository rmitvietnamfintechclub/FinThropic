// Package entry: view only. Owner: Frontend 2. PBI-022.
// Admin list of audit events.
// Add useAuditLog.hook.ts (state and handlers), auditLog.service.ts (routes, via utils/http.ts)
// and sub-components/ here when the first feature needs them. Never import another package.
export function AuditLog() {
  return (
    <section aria-label="AuditLog" className="rounded-lg border border-zinc-200 p-4">
      <h2 className="font-medium">AuditLog</h2>
      <p className="text-sm text-zinc-600">Placeholder. PBI-022.</p>
    </section>
  );
}
