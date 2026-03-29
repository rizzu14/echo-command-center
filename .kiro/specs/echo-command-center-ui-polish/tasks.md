# Tasks

## Implementation Tasks

- [x] 1. Add new design tokens to tokens.css
  - [x] 1.1 Add `--shadow-card-glow` token
  - [x] 1.2 Add `--shadow-inset-subtle` token
  - [x] 1.3 Add `--gradient-surface-premium` token
  - [x] 1.4 Add `--color-border-inner` token
  - [x] 1.5 Add `--transition-micro` token
  - Modifies: `src/web/command-center/src/styles/tokens.css`
  - Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5

- [x] 2. Upgrade global.css body background and add pulse-dot keyframe
  - [x] 2.1 Update `body` background-image to three radial gradient layers (top-center blue, bottom-right purple, center vignette)
  - [x] 2.2 Add SVG noise texture layer at ≤3% opacity to body background-image
  - [x] 2.3 Add `@keyframes pulse-dot` (scale 1→1.4→1, opacity 1→0.5→1, 2s infinite)
  - Modifies: `src/web/command-center/src/styles/global.css`
  - Validates: Requirements 2.1, 2.2, 11.1

- [x] 3. Polish card styles in components.css
  - [x] 3.1 Update `.card` background-image to a richer 3-stop diagonal gradient
  - [x] 3.2 Update `.card::before` inner-border highlight gradient for more visible top-left brightness
  - [x] 3.3 Update `.card:hover` to `translateY(-2px)`, enhanced multi-layer box-shadow with accent glow, border-color transition
  - [x] 3.4 Add `.card-premium` modifier class with `--gradient-surface-premium` background and `::after` shimmer line
  - Modifies: `src/web/command-center/src/styles/components.css`
  - Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5

- [x] 4. Polish button micro-interactions in components.css
  - [x] 4.1 Update `.btn-primary:hover` glow from `rgba(79,163,247,0.3)` to `rgba(79,163,247,0.45)` and add `translateY(-1px)`
  - [x] 4.2 Update `.btn-danger:hover` to `translateY(-1px)` and `box-shadow: 0 4px 20px rgba(240,72,62,0.5)`
  - [x] 4.3 Add `.btn:active` rule with `translateY(0)` and reduced box-shadow for pressed feel
  - [x] 4.4 Update `.btn-ghost:hover` to transition background, border-color, and text color
  - Modifies: `src/web/command-center/src/styles/components.css`
  - Validates: Requirements 10.1, 10.2, 10.3, 10.5

- [x] 5. Polish data table styles in components.css
  - [x] 5.1 Update `.data-table td` padding to `12px var(--space-4)`
  - [x] 5.2 Update `.data-table th` border-bottom to `1px solid var(--color-border-emphasis)` and letter-spacing to `0.09em`
  - [x] 5.3 Update `.data-table tbody tr:hover` to `background: var(--color-surface-hover)` with `transition: background 0.12s ease`
  - [x] 5.4 Add `box-shadow: inset 3px 0 0 var(--color-accent-blue)` to `.data-table tbody tr:hover`
  - Modifies: `src/web/command-center/src/styles/components.css`
  - Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5

- [x] 6. Polish TopNav.tsx — kill switch emphasis and frosted glass
  - [x] 6.1 Upgrade `backdrop-filter` to `blur(24px) saturate(2)` and `WebkitBackdropFilter` to match
  - [x] 6.2 Upgrade header `box-shadow` to `0 1px 0 var(--color-border), 0 4px 32px rgba(0,0,0,0.5)`
  - [x] 6.3 Set kill switch button `minWidth: 130px` and `fontSize: 10px`, `fontWeight: 800`, `letterSpacing: '0.06em'`
  - [x] 6.4 When `killSwitchActive` is false, set kill switch animation to `borderPulse 2.5s ease-in-out infinite` and `boxShadow: '0 0 16px rgba(240,72,62,0.2)'`
  - [x] 6.5 When `killSwitchActive` is true, set kill switch `boxShadow: '0 2px 16px rgba(52,208,88,0.4)'`
  - [x] 6.6 Set connection status pill `minWidth: 80px`
  - [x] 6.7 Add `border: '1px solid var(--color-border)'` to avatar hover state
  - Modifies: `src/web/command-center/src/components/Layout/TopNav.tsx`
  - Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6

- [x] 7. Polish SideNav.tsx — active state and hover
  - [x] 7.1 Update active nav item `borderLeft` from `2px` to `3px solid var(--color-accent-blue)`
  - [x] 7.2 Update active nav item background gradient to `linear-gradient(90deg, rgba(79,163,247,0.14) 0%, rgba(79,163,247,0.03) 100%)`
  - [x] 7.3 Update hover background from `rgba(255,255,255,0.04)` to `rgba(255,255,255,0.05)`
  - [x] 7.4 Add `box-shadow: 0 0 8px {healthColor}60` to health bar fill element
  - [x] 7.5 Update icon `filter` to `drop-shadow(0 0 5px currentColor)` at 70% opacity (change opacity from 0.9 to 0.7 on the filter, or apply via wrapper)
  - Modifies: `src/web/command-center/src/components/Layout/SideNav.tsx`
  - Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6

