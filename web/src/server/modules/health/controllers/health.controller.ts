import "server-only";
import { toHealthResponseDto } from "../dtos/health.dto";
import type { HealthService } from "../interfaces/health.interface";
import { parseHealthQuery } from "../validators/health.validator";

// Controller: HTTP in, HTTP out. Validates, calls one service, shapes the response.
export function createHealthController(service: HealthService) {
  return async function handleHealth(request: Request): Promise<Response> {
    const options = parseHealthQuery(new URL(request.url));
    const report = await service.check(options);
    return Response.json(toHealthResponseDto(report), {
      status: report.status === "ok" ? 200 : 503,
    });
  };
}
