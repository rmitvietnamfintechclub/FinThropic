import { API_ROUTES } from "@/config/api-routes";
import { healthDtoSchema, type HealthDto } from "@/contracts/health.dto";
import { getJson } from "@/utils/http";

// Service: knows which route to call and parses what comes back with the shared contract.
export function fetchHealth(deep: boolean): Promise<HealthDto> {
  return getJson(`${API_ROUTES.health}?deep=${deep ? 1 : 0}`, healthDtoSchema);
}
