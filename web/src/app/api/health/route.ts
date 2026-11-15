import { withErrorHandler } from "@/server/middlewares/withErrorHandler";
import { healthController } from "@/server/modules/health";

// Route: a thin file. GET /api/health is the liveness check, /api/health?deep=1 also pings the database.
export const GET = withErrorHandler(healthController);
