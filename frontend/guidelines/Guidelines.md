# Project Tracker UI Rules — Premium SaaS Standard

**Applies to every new or modified frontend page, component, form, dashboard, and interaction.**
Keep the existing Project Tracker identity. Improve consistency and usability before adding visual effects.

## 1. Color and visual consistency

- The single source of truth is `frontend/src/styles/theme.css`. Use semantic theme tokens and Tailwind utilities (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `ring-ring`). **Do not hardcode hex colors in new components.**
- Preserve the current light theme defined in `theme.css`: royal blue `#304fc5` (primary), deep navy `#101e60` (sidebar), blue `#3457a6` (accent), `#f3f6fc` (canvas), white (cards), and `#152e50` (foreground). Use semantic success/warning/destructive colors **only** for their meanings. Theme tokens remain authoritative for dark mode and any future approved palette changes.
- Support both light and dark modes using corresponding theme tokens; avoid light-only backgrounds or text. Use subtle 1px borders, restrained shadows, small consistent radii, and generous whitespace. **No decorative gradients, loud colors, or unnecessary glass effects.**
- Use one clear visual hierarchy: a page title, concise section headings, cards for grouped information, and at most one visually dominant primary action per area.

## 2. Typography

- Preserve the established type system: `--font-interface` (Inter with system sans-serif fallbacks) for controls, body text, charts and metrics; `--font-editorial` (Georgia) for the existing italic `.workspace-title` treatment. Do not add additional font families or replace these without approval.
- Use a predictable type scale: page title **28–30px**, section title **22–24px**, card title **18px**, body **15–16px**, secondary text **13–14px**. Avoid tiny text for essential information.
- Use weight **400** for body, **500–600** for labels and section headings, and **600–700** for page titles. Body line-height **1.45–1.6**; headings tighter. Align numeric columns and use tabular numerals for KPI values.

## 3. Layout, spacing, and grids

- Use the **8px spacing system**: 4, 8, 12, 16, 24, 32, 48px. Keep padding and gaps consistent across pages.
- Use CSS Grid/Flexbox—not absolute positioning—for application layout: **12 columns on desktop**, **8 on tablet**, **4 on mobile**. Change component spans at breakpoints; do not merely shrink desktop layouts.
- Default page gutters: **32px desktop, 24px tablet, 16px mobile**. Cap large content areas around **1280px** unless a data table legitimately needs more room.
- Keep cards aligned to the grid with consistent internal padding (typically 16–24px). Never permit clipped labels, overlapping content, or unintentional horizontal page scrolling. Data tables may scroll inside their own container on small screens.
- Optimize dashboard reading order: title and context → key metrics → trends → detailed tables/actions.

## 4. HCI and interaction (mandatory)

Apply Nielsen's usability heuristics, Norman's visible signifiers/feedback, and Shneiderman's consistency and error-prevention principles:

- **Visibility of system status:** Show loading/saving/progress, success feedback, error feedback, and meaningful empty states. Never leave users wondering whether an action worked.
- **Consistency and real-world language:** Reuse navigation placement, labels, icons, field order and button styles. Prefer familiar language over implementation jargon.
- **Recognition over recall:** Keep relevant project context visible; make filters, selected project and active page clear. Provide labels and helpful defaults.
- **User control and error prevention:** Confirm destructive actions, allow cancellation and undo where possible, validate near the relevant field, preserve input when requests fail, and explain how to recover.
- **Efficiency and accessibility:** Make frequent actions discoverable, minimize unnecessary clicks, support keyboard navigation, and avoid surprise navigation.
- Use established shared UI components from `frontend/src/app/components/ui/` before introducing variants or one-off controls.

## 5. Accessibility baseline — target WCAG 2.2 AA

- Target **4.5:1** contrast for normal text and **3:1** for large text and relevant UI boundaries. Check actual foreground/background combinations in both themes.
- Provide visible keyboard focus, logical tab order, semantic headings, keyboard-operable controls and accessible names. Do not rely solely on color or icons to communicate meaning.
- Use persistent form labels, clear required-field indicators and specific error text. Show focus at the first actionable error where practical.
- Aim for touch targets around **44×44px** when practical; never intentionally build cramped controls. Respect reduced-motion preferences and avoid unnecessary animation.

## 6. Data-heavy SaaS components

- Every chart needs a descriptive title, readable axis/legend labels, units, timeframe and distinguishable series. Never use decoration instead of data clarity.
- KPI cards must have a clear name, value and unit; add comparison or trend only when meaningful and accurately sourced.
- Tables need descriptive column headings, consistent number/date formatting, sensible sorting/filtering when useful, and clear no-results/loading/error states.
- Use semantic status indicators with text labels (for example, `Overdue`), not color alone.

## 7. Definition of done for each UI change

Before merging a UI change, verify:
1. Visual consistency with `theme.css` and existing components (light **and** dark).
2. Responsive layout at mobile (~375px), tablet (~768px), and desktop (~1440px), with no unintended overflow.
3. Keyboard navigation, visible focus, accessible labels, contrast, and usable click/tap targets.
4. Loading, success, failure and empty states; clear validation and recovery for forms.
5. Chart/table labels and data correctness where applicable.

**Priority:** usability → accessibility → consistency → visual polish. A premium SaaS UI is calm, predictable, legible and efficient—not visually busy.

## 8. Dashboard visual direction — Recent-inspired

Reference entries from Recent Design (inspiration, not copied assets or code):

- [Spacing Tips](https://recent.design/i/qbsvs1j-spacing-visualization-dashboard): disciplined spacing and consistent grid alignment.
- [Moody Status Badges](https://recent.design/i/eaj2ae4-moody-status-badges): concise, labeled status chips; use the application's semantic colors rather than importing the reference's palette.
- [Project Tracker Carousel](https://recent.design/i/ibsfv7y-x-com): a relevant project-tracking reference for future exploration. The full reference page was not retrievable during this update.

Dashboard order: contextual heading, current KPIs, delivery progress and attention, reporting chart and status distribution, recent work. Use a 12-column grid with an 8/4 split on wide viewports; collapse to single-column panels as space decreases. Provide chart data as text/table, real keyboard-operable actions, and distinct loading and error states. Only display operational insights that the selected role receives from the API. Never introduce filters, comparisons, historical trends or predicted values that aren't backed by the data; the current monthly aggregation combines calendar months across available history.
