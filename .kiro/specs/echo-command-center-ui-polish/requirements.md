# Requirements Document

## Introduction

This feature covers a visual and UX polish pass on the existing ECHO Command Center SaaS dashboard. The goal is to elevate the UI to a premium, professional standard comparable to products like Stripe, Vercel, and Linear — without altering any structure, layout, navigation, or functionality. All changes are purely cosmetic: CSS, design tokens, and inline style refinements across the existing component set.

The existing stack is React + TypeScript + Vite, using CSS custom properties (tokens.css), pure CSS (no Tailwind), Recharts for charts, React Router, and Zustand for state.

## Glossary

- **Design_System**: The set of CSS custom properties defined in `tokens.css` and shared styles in `components.css` and `global.css`
- **MetricCard**: The KPI card component at `src/components/shared/MetricCard.tsx`
- **StatusBadge**: The status pill component at `src/components/shared/StatusBadge.tsx`
- **RiskBadge**: The risk score badge component at `src/components/shared/RiskBadge.tsx`
- **TopNav**: The sticky top navigation bar at `src/components/Layout/TopNav.tsx`
- **SideNav**: The collapsible sidebar at `src/components/Layout/SideNav.tsx`
- **Dashboard**: The main dashboard view at `src/views/Dashboard/Dashboard.tsx`
- **ActionTable**: The actions data table at `src/views/ActionPipeline/ActionTable.tsx`
- **KillSwitchButton**: The emergency stop control at `src/views/Governance/KillSwitchButton.tsx`
- **Transition_Standard**: `all 0.18s cubic-bezier(0.4, 0, 0.2, 1)` — the project's standard easing curve
- **8px_Grid**: The spacing system where all padding, margin, and gap values are multiples of 4px or 8px
- **Accent_Color**: A per-component CSS custom property value (blue, green, purple, yellow, red, orange) used for visual emphasis

---

## Requirements

### Requirement 1: Design Token Refinement

**User Story:** As a developer maintaining the design system, I want the CSS custom properties in `tokens.css` to express a richer, more premium visual language, so that all components automatically inherit improved depth, contrast, and color quality.

#### Acceptance Criteria

1. THE Design_System SHALL define at least two additional shadow tokens — `--shadow-card-glow` and `--shadow-inset-subtle` — for use in elevated and inset surface treatments.
2. THE Design_System SHALL define a `--gradient-surface-premium` token representing a multi-stop diagonal gradient suitable for premium card backgrounds.
3. THE Design_System SHALL define `--color-border-inner` as a token for inner highlight borders (e.g., `rgba(255,255,255,0.06)`), distinct from the existing border tokens.
4. WHEN any existing token value is changed, THE Design_System SHALL preserve all existing token names so that no component referencing those names breaks.
5. THE Design_System SHALL define a `--transition-micro` token of `all 0.12s cubic-bezier(0.4, 0, 0.2, 1)` for sub-element hover effects that need to feel snappier than `--transition-fast`.

---

### Requirement 2: Global Background and Body Texture

**User Story:** As a user viewing the dashboard, I want the page background to feel deep and layered rather than flat, so that the overall environment feels premium and immersive.

#### Acceptance Criteria

1. THE Design_System SHALL update the `body` background in `global.css` to include at least three radial gradient layers — a top-center blue ambient, a bottom-right purple ambient, and a subtle center vignette — without changing the base `--color-background-primary` value.
2. WHILE the page is rendered, THE Design_System SHALL apply a consistent noise/grain texture via a CSS `background-image` SVG filter or repeating gradient pattern at ≤ 3% opacity so the background does not appear completely flat.
3. THE Design_System SHALL ensure the `main` content area in `Layout.tsx` retains its own layered `backgroundImage` gradient and does not override the body texture.

---

### Requirement 3: Card Component Visual Depth

**User Story:** As a user scanning the dashboard, I want cards to feel elevated and three-dimensional, so that the information hierarchy is immediately clear and the UI feels premium.

#### Acceptance Criteria

