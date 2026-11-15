# documents module

- **Owner:** Backend 2
- **Does:** Batches, signed upload and download URLs, status, delete, reclassify, citation links. Vector and keyword search over chunks.
- **Owns tables:** documents, upload_batches, chunks (written by the worker)
- **PBIs:** PBI-014, PBI-021, PBI-022

Add the layer folders `controllers/`, `services/`, `repositories/`, `models/`, `dtos/` and `validators/` when the first file for them exists (git keeps no empty folders). `interfaces/` (the public door) and `constants/` are here already. Copy the shape of `../health/`. This module writes only its own tables
and imports other modules only through their `index.ts`.
