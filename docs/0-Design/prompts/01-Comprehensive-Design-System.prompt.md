# PROMPT 1 — Comprehensive Design System for 井然 Orderly

> **HOW TO USE THIS FILE**
> Paste this **entire** document into a fresh Claude conversation ("Claude Design"). It is fully self-contained — Claude needs **no repository access**. Everything required (brand, tokens, domain, page map, constraints) is embedded below.
> Your job, Claude, is to produce a complete, modern, production-credible **design system** delivered as two artifacts: **(A)** a design-spec Markdown single-source-of-truth, and **(B)** a self-contained high-fidelity HTML style guide that renders every token and component at real fidelity.

---

## 0. Your role

You are a **Principal Product Designer + Design Engineer** building the foundational design system for an enterprise B2B SaaS. You think in tokens, semantic layers, and component contracts — not one-off screens. You write design specs an engineering team can implement verbatim, and you build hi-fi HTML that proves the system visually. You have strong opinions about **data-dense financial/operations software** (think Linear, Stripe Dashboard, Ramp, Mercury, Retool) and you reject generic "AI dashboard" aesthetics (no purple gradients, no emoji-as-icons, no meaningless glassmorphism, no fake 3D).

---

## 1. Product context — what you are designing for

**井然 Orderly** is an enterprise digital supply-chain platform for the **restaurant industry** (Taiwan market, Traditional Chinese UI). It connects restaurants and suppliers across the full **order-to-settlement** lifecycle:

> 下單 (ordering) → 配送 (delivery) → 驗收 (acceptance) → 對帳 (reconciliation) → 開票/結算 (billing/settlement)

The product's signature value is **AI-assisted reconciliation (對帳)**: collapsing manual reconciliation work from **~8 hours to ~30 minutes**. The interface is therefore **automation-first, data-dense, and trust-critical** (it shows money).

**Three-role system** — every surface belongs to one of these audiences, and they have distinct mental models:

| Role | Chinese | Primary jobs |
|------|---------|--------------|
| Restaurant | 餐廳 | Place orders, accept deliveries (photo/quantity/quality), reconcile invoices, analyze cost |
| Supplier | 供應商 | Manage incoming orders, product/SKU catalog, logistics, finance/receivables, customer relationships |
| Platform / Admin | 平台/管理 | Govern customers & suppliers, SKU/category master data, roles & permissions, billing, system health |

**Design principles already established (honor these — they are the soul of the product):**
1. **清晰優於美觀** — Clarity over beauty. Financial data must be unambiguous.
2. **效率優於完整** — Efficiency over completeness. Optimize the core reconciliation workflow.
3. **一致性優於個性** — Consistency over personality. Predictability builds trust.
4. **可及性優於炫技** — Accessibility over showiness. Serve all users in all contexts.

**Brand personality:** 專業可信 (professional & trustworthy), 智能高效 (intelligent & efficient), 簡潔明了 (clean & clear).

---

## 2. Brand foundation — GROUNDING FACTS (honor and elevate; do not discard)

This is the **current, real** design foundation. Your job is to systematize and elevate it into a coherent, modern system — **not** to throw it away. Keep the brand identity; raise the craft.

### 2.1 Primary color — "Mocha Mousse" (the brand anchor)
Full ramp (use these exact values as the primitive scale):
```
primary-50  #faf9f7
primary-100 #f0ede7
primary-200 #e3ddd3
primary-300 #d1c7b8
primary-400 #b8a894
primary-500 #a47864   ← brand anchor (Mocha Mousse)
primary-600 #8f6b56   ← hover
primary-700 #7a5a4a   ← active
primary-800 #654b40
primary-900 #533e35
```

### 2.2 Per-module accent colors (each role gets a recognizable accent)
```
restaurant  #ff6b35  (warm orange)
supplier    #00a896  (teal)
platform    #6366f1  (indigo)
```

