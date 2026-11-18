"""Ten questions a member could ask about the synthetic five-page fixture.

They are the input for comparing chunking methods (fixed, recursive, structure-based) by hand.
That comparison is a manual result for the pull request note, not an assertion: the repository has
no retrieval model yet, so a test cannot score an answer.
"""

from __future__ import annotations

QUESTIONS: list[str] = [
    "When does the club budget year start and end?",
    "Who has to sign a purchase above two hundred thousand dong?",
    "What happens to a receipt before the semester audit?",
    "Where does the receipt go before the semester audit?",
    "What is the spending limit before a signature is needed?",
    "Which months does the budget run from?",
    "Who signs the form for a large purchase?",
    "What should be done with every purchase receipt?",
    "Why does the club keep receipts in a folder?",
    "What does every purchase above the limit need before the receipt is filed?",
]
