# Test fixtures

Files the indexing tests read. Everything in `public/` is synthetic: invented text, no real club names,
people, amounts or sponsors, because this repository is public.

## public/

| File | Pages | What it is | What the pipeline should do |
| --- | --- | --- | --- |
| `five-page-text.pdf` | 5 | A slide deck exported to PDF (A4 landscape). A title and four bullet points on every page, a repeated footer and a printed `n / 5` page number. Text only, no pictures. | Status `ready`, 5 chunks, one per page, pages 1 to 5. The footer and page numbers are dropped. (PBI-003 TC1) |
| `scanned-no-text.pdf` | 1 | One slide printed to an image: a grey, slightly crooked JPEG with no text layer. You cannot select any text. | Status `failed`, error `no readable text`, 0 chunks. (PBI-003 TC2) |
| `mixed-text-and-picture.pdf` | 2 | Page 1 is a text slide. Page 2 is a dashboard screenshot with only a one-word title. | Status `ready` with the warning `page 2: picture, little text`. 1 chunk, from page 1. (PBI-003 TC3) |

Each file is under 500 KB. Check a file in any PDF viewer: if you can highlight the text on a page, that page
has a text layer; if you cannot, it is a picture only.

## private/

Real club files for local runs only. Git ignores everything here except `.gitkeep`: never commit a real
file. Check with `git check-ignore fixtures/private/anything.pdf` (it prints the path when the file is
ignored).