1. THE Design_System SHALL update `.card` in `components.css` to use a richer multi-stop `background-image` gradient (at least three stops) that creates a subtle top-left-to-bottom-right sheen.
2. THE Design_System SHALL update `.card::before` to produce a more visible inner-border highlight using a gradient mask technique, with the top-left edge brighter than the bottom-right.
3. WHEN a `.card` element is hovered, THE Design_System SHALL apply `translateY(-2px)` transform, an enhanced multi-layer box-shadow including an accent-colored outer glow, and a border-color transition — all within the Transition_Standard duration.
4. THE Design_System SHALL add a `.card-premium` modifier class that applies a diagonal gradient background (`--gradient-surface-premium`) and a top-edge shimmer line via `::after` pseudo-element, for use on hero cards like ROISummaryCard.
5. IF a `.card` element does not have an explicit `overflow: hidden` style, THEN THE Design_System SHALL ensure the `::before` pseudo-element does not visually escape the card boundary via `border-radius` clipping.

---

### Requirement 4: MetricCard KPI Number Prominence

**User Story:** As an operator monitoring KPIs, I want the primary metric value in each MetricCard to be visually dominant and immediately readable, so that I can assess system health at a glance without reading labels first.

#### Acceptance Criteria

1. THE MetricCard SHALL render the primary `value` at a minimum font size of `var(--font-size-3xl)` (28px) with `font-weight: 800` and `letter-spacing: -0.03em`.
2. WHEN an `accent` color prop is provided, THE MetricCard SHALL apply a `text-shadow` of `0 0 24px {accent}40` to the value element to create a soft glow effect.
3. THE MetricCard SHALL render the `label` text at `font-size: 10px`, `font-weight: 700`, `text-transform: uppercase`, and `letter-spacing: 0.09em` in `--color-text-muted`.
4. WHEN a `trend` prop is provided, THE MetricCard SHALL render the trend badge with a colored background at 15% opacity of the trend color, a 1px border at 30% opacity, and an arrow prefix (`↑` or `↓`).
5. THE MetricCard SHALL render the left accent bar at exactly 3px wide with a vertical gradient from full `accent` opacity at the top to 40% opacity at the bottom, plus a `box-shadow` of `2px 0 10px {accent}33`.
6. WHEN a MetricCard is hovered, THE MetricCard SHALL lift by 2px and increase the outer glow intensity from `{accent}12` to `{accent}20` within the Transition_Standard duration.

---

### Requirement 5: StatusBadge Refinement

**User Story:** As a user reading agent or action status, I want status badges to be visually distinct and polished, so that I can instantly differentiate between states without relying solely on color.

#### Acceptance Criteria

1. THE StatusBadge SHALL include a `1px solid` border at 30% opacity of the badge's text color, in addition to the existing background fill.
2. WHEN `dot` prop is `true`, THE StatusBadge SHALL render the dot with a `box-shadow` of `0 0 6px currentColor` to create a soft glow matching the badge color.
3. THE StatusBadge SHALL apply `letter-spacing: 0.04em` and `font-weight: 700` to the label text for improved legibility at small sizes.
4. WHEN the status is `HEALTHY` or `APPROVED` or `PASSED`, THE StatusBadge SHALL apply a subtle `animation: pulse 3s ease-in-out infinite` to the dot element (when dot is rendered) to indicate live/active state.
5. THE StatusBadge SHALL use `font-size: 10px` for `size="sm"` and `font-size: 11px` for `size="md"` consistently.

---

### Requirement 6: RiskBadge Visual Differentiation

**User Story:** As an operator reviewing actions in the pipeline, I want risk badges to be immediately distinguishable by severity level, so that high-risk actions stand out without requiring me to read the score number.

#### Acceptance Criteria

1. THE RiskBadge SHALL include a `1px solid` border at 35% opacity of the badge color for all risk levels.
2. WHEN the risk score is ≥ 70 (HIGH), THE RiskBadge SHALL apply `font-weight: 800`, a `box-shadow` of `0 0 8px {color}40`, and render the label text in uppercase.
3. WHEN the risk score is < 30 (LOW), THE RiskBadge SHALL render with reduced visual weight — `font-weight: 600` and no box-shadow — to visually de-emphasize low-risk items.
4. WHEN the risk score is ≥ 30 and < 70 (MED), THE RiskBadge SHALL render with `font-weight: 700` and a subtle `box-shadow` of `0 0 4px {color}25`.
5. THE RiskBadge SHALL always render the numeric score and, when `showLabel` is true, the label text separated by a `·` divider character for visual clarity.

---

### Requirement 7: TopNav Visual Hierarchy and Kill Switch Emphasis

**User Story:** As an operator using the top navigation bar, I want the Kill Switch button to be the most visually prominent interactive element in the nav, so that I can locate and activate it instantly in an emergency.

