# admin module

- **Owner:** Backend 2
- **Does:** Dashboard numbers. Orchestration only: uses the interfaces of the other modules.
- **Owns tables:** none
- **PBIs:** PBI-036

Add the layer folders `controllers/`, `services/`, `repositories/`, `models/`, `dtos/` and `validators/` when the first file for them exists (git keeps no empty folders). `interfaces/` (the public door) and `constants/` are here already. Copy the shape of `../health/`. This module writes only its own tables
and imports other modules only through their `index.ts`.