### 2.3 Reconciliation / operational status colors (semantic, load-bearing)
```
pending     #f59e0b  amber   待處理
processing  #3b82f6  blue    處理中
approved    #10b981  green   已核准 / 自動匹配
disputed    #ef4444  red     爭議 / 差異待解
draft       #6b7280  gray    草稿
```
ERP/sync states reuse: connected=green, syncing=amber, error=red, offline=gray.

### 2.4 Feedback semantics
```
success #38A169   warning #D69E2E   error #E53E3E   info #3182CE
```

### 2.5 Neutral gray ramp
```
50 #F7FAFC  100 #EDF2F7  200 #E2E8F0  300 #CBD5E0  400 #A0AEC0
500 #718096 600 #4A5568  700 #2D3748  800 #1A202C  900 #171923
```

### 2.6 Typography
- **Chinese:** `Noto Sans TC`  ·  **Latin/numerals:** `Inter`  ·  **Mono / financial numerals:** `JetBrains Mono`
- Type scale (semantic): H1 32px/700/-0.025em · H2 24px/600 · H3 20px/600 · H4 18px/600 · Body-lg 18px · Body 16px · Body-sm 14px · Caption 12px.
- **Financial numbers are special:** always `JetBrains Mono`, `font-variant-numeric: tabular-nums`, semibold, slight letter-spacing — so columns of money align and scan.

### 2.7 Shape, spacing, elevation
- **Border radius base = 4px** (this is a brand rule). Cards 8px. Badges/pills full. Inputs 6px.
- **Spacing = 8px base scale** (4/8/12/16/24/32/48/64…).
- Shadows: soft, layered (xs→2xl). Brand-tinted shadow for reconciliation surfaces: `0 4px 12px rgba(164,120,100,0.15)`.
- Breakpoints: sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536 (mobile-first).
- Z-index system (dropdown 1000 → sticky 1100 → overlay 1300 → modal 1400 → popover 1500 → toast 1700 → tooltip 1800).

### 2.8 Accessibility (non-negotiable)
- **WCAG 2.1 AA**: ≥4.5:1 contrast for body text.
- **Touch targets ≥ 44×44px**.
- Full keyboard operability, visible focus rings, `prefers-reduced-motion` and `prefers-contrast` support, screen-reader labels, `aria-live` for async status (reconciliation updates).

### 2.9 Current implementation stack (so your specs are buildable)
Next.js 14 (App Router) · React 18 · TypeScript · **Tailwind CSS v3 + class-variance-authority (CVA)** · Radix UI primitives · `lucide-react` icons · Recharts · react-hook-form + Zod · Tailwind tokens live in `lib/theme/tokens.ts` + `tailwind.config.ts` + `app/globals.css`.
**Known debt you should design to fix:** no motion system (CSS-only today), duplicated components (two `ProductManagement`, two `UserManagement`), mixed form patterns (Controller vs raw `useState`), legacy CVA variants kept for back-compat, no Storybook, react-query v3 (stale), no i18n framework (zh-TW hardcoded).

---

## 3. WHAT TO DELIVER

Deliver **both** artifacts, in this order.

### Artifact A — Design-spec Markdown (the SSOT)
A single, well-structured Markdown document an engineer can implement verbatim. It must contain:

1. **Design principles & voice** — restated, with concrete do/don't examples in this domain (e.g., how to display a NT$ disputed amount).
2. **Token architecture — three tiers.** Define and name all three:
   - **Primitive tokens** (raw values: the color ramps, type sizes, spacing, radii, shadows, z-index above).
   - **Semantic tokens** (intent-based: `surface/base`, `surface/raised`, `text/primary`, `text/muted`, `border/subtle`, `action/primary`, `status/approved`, `status/disputed`, `money/positive`, `money/negative`…). Map every semantic token to a primitive, **for both light and dark themes**.
   - **Component tokens** (e.g., `button/primary/bg`, `table/row/hover/bg`, `kpi-card/accent`). Show the mapping chain primitive → semantic → component.
   - Also define **density modes** (`comfortable` / `compact`) as a token layer — data-dense ops tools need a compact table mode.
   - Also define **per-module theming** as a semantic overlay (restaurant/supplier/platform accent swap) without forking the whole system.
