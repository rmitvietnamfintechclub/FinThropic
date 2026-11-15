# health module

- **Owner:** Project Leader (walking skeleton, PBI-044.7)
- **Does:** Liveness (`GET /api/health`) and readiness (`GET /api/health?deep=1` also pings the database).
- **Owns tables:** none
- **Why it exists:** it is the copy-me example. Every layer is here once: `models/`, `interfaces/`, `repositories/`, `services/` (with a test using a fake repository), `dtos/` (its type is the shared contract in `src/contracts/health.dto.ts`), `validators/`, `controllers/`, `constants/` and the `index.ts` door that builds the controller.
