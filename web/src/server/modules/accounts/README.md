# accounts module

- **Owner:** Backend 1
- **Does:** Create, deactivate and import accounts; record consent.
- **Owns tables:** profiles
- **PBIs:** PBI-015, PBI-016, PBI-031

Add the layer folders `controllers/`, `services/`, `repositories/`, `models/`, `dtos/` and `validators/` when the first file for them exists (git keeps no empty folders). `interfaces/` (the public door) and `constants/` are here already. Copy the shape of `../health/`. This module writes only its own tables
and imports other modules only through their `index.ts`.