3. **Color system** — full ramps, semantic mapping, **documented contrast ratios** for every text/background pairing you rely on (prove AA), light + dark.
4. **Typography system** — families, the full scale, line-heights, the **financial/tabular numeral** rule, zh-TW + Latin mixed-script line-height guidance, truncation/wrapping rules for long Chinese strings.
5. **Spacing, layout & grid** — the 8px scale, page shell grid (sidebar + content), responsive column rules, content max-widths, the data-table density grid.
6. **Elevation & motion** — shadow tiers; **a real motion system** (durations 120/200/320ms, standard easings, what animates and what must NOT, reduced-motion fallbacks). Define named motions: page-enter, row-expand, toast-in, reconciliation-scan, confidence-bar-fill, sync-pulse.
7. **Iconography** — `lucide-react` usage rules, sizes, stroke, when icon-only is allowed (and the 44px target rule), the domain icon set (order, delivery, acceptance, reconciliation, invoice, supplier, restaurant, SKU, category).
8. **Component specifications** — for every component in §4, give: anatomy, variants, sizes, all states (default/hover/focus/active/disabled/loading/error/selected), accessibility contract, content rules, and the token references it consumes.
9. **Content & i18n guidance** — voice, button verbs (zh-TW), number/currency/date formatting (NT$, 民國 vs 西元 dates, thousands separators), empty-state copy patterns, error message patterns, and structure that is i18n-ready (no concatenated strings).
10. **Accessibility spec** — the AA checklist, focus order rules, keyboard maps for complex widgets (data-grid, command palette, reconciliation workspace), `aria-live` strategy.
11. **Token export** — emit the token set in **three formats**: a `tokens.ts` TS object, a `:root` CSS-variables block (light + `.dark`), and a Tailwind `theme.extend` config — so it drops into the existing stack.

### Artifact B — Self-contained hi-fi HTML style guide (the proof)
A **single `.html` file** that renders the entire system at high fidelity. Requirements:
- Self-contained and runnable by opening in a browser: Tailwind via CDN (configured to the tokens), Google Fonts (`Noto Sans TC`, `Inter`, `JetBrains Mono`), lucide icons via CDN. No build step, no external app.
- **Theme switcher** in the page: Light / Dark, and Restaurant / Supplier / Platform accent — all live.
- **Density switcher**: Comfortable / Compact.
- Render, with real spacing and shadows (not screenshots, real DOM):
  - The full color system (every ramp + every semantic token swatch, each annotated with its contrast ratio).
  - The type scale in zh-TW + English, including the financial tabular-numeral demo (a column of NT$ amounts that align).
  - Every component from §4, in every variant/size/state, with realistic **illustrative** zh-TW restaurant-domain sample content (clearly placeholder, e.g. supplier 「新鮮蔬果行」, item 「牛番茄 10kg」, amount NT$1,280). Label the page header: *"Sample data for design illustration only."*
  - Domain pattern showcases: a reconciliation match-row with confidence indicator, a KPI card row, a status-flow stepper (下單→驗收→對帳→結算), an ERP-sync indicator, a data-table in both densities, an empty state, a loading skeleton, a toast stack, a modal, a command palette.
- High craft: correct optical alignment, real focus rings, hover states wired with minimal JS, dark mode genuinely re-tuned (not just inverted).

---

## 4. Component coverage (minimum — the system must define all of these)

**Foundations & inputs:** Button (variants: solid/outline/ghost/link/destructive × sizes xs–xl × per-module colorScheme; states incl. loading + icon slots), Input, Textarea, Select (single + multi + searchable), Combobox, Checkbox, Radio, Switch, Label, Slider, DatePicker / DateRange (民國/西元), File/Photo upload (drag + camera for mobile acceptance), Business-identifier input (統一編號 validation feedback).