#### Acceptance Criteria

1. THE TopNav SHALL render the Kill Switch button with a minimum width of 130px and a `font-size` of `10px` with `font-weight: 800` and `letter-spacing: 0.06em`.
2. WHEN `killSwitchActive` is `false`, THE TopNav SHALL render the Kill Switch button with a pulsing red border animation (`borderPulse`) at a 2.5s interval and a `box-shadow` of `0 0 16px rgba(240,72,62,0.2)` to draw attention.
3. WHEN `killSwitchActive` is `true`, THE TopNav SHALL render the Kill Switch button with a green gradient background, white text, and a `box-shadow` of `0 2px 16px rgba(52,208,88,0.4)`.
4. THE TopNav SHALL render the connection status pill with a minimum width of 80px so it does not reflow when switching between "Live" and "Offline" states.
5. THE TopNav SHALL apply `backdrop-filter: blur(24px) saturate(2)` and a bottom border of `1px solid var(--color-border)` plus a `box-shadow` of `0 1px 0 var(--color-border), 0 4px 32px rgba(0,0,0,0.5)` for a premium frosted-glass appearance.
6. WHEN the user avatar area is hovered, THE TopNav SHALL transition the background to `var(--color-surface)` and add a `1px solid var(--color-border)` border within the Transition_Standard duration.

---

### Requirement 8: SideNav Active State and Hover Polish

**User Story:** As a user navigating between pages, I want the sidebar navigation to provide clear visual feedback for the active page and smooth hover transitions, so that navigation feels responsive and premium.

#### Acceptance Criteria

1. THE SideNav SHALL render the active nav item with a left border of `3px solid var(--color-accent-blue)` and a background gradient of `linear-gradient(90deg, rgba(79,163,247,0.14) 0%, rgba(79,163,247,0.03) 100%)`.
2. WHEN a non-active nav item is hovered, THE SideNav SHALL transition its background to `rgba(255,255,255,0.05)` and its text color to `var(--color-text-primary)` within the Transition_Standard duration.
3. THE SideNav SHALL render nav item icons with `font-size: 17px` and a `filter: drop-shadow(0 0 5px currentColor)` at 70% opacity for a subtle glow effect.
4. THE SideNav SHALL render the system health bar with a `box-shadow` of `0 0 8px {healthColor}60` on the fill element to create a glowing progress bar effect.
5. WHEN `killSwitchActive` is `true`, THE SideNav SHALL render a pulsing red indicator in the system health section with `animation: pulse 1.5s ease-in-out infinite`.
6. THE SideNav SHALL render the collapse toggle button with a hover state that transitions border color to `var(--color-border-emphasis)` and background to `var(--color-surface)` within the Transition_Standard duration.

---

### Requirement 9: Data Table Row Hover and Spacing

**User Story:** As an operator reviewing the action pipeline table, I want table rows to have smooth hover states and consistent spacing, so that scanning and selecting rows feels fluid and professional.

#### Acceptance Criteria

1. THE Design_System SHALL update `.data-table tbody tr:hover` in `components.css` to apply `background: var(--color-surface-hover)` with a `transition` of `background 0.12s ease` for a smooth row highlight.
2. THE Design_System SHALL update `.data-table td` padding to `12px var(--space-4)` (top/bottom 12px, left/right 16px) for improved vertical breathing room.
3. THE Design_System SHALL update `.data-table th` to include a `border-bottom: 1px solid var(--color-border-emphasis)` (slightly more visible than the current `--color-border`) to visually separate the header from data rows.
4. WHEN a `.data-table tbody tr` is hovered, THE Design_System SHALL apply a `box-shadow: inset 3px 0 0 var(--color-accent-blue)` on the row to create a left-edge accent indicator.
5. THE Design_System SHALL ensure `.data-table th` text uses `letter-spacing: 0.09em` and `font-size: 10px` consistently for all column headers.

---

### Requirement 10: Button Hover Micro-interactions

**User Story:** As a user interacting with buttons throughout the dashboard, I want button hover and active states to feel tactile and responsive, so that the UI communicates interactivity clearly.

#### Acceptance Criteria