- [x] 8. Polish MetricCard.tsx — KPI number prominence
  - [x] 8.1 Confirm value `fontSize: 'var(--font-size-3xl)'`, `fontWeight: 800`, `letterSpacing: '-0.03em'` — update `text-shadow` glow to `{accent}40` (from `{accent}30`)
  - [x] 8.2 Confirm label `fontSize: 10px`, `fontWeight: 700`, `textTransform: 'uppercase'`, `letterSpacing: '0.09em'`
  - [x] 8.3 Confirm trend badge background at 15% opacity (`{trendColor}15`) with `1px solid {trendColor}30` border and arrow prefix
  - [x] 8.4 Confirm accent bar is exactly `width: 3` (3px) with gradient and `boxShadow: '2px 0 10px {accent}33'`
  - [x] 8.5 Update hover glow from `{accent}12` to `{accent}20` in `onMouseEnter` handler
  - Modifies: `src/web/command-center/src/components/shared/MetricCard.tsx`
  - Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6

- [x] 9. Polish StatusBadge.tsx — border, dot glow, pulse animation
  - [x] 9.1 Add `border: '1px solid {color}4D'` (30% opacity) to the badge span style
  - [x] 9.2 Add `boxShadow: '0 0 6px currentColor'` to the dot span when `dot` is true
  - [x] 9.3 Update `letterSpacing` to `'0.04em'` and `fontWeight` to `700` on the label
  - [x] 9.4 Add `animation: 'pulse 3s ease-in-out infinite'` to the dot when status is `HEALTHY`, `APPROVED`, or `PASSED`
  - [x] 9.5 Set `fontSize: '10px'` for `size="sm"` and `fontSize: '11px'` for `size="md"` explicitly
  - Modifies: `src/web/command-center/src/components/shared/StatusBadge.tsx`
  - Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5

- [x] 10. Polish RiskBadge.tsx — severity differentiation
  - [x] 10.1 Add `border: '1px solid {color}59'` (35% opacity) to the badge span for all risk levels
  - [x] 10.2 For HIGH (≥70): set `fontWeight: 800`, `boxShadow: '0 0 8px {color}40'`, uppercase label
  - [x] 10.3 For MED (30–69): set `fontWeight: 700`, `boxShadow: '0 0 4px {color}25'`
  - [x] 10.4 For LOW (<30): set `fontWeight: 600`, no box-shadow
  - [x] 10.5 Update render to always show `{score} · {label}` when `showLabel` is true, using `·` divider
  - Modifies: `src/web/command-center/src/components/shared/RiskBadge.tsx`
  - Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5

- [-] 11. Polish ROISummaryCard.tsx — premium hero treatment
  - [x] 11.1 Add `card-premium` to the outer container's className (e.g., `className="card card-premium"`)
  - [x] 11.2 Update total savings `textShadow` from `0 0 30px rgba(52,208,88,0.4)` to `0 0 40px rgba(52,208,88,0.5)`
  - [x] 11.3 Verify glow orb opacities are ≤10% (green orb at 0.08, blue orb at 0.06 — already correct)
  - [x] 11.4 Verify shimmer line gradient matches `linear-gradient(90deg, transparent, rgba(52,208,88,0.5), rgba(79,163,247,0.4), transparent)` — already correct
  - [x] 11.5 Verify secondary metrics are at `font-size-3xl` / `font-weight: 800` — already correct
  - Modifies: `src/web/command-center/src/views/Dashboard/ROISummaryCard.tsx`
  - Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5

- [x] 12. Add pulse-dot animation to AgentStatusRow.tsx
  - [x] 12.1 Add `animation: 'pulse-dot 2s ease-in-out infinite'` to the healthy status dot element (alongside existing `pulse-ring`)
  - Modifies: `src/web/command-center/src/views/Dashboard/AgentStatusRow.tsx`
  - Validates: Requirements 11.2

- [x] 13. Audit components.css for 8px grid and token compliance
  - [x] 13.1 Replace any hardcoded padding/margin pixel values ≥4px with `var(--space-*)` equivalents
  - [x] 13.2 Replace any hardcoded `border-radius` pixel values with `var(--radius-*)` equivalents
  - [x] 13.3 Replace any hardcoded `transition` duration/easing strings with `var(--transition-*)` equivalents
  - [x] 13.4 Replace any hardcoded `font-size` values ≥11px with `var(--font-size-*)` equivalents
  - Modifies: `src/web/command-center/src/styles/components.css`
  - Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5

## Property-Based Tests

- [ ] 14. Write property-based tests for UI polish correctness properties
  - [ ] 14.1 [PBT] Property 1: Token backward compatibility — for all existing token names, computed value is non-empty after update
  - [ ] 14.2 [PBT] Property 2: New tokens are defined — for each of the 5 new token names, computed :root value is non-empty
  - [ ] 14.3 [PBT] Property 3: StatusBadge border opacity — for any status in STATUS_CONFIG, rendered badge has border color alpha ≈ 30% of text color
  - [ ] 14.4 [PBT] Property 4: RiskBadge severity weight ordering — for any score ≥70 and any score <30, font-weight(HIGH) > font-weight(LOW)
  - [ ] 14.5 [PBT] Property 5: Pulse animation on live statuses — for HEALTHY/APPROVED/PASSED with dot=true, animation is not 'none'
  - [ ] 14.6 [PBT] Property 6: MetricCard value font dominance — for any label/value/accent, value font-size ≥ 28px and font-weight = 800
  - [ ] 14.7 [PBT] Property 7: RiskBadge always shows score — for any integer score in [0,100], rendered text includes that score
