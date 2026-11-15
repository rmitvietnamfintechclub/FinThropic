// Package entry: view only. Owner: Frontend 2. PBI-021, PBI-023.
// Admin batch upload with per-file status and retry.
// Add useUploadBatch.hook.ts (state and handlers), uploadBatch.service.ts (routes, via utils/http.ts)
// and sub-components/ here when the first feature needs them. Never import another package.
export function UploadBatch() {
  return (
    <section aria-label="UploadBatch" className="rounded-lg border border-zinc-200 p-4">
      <h2 className="font-medium">UploadBatch</h2>
      <p className="text-sm text-zinc-600">Placeholder. PBI-021, PBI-023.</p>
    </section>
  );
}
