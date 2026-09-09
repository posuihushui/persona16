# Design QA — 情绪拼贴插画 v2

## Evidence

- Source visual truth: `/Users/lake/.codex/generated_images/01a083d4-81ce-7432-af6e-bfd8804e1c2e/exec-0166fa9d-0301-4591-a3e6-a6bc7d218cb6.png`
- Source pixels: 853 × 1844. The source is a mobile art-direction board rather than a pixel-identical page specification.
- Implementation asset sheet: `/Users/lake/work/mine/persona16/docs/design/qa/illustrations-v2-contact-sheet.jpg`
- Current implementation asset grid: `/Users/lake/work/mine/persona16/docs/design/qa/illustrations-v2-grid.jpg`
- Palette before/after comparison: `/Users/lake/work/mine/persona16/docs/design/qa/illustrations-v2-palette-comparison.jpg` (left: first pass; right: current mineral palette; matching scene order).
- Combined full-view comparison: `/Users/lake/work/mine/persona16/docs/design/qa/illustrations-v2-comparison.jpg`
- Browser-rendered implementation screenshot: unavailable; the macOS session remained locked and the in-app browser could not capture the local preview.
- Intended browser viewport: 375 × 812 CSS px, device scale factor 1, light theme.
- Intended state: Persona16 home page, introduction page, first quiz question, and INFP public type page.
- Local implementation URL: `http://localhost:3000/` (responded 200); the home page HTML referenced the v2 discovery and four dimension assets.

## Findings

- [Blocked] Browser-rendered spacing, crop, and responsive QA is unavailable.
  - Location: home hero, dimension cards, quiz group thumbnail, type-guide banner and split layouts.
  - Evidence: source and the nine implementation assets were opened together, but macOS lock prevented capturing the actual page in the in-app browser.
  - Impact: typography, layout rhythm, 8:5 crop, 48px thumbnail legibility, focus states and dark-mode integration cannot be signed off from code or asset files alone.
  - Fix: unlock macOS, capture the four intended states in the in-app browser, create a same-input comparison with the source visual, and repeat QA after any P0/P1/P2 fixes.

## Required Fidelity Surfaces

- Fonts and typography: not visually verified; the implementation intentionally retains the existing Persona16 typography rather than copying generated text from the art-direction board.
- Spacing and layout rhythm: not visually verified; existing page structure is preserved and the new `banner` bitmap path uses a 62.5% ratio container.
- Colors and visual tokens: asset-level comparison passed after one P2 iteration. The first pass had too many equally prominent mid-saturation hues. The current set uses warm mineral paper, deep ink navy, muted sage, mineral blue-gray and mushroom taupe; terracotta is limited to a small accent.
- Image quality and asset fidelity: asset-level comparison passed. All nine scenes use real locally generated raster artwork, consistent paper texture, adult proportions and the selected collage grammar. JPEGs are baseline 768 × 768 at 128–196KB with no transparency halos.
- Copy and content: static checks passed. Scene descriptions and alt text describe observable content without diagnosis, type superiority or hidden conclusions.
- Accessibility and behavior: markup retains explicit dimensions, lazy/eager loading rules and alt/decorative behavior; browser focus, zoom and screen-state verification remains pending.

## Full-view and Focused Comparison

- Full-view evidence: `docs/design/qa/illustrations-v2-comparison.jpg` places the selected mobile direction and the nine-asset implementation sheet in the same image. `docs/design/qa/illustrations-v2-palette-comparison.jpg` adds a matching-order before/after check for the user-requested palette correction.
- Focused region comparison: the relationship and work rows in the source were compared with `relationships-v2.jpg`, `love-v2.jpg`, and `career-v2.jpg` in the same combined image. The implementation replaces heart and growth-chart shorthand with conversation, expectations, feedback, independent focus and collaboration.
- Page-level focused regions were not captured because the OS lock blocked browser evidence.

## Comparison History

- Asset pass 1: [P2] the first palette used baby blue, peach, coral, yellow and green at similar visual strength, making the set feel busy and less premium. `rhythm-v2.jpg` was also the busiest scene.
- Fix: recolored all nine source illustrations without changing composition or meaning; reduced saturation, removed bright yellow/pink, limited terracotta, and pushed map/photo/background details into blue-gray and warm neutral layers.
- Asset pass 2: the matching-order palette comparison shows a consistent focal hierarchy across all nine scenes. No actionable P0/P1/P2 asset-level issue remains; the map scene remains denser by subject, but no longer competes chromatically.
- Browser pass 1: blocked before capture; no page-level issue was inferred from code.

## Implementation Checklist

- [x] Replace nine manifest entries with local v2 collage assets.
- [x] Preserve square and 8:5 banner rendering paths.
- [x] Update scene-specific alternative text.
- [x] Archive reusable generation prompts and design guidance.
- [x] Pass content, compliance, China compatibility, tests, typecheck and production build.
- [ ] Capture and compare the intended browser states after macOS is unlocked.

## Follow-up Polish

- [P3] Revisit `rhythm-v2.jpg` after the mobile crop is visible; simplify the town/map background only if it competes with the two route choices at card size.

final result: blocked
