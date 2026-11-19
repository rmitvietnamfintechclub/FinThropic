<!-- PR title must follow Conventional Commits, e.g. feat(ingest): chunk text and keep the page -->

Closes #<sub-issue number>   Parent PBI: PBI-0xx   Role: <your role>

## What and why
<!-- Two or three sentences. -->

## Baseline (required)
- [ ] Acceptance criteria met: AC1, AC2 (list the ones this PR covers)
- [ ] Test cases pass: TC1, TC2
- [ ] Tests added or updated, and a permission test for every endpoint touched
- [ ] A frontend service parses its response with the contract schema (`src/contracts/`), and a test shows an unknown field is dropped and a wrong type is rejected
- [ ] Screens match the approved wireframe (PBI-047) at 360 px and 1280 px; any change from it is explained here
- [ ] Docs updated if behaviour changed (docs/ENDPOINTS.md, docs/MODELS.md, an ADR for a new pattern)

## Open point: tried, found, chose
<!-- What you tried, what you found (numbers if you have them), what you chose and why.
     If you kept the baseline, say what you checked before deciding. -->

## Screenshots or output
<!-- UI changes: before and after. Pipeline changes: a sample of the output. -->
