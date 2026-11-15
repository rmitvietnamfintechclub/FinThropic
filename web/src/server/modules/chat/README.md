# chat module

- **Owner:** AI/RAG 1 (pipeline), Frontend 1 (screens)
- **Does:** Conversations and the answering pipeline. Calls documents through its interface for search.
- **Owns tables:** conversations, messages
- **PBIs:** PBI-004, PBI-009, PBI-010, PBI-017, PBI-030

Add the layer folders `controllers/`, `services/`, `repositories/`, `models/`, `dtos/` and `validators/` when the first file for them exists (git keeps no empty folders). `interfaces/` (the public door) and `constants/` are here already. Copy the shape of `../health/`. This module writes only its own tables
and imports other modules only through their `index.ts`.
