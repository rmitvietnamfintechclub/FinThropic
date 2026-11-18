"""Synthetic PDFs for the parse and chunk tests.

Every fixture is built at test time by these helpers, so CI needs no binary files and stays
repeatable. Real club documents never enter git: they live in the git-ignored `fixtures/private/`.
PBI-003.5 (#64) still owns the realistic corpus, so nothing here tries to replace it.
"""

from __future__ import annotations

from typing import Any

import pymupdf

BODY = (
    "The club budget runs from July to June and every purchase above two "
    "hundred thousand dong needs the treasurer to sign the form before the "
    "receipt goes into the folder for the semester audit."
)


def _rect(x0: float, y0: float, x1: float, y1: float) -> Any:
    """Wrap Rect once so its untyped call is ignored in one place."""
    return pymupdf.Rect(x0, y0, x1, y1)  # type: ignore[no-untyped-call]


def _irect(x0: int, y0: int, x1: int, y1: int) -> Any:
    """Wrap IRect once so its untyped call is ignored in one place."""
    return pymupdf.IRect(x0, y0, x1, y1)  # type: ignore[no-untyped-call]


def text_pdf(path: str, pages: int = 5) -> str:
    """A realistic deck: a title line and about forty words on every page."""
    doc = pymupdf.open()  # type: ignore[no-untyped-call]
    for index in range(1, pages + 1):
        page = doc.new_page()
        page.insert_text((72, 90), f"Slide {index} title", fontsize=16)
        page.insert_textbox(_rect(72, 110, 520, 700), f"PAGE-{index} {BODY}", fontsize=10)
    doc.save(path)  # type: ignore[no-untyped-call]
    return path


def footer_pdf(path: str, pages: int = 6) -> str:
    """A deck with the same footer and a bare page number on every page."""
    doc = pymupdf.open()  # type: ignore[no-untyped-call]
    for index in range(1, pages + 1):
        page = doc.new_page()
        page.insert_text((72, 90), f"Slide {index}", fontsize=16)
        page.insert_textbox(
            _rect(72, 110, 520, 700),
            f"PAGE-{index} {BODY} Line {index}.",
            fontsize=10,
        )
        page.insert_text((72, 760), "Confidential - Finthropic Club internal", fontsize=8)
        page.insert_text((300, 780), str(index), fontsize=8)
    doc.save(path)  # type: ignore[no-untyped-call]
    return path


def image_only_pdf(path: str) -> str:
    """One page with a bitmap and no text layer: a scanned page."""
    doc = pymupdf.open()  # type: ignore[no-untyped-call]
    page = doc.new_page()
    pixmap = pymupdf.Pixmap(  # type: ignore[no-untyped-call]
        pymupdf.csRGB,
        _irect(0, 0, 120, 120),
        False,
    )
    pixmap.clear_with(200)  # type: ignore[no-untyped-call]
    page.insert_image(_rect(72, 72, 400, 400), pixmap=pixmap)  # type: ignore[no-untyped-call]
    doc.save(path)  # type: ignore[no-untyped-call]
    return path


def mixed_pdf(path: str) -> str:
    """A short caption plus one embedded bitmap: the input for the #63 warning."""
    doc = pymupdf.open()  # type: ignore[no-untyped-call]
    page = doc.new_page()
    page.insert_text((72, 72), "Slide with a screenshot", fontsize=14)
    page.insert_text((72, 100), "short caption", fontsize=10)
    pixmap = pymupdf.Pixmap(  # type: ignore[no-untyped-call]
        pymupdf.csRGB,
        _irect(0, 0, 60, 60),
        False,
    )
    pixmap.clear_with(120)  # type: ignore[no-untyped-call]
    page.insert_image(_rect(72, 200, 300, 400), pixmap=pixmap)  # type: ignore[no-untyped-call]
    doc.save(path)  # type: ignore[no-untyped-call]
    return path


def printed_number_pdf(path: str) -> str:
    """Three pages whose printed slide numbers are 73, 74 and 75."""
    doc = pymupdf.open()  # type: ignore[no-untyped-call]
    for printed in (73, 74, 75):
        page = doc.new_page()
        page.insert_text((72, 90), f"Printed slide {printed}", fontsize=16)
        page.insert_textbox(_rect(72, 110, 520, 700), BODY, fontsize=10)
        page.insert_text((300, 760), str(printed), fontsize=10)
    doc.save(path)  # type: ignore[no-untyped-call]
    return path


def partly_repeated_pdf(path: str) -> str:
    """Six pages where one line appears on only the first two."""
    doc = pymupdf.open()  # type: ignore[no-untyped-call]
    for index in range(1, 7):
        page = doc.new_page()
        page.insert_text((72, 90), f"Slide {index}", fontsize=16)
        page.insert_textbox(_rect(72, 110, 520, 700), f"PAGE-{index} {BODY}", fontsize=10)
        if index <= 2:
            page.insert_text((72, 300), "Agenda item carried over.", fontsize=11)
    doc.save(path)  # type: ignore[no-untyped-call]
    return path


def near_empty_pdf(path: str) -> str:
    """A real slide followed by a divider that only says thank you."""
    doc = pymupdf.open()  # type: ignore[no-untyped-call]
    first = doc.new_page()
    first.insert_text((72, 90), "Budget rules", fontsize=16)
    first.insert_textbox(_rect(72, 110, 520, 700), BODY, fontsize=10)
    second = doc.new_page()
    second.insert_text((72, 90), "Thank you", fontsize=20)
    doc.save(path)  # type: ignore[no-untyped-call]
    return path


def corrupt_pdf(path: str) -> str:
    """A file that is not a PDF at all."""
    with open(path, "wb") as handle:
        handle.write(b"not a pdf at all")
    return path