**Data display:** Data Table / Data Grid (sortable, filterable, sticky header, row-select, bulk actions, density modes, pagination + virtualized large lists, expandable rows, column pinning), KPI / Stat card (with trend + accent bar), Badge / Status pill (full status taxonomy), Tag, Avatar, Tooltip, Description list, Timeline / Audit trail, Tree (customer hierarchy / category tree), Charts (line/bar/area/donut via Recharts conventions + financial number formatting).

**Navigation & shell:** App shell (sidebar + header + content), Sidebar nav (collapsible, badges, per-role theming, "view-as" indicator banner), Top header (org switcher, role/view switcher, notifications bell, user menu), Breadcrumb, Tabs, Pagination, Command palette (⌘K global search/actions), Stepper (multi-step forms & onboarding).

**Feedback & overlays:** Modal / Dialog (sizes), Drawer / Sheet (side panel for detail-without-navigation), Toast / Notification, Inline alert / Banner, Empty state, Skeleton loaders, Progress (bar + ring), Confirmation dialog (esp. destructive), Popover, Context menu.

**Domain-specific patterns (design these as first-class, named patterns):**
- **Confidence indicator** — for AI auto-match certainty (high/medium/low; gradient badge + mono value).
- **Match / diff row** — invoice-vs-order line comparison showing matched / quantity-diff / price-diff / unmatched, with the disputed delta highlighted.
- **Status-flow stepper** — the order lifecycle 下單→配送→驗收→對帳→結算 with current-state emphasis.
- **Financial amount** — positive/negative/neutral money display, tabular, with currency.
- **ERP sync indicator** — connection state + pulse.
- **Reconciliation workspace pattern** — split layout: live feed + work surface + detail sidebar.
- **"View-as / impersonation" banner** — platform admin viewing a restaurant/supplier.

---

## 5. Quality bar — what "good" means here (and what to avoid)

**Do:** treat this like Linear/Stripe/Ramp-grade B2B software. Tight optical spacing. Restrained color (color carries meaning — status, money, module — not decoration). Real information hierarchy. Numbers that align. Dark mode that is genuinely re-tuned. Motion that clarifies state change, never decorates.

**Avoid (AI-slop red flags):** generic purple/blue gradients, glassmorphism without purpose, emoji used as icons, oversized hero marketing styling inside an operations tool, low-information "pretty" cards, centered everything, fake data that implies precision it doesn't have, inconsistent radii, drop shadows that float nothing.

---

## 6. Constraints & acceptance checklist

**Constraints:**
- Keep the brand anchor (Mocha Mousse `#a47864`, 4px radius, the three module accents, the status taxonomy). You may refine tints, add a dark theme, and tighten the scale — but a user must still recognize it as Orderly.
- Everything must be **AA accessible** and **buildable on the stated stack** (Tailwind + CVA + Radix). Token names must be implementation-ready.
- zh-TW first; design must be i18n-ready (no baked-in string concatenation, room for longer translations).

**Before you finish, self-verify against this checklist and report pass/fail per item:**
- [ ] Three-tier token model defined, with primitive→semantic→component chains shown, light + dark + density + per-module.
- [ ] Every semantic text/bg pairing has a stated contrast ratio ≥ AA.
- [ ] All §4 components specified with full state matrices + a11y contracts.
- [ ] Domain patterns (confidence, match-diff, status-flow, financial amount, ERP sync, reconciliation workspace) specified.
- [ ] Tokens exported as `tokens.ts` + CSS vars + Tailwind config.
- [ ] Single self-contained HTML style guide renders everything, with live Light/Dark + module + density switchers.
- [ ] Sample data clearly labelled illustrative; no fabricated precision.
- [ ] No AI-slop red flags from §5.

**Output order:** (1) a 1-paragraph statement of your design intent and the 2–3 highest-leverage upgrades you're making to the current foundation; (2) Artifact A (the spec); (3) Artifact B (the single HTML file). If the response would be truncated, deliver the spec first, then the HTML in a clearly-marked continuation.
