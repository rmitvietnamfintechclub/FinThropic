// Package entry: view only. Owner: Frontend 1. PBI-005, PBI-011, PBI-019, PBI-028, PBI-029.
// Question box, streamed answer, citation chips, history.
// Add useChatWindow.hook.ts (state and handlers), chatWindow.service.ts (routes, via utils/http.ts)
// and sub-components/ here when the first feature needs them. Never import another package.
export function ChatWindow() {
  return (
    <section aria-label="ChatWindow" className="rounded-lg border border-zinc-200 p-4">
      <h2 className="font-medium">ChatWindow</h2>
      <p className="text-sm text-zinc-600">
        Placeholder. PBI-005, PBI-011, PBI-019, PBI-028, PBI-029.
      </p>
    </section>
  );
}
