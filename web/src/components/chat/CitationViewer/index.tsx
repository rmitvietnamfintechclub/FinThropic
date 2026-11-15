// Package entry: view only. Owner: Frontend 1. PBI-019.
// Opens the cited page, section, or sheet and row; shows "unavailable" without a name when access is refused.
// Add useCitationViewer.hook.ts (state and handlers), citationViewer.service.ts (routes, via utils/http.ts)
// and sub-components/ here when the first feature needs them. Never import another package.
export function CitationViewer() {
  return (
    <section aria-label="CitationViewer" className="rounded-lg border border-zinc-200 p-4">
      <h2 className="font-medium">CitationViewer</h2>
      <p className="text-sm text-zinc-600">Placeholder. PBI-019.</p>
    </section>
  );
}
