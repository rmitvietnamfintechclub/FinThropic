# Documents

Which club documents may be indexed, and with which Gemini key. The free key sends text to Google under terms that let Google use it to improve its products; the paid key does not. No document content is ever committed: real files live in `fixtures/private/` (git-ignored) on a developer's machine, or in Supabase Storage.

| Source | Level | Free key | Paid key |
| --- | --- | --- | --- |
| Synthetic test files (`fixtures/public/`) | Member | Yes | Yes |
| Student Life guidelines: Club Rules and Regulations, Clubs Operation Guideline, the event report template and the event checklists | Member | Yes | Yes |
| Club-internal documents (meeting minutes, interview templates, event reports) | EBMB | No | Only after the file list in #73 marks them |
| Any other file | Not indexed | No | No, until it has a row in the file list (#73) |

When two versions of the same rule disagree (for example the minimum number of members or the bank), the newest version applies.
