// Package entry: view only. Owner: Frontend 2. PBI-023.
// Admin list of documents: status, reclassify, delete.
// Add useDocumentManager.hook.ts (state and handlers), documentManager.service.ts (routes, via utils/http.ts)
// and sub-components/ here when the first feature needs them. Never import another package.
export function DocumentManager() {
  return (
    <section aria-label="DocumentManager" className="rounded-lg border border-zinc-200 p-4">
      <h2 className="font-medium">DocumentManager</h2>
      <p className="text-sm text-zinc-600">Placeholder. PBI-023.</p>
    </section>
  );
}
