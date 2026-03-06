# @liteforge/calendar

## 0.3.0

### Minor Changes

- Add full mobile/responsive support:

  - **ResizeObserver breakpoints** — `data-size="mobile|tablet|desktop"` attribute on `.lf-cal` and `.lf-cal-toolbar` driven by container width (not viewport), configurable via `responsive.mobileBp` (default 768px)
  - **`sizeClass()`** signal exposed on `CalendarResult` — lets external wrappers (e.g. sidebar) react to breakpoint changes
  - **Mobile Resource Bar** — `MobileResourceBar()` component with per-resource tabs and an "Alle / All" overview tab; exposes `setActiveResource(id | null)` and `activeResource()` on the API
  - **Mobile day view** — on mobile, resource columns merge into a single column with resource-label chips on events; per-resource tab selects which resource to show
  - **`+N more` chip** in all-day row — `maxVisible` option on `renderAllDayRow` limits visible all-day events and shows an overflow chip
  - **localStorage persistence** — last selected view persisted under `lf-cal-preferred-view`; active resource tab persisted under `lf-cal-preferred-resource`; both restored on init (no auto view-switching — user controls view at all times)
  - **Touch drag-drop fix** — ghost element now anchors to the exact grab point (offset from pointer to event top-left), eliminating the jump on touchstart; original event dims to `opacity: 0.3` during drag (slot stays reserved visually); opacity restored on drop/cancel
  - **Toolbar mobile dropdown** — view-switcher dropdown opens right-anchored (`right: 0`) to prevent clipping at screen edge
  - Various CSS polish: mobile time-label hiding, styled mobile scrollbars, `white-space: nowrap` on resource tabs

## 0.2.0

### Minor Changes

- Migrate CSS from injected TS strings to real CSS files

  Each UI package now ships a `css/styles.css` file importable directly:

  ```css
  @import "@liteforge/modal/styles";
  @import "@liteforge/table/styles";
  @import "@liteforge/calendar/styles";
  @import "@liteforge/admin/styles";
  ```

  The `injectDefaultStyles()` function now creates a `<link>` element
  using a `?url` import so bundlers copy and hash the asset correctly
  in production builds. The `unstyled: true` option continues to work.
