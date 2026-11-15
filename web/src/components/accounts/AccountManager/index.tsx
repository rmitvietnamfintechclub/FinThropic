// Package entry: view only. Owner: Frontend 2. PBI-015, PBI-023.
// Admin screens to create and deactivate accounts.
// Add useAccountManager.hook.ts (state and handlers), accountManager.service.ts (routes, via utils/http.ts)
// and sub-components/ here when the first feature needs them. Never import another package.
export function AccountManager() {
  return (
    <section aria-label="AccountManager" className="rounded-lg border border-zinc-200 p-4">
      <h2 className="font-medium">AccountManager</h2>
      <p className="text-sm text-zinc-600">Placeholder. PBI-015, PBI-023.</p>
    </section>
  );
}