1. WHEN a `.btn-primary` button is hovered, THE Design_System SHALL apply `transform: translateY(-1px)` and increase the `box-shadow` blue glow from `rgba(79,163,247,0.3)` to `rgba(79,163,247,0.45)` within the Transition_Standard duration.
2. WHEN a `.btn-danger` button is hovered, THE Design_System SHALL apply `transform: translateY(-1px)` and a `box-shadow` of `0 4px 20px rgba(240,72,62,0.5)` to emphasize the destructive action.
3. WHEN any `.btn` is in `:active` state, THE Design_System SHALL apply `transform: translateY(0)` and reduce the box-shadow to create a "pressed" tactile feel.
4. THE Design_System SHALL ensure the `.btn::after` shimmer overlay transitions from `opacity: 0` to `opacity: 1` on hover within the Transition_Standard duration.
5. WHEN a `.btn-ghost` button is hovered, THE Design_System SHALL transition background to `var(--color-surface)`, border-color to `var(--color-border)`, and text color to `var(--color-text-primary)` within the Transition_Standard duration.

---

### Requirement 11: Pulsing Live Status Indicators

**User Story:** As an operator monitoring live data, I want status dots and live indicators to animate subtly, so that I can immediately distinguish live/active states from static data.

#### Acceptance Criteria

1. THE Design_System SHALL define a `@keyframes pulse-dot` animation in `global.css` that scales a dot from `scale(1)` to `scale(1.4)` and back, with opacity from `1` to `0.5`, over a 2s infinite cycle.
2. WHEN an agent status is `HEALTHY`, THE AgentStatusRow SHALL render the status dot with both the existing `pulse-ring` animation and the `pulse-dot` animation simultaneously.
3. THE TopNav connection status dot SHALL use the `pulse` animation when `wsConnected` is `true`, with a `box-shadow` of `0 0 8px var(--color-accent-green), 0 0 16px rgba(52,208,88,0.4)`.
4. WHEN `pendingApprovals > 0`, THE Dashboard header pill SHALL render with a pulsing yellow dot using `animation: pulse 2s ease-in-out infinite`.
5. THE Design_System SHALL ensure all pulsing animations use `ease-in-out` timing and run `infinite` so they never stop while the condition is active.

---

### Requirement 12: ROISummaryCard Premium Treatment

**User Story:** As an executive viewing the dashboard, I want the ROI Summary Card to feel like the hero element of the page — visually dominant and premium — so that the most important business metric commands immediate attention.

#### Acceptance Criteria

1. THE ROISummaryCard SHALL use the `.card-premium` modifier class (defined in Requirement 3) for its outer container.
2. THE ROISummaryCard SHALL render the total savings value at `font-size: var(--font-size-5xl)` (48px) with `font-weight: 800`, `letter-spacing: -0.04em`, and a `text-shadow` of `0 0 40px rgba(52,208,88,0.5)`.
3. THE ROISummaryCard SHALL include at least two radial gradient glow orbs as absolutely-positioned decorative elements — one green (top-right) and one blue (bottom-left) — at ≤ 10% opacity.
4. THE ROISummaryCard SHALL render a top-edge shimmer line via a `::after` or inline `div` using `linear-gradient(90deg, transparent, rgba(52,208,88,0.5), rgba(79,163,247,0.4), transparent)` at 1px height.
5. THE ROISummaryCard secondary metrics (ROI %, Annual Projection, Cost/Insight) SHALL each render at `font-size: var(--font-size-3xl)` with `font-weight: 800` and `letter-spacing: -0.03em`.

---

### Requirement 13: Consistency and 8px Grid Compliance

**User Story:** As a developer maintaining the codebase, I want all spacing, border-radius, and component sizing to follow the established 8px grid and token system, so that the UI is visually consistent and easy to maintain.

#### Acceptance Criteria

1. THE Design_System SHALL ensure all padding and margin values in `components.css` use `var(--space-*)` tokens rather than hardcoded pixel values, except for sub-4px micro-adjustments (e.g., `2px`, `3px` for badge padding).
2. THE Design_System SHALL ensure all `border-radius` values in `components.css` use `var(--radius-*)` tokens rather than hardcoded pixel values.
3. THE Design_System SHALL ensure all `transition` values in `components.css` use `var(--transition-*)` tokens rather than hardcoded duration/easing strings.
4. THE Design_System SHALL ensure icon sizes within nav items, badges, and cards are consistent: `16px` for inline text icons, `17px` for nav icons, `18px` for card header icons.
5. THE Design_System SHALL ensure all `font-size` values in `components.css` use `var(--font-size-*)` tokens, except for values smaller than `var(--font-size-xs)` (11px) which may use literal pixel values.
