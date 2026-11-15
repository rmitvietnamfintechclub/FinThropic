import { HealthBadge } from "@/components/health/HealthBadge";

// Page: only places component packages. No logic, no API calls.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">FinThropic</h1>
      <p className="text-zinc-600">
        Walking skeleton: page, package, hook, service, route, module.
      </p>
      <HealthBadge />
    </main>
  );
}
