import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/ui/card";
import { HealthBadge } from "@/components/health/HealthBadge";

// Page: only places component packages and shared UI. No logic, no API calls.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center p-4 sm:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">FinThropic</CardTitle>
          <CardDescription>
            Walking skeleton: page, package, hook, service, route, module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HealthBadge />
        </CardContent>
      </Card>
    </main>
  );
}
