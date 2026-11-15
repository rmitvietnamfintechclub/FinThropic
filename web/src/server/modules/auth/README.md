# auth module

- **Owner:** Backend 1
- **Does:** Reads the session, returns the role, rejects missing or deactivated sessions.
- **Owns tables:** none (reads profiles through accounts)
- **PBIs:** PBI-002, PBI-015, PBI-017, PBI-018

Add the layer folders `controllers/`, `services/`, `repositories/`, `models/`, `dtos/` and `validators/` when the first file for them exists (git keeps no empty folders). `interfaces/` (the public door) and `constants/` are here already. Copy the shape of `../health/`. This module writes only its own tables
and imports other modules only through their `index.ts`.
