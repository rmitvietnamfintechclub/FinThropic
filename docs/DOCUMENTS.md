# Documents

Which club documents may be indexed, and with which Gemini key. The free key sends text to Google under terms that let Google use it to improve its products; the paid key does not. No document content is ever committed: real files live in `fixtures/private/` (git-ignored) on a developer's machine, or in Supabase Storage.

| Source | Level | Free key | Paid key |
| --- | --- | --- | --- |
| Synthetic test files (`fixtures/public/`) | Member | Yes | Yes |
| Files in the club Drive folder as of 25 Nov 2026, including the Student Life guidelines (Club Rules and Regulations, Clubs Operation Guideline, event report template, event checklists) | EBMB | No | Only after the file list in #73 marks them |
| Member-level documents uploaded later | Member | Yes, once listed in #73 | Yes |
| Any other file | Not indexed | No | No, until it has a row in the file list (#73) |

When two versions of the same rule disagree (for example the minimum number of members or the bank), the newest version applies.
