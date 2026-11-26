# FinThropic PBI-047.1 — Figma-importable wireframes

This package contains editable SVG wireframe frames for Frontend 1 screens 4–6 and 13–17.

## Included
- Chat: 10 states, each desktop (1280px) and mobile (360px)
- Citation source viewer: PDF, DOCX, XLSX and access-refused, desktop/mobile
- Chat history: list, delete-confirmation and empty, desktop/mobile
- Member and admin app shells, desktop/mobile
- System pages: 404, no access, session expired and general error, desktop/mobile

## Import into Figma
1. Unzip this package.
2. In Figma, create or open the FinThropic Wireframes design file.
3. Drag the SVG files onto the canvas, or use File → Place image.
4. Each SVG remains vector-editable; ungroup elements as needed.
5. Arrange frames on pages named Member, Shared and System.
6. Export selected frames as PNG, PDF or SVG from Figma.

## Design conventions
- Grayscale, shadcn/ui-inspired cards, inputs, buttons, alerts and badges.
- Each frame has implementation notes with purpose, route/contract and PBI.
- Keyboard focus order is written on the frame.
- These are design wireframes, not production UI or a native .fig file.

## Verification notes
API routes/contracts are labelled where supported by the supplied PBI/spec context. Any route described as "to be confirmed" must be checked against the current repository contracts before implementation.
