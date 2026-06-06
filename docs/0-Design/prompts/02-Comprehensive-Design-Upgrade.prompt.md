# PROMPT 2 — Comprehensive Design Upgrade for 井然 Orderly (page-by-page, action-by-action)

> **HOW TO USE THIS FILE**
> Paste this **entire** document into a fresh Claude conversation ("Claude Design"). It is fully self-contained — **no repository access needed**. It assumes the design-system foundation from "PROMPT 1" exists; a condensed version of that foundation is embedded in §2 so this prompt also stands alone.
> Your job, Claude, is a **complete product redesign**: explore **three design directions**, let the reader pick one, then produce **ultra-high-fidelity, page-by-page, button-by-button, action-by-action** prototypes across every real flow — delivered as self-contained HTML and an accompanying design spec.

---

## 0. Your role & mandate

You are a **Principal Product Designer** leading a full redesign of an enterprise restaurant supply-chain SaaS. You design **end-to-end flows**, not isolated screens: every page is specified down to each button, each state, each interaction, each keyboard path. You produce **hi-fi HTML prototypes** that look and behave like the real product, plus a tight written spec. You explicitly explore **multiple design directions** before committing, so the reader can choose.

Deliverables (both):
- **Artifact A — hi-fi HTML prototypes** (self-contained single files; Tailwind CDN + Google Fonts + lucide CDN; realistic zh-TW illustrative data; light/dark; responsive). Phased — see §6.
- **Artifact B — an upgrade spec** in Markdown: per-page redesign rationale, component/interaction inventory, state lists, and the cross-cutting upgrades you applied.

---

## 1. Product context (read before designing)

**井然 Orderly** — Taiwan-market, Traditional-Chinese B2B platform connecting **restaurants** and **suppliers** across the **order-to-settlement** lifecycle:

> 下單 → 配送 → 驗收 → 對帳 → 開票/結算

Signature value: **AI-assisted reconciliation (對帳)** cutting manual work **~8h → ~30min**. The product is **data-dense, automation-first, money-critical**. Three roles, distinct mental models: **Restaurant 餐廳**, **Supplier 供應商**, **Platform/Admin 平台**. Established principles to honor: 清晰優於美觀 · 效率優於完整 · 一致性優於個性 · 可及性優於炫技.

---

## 2. Design foundation (condensed — full version in PROMPT 1)

- **Primary "Mocha Mousse":** `#a47864` (ramp 50 `#faf9f7` → 900 `#533e35`; hover `#8f6b56`, active `#7a5a4a`).
- **Module accents:** restaurant `#ff6b35` · supplier `#00a896` · platform `#6366f1`.
- **Status taxonomy:** pending `#f59e0b` · processing `#3b82f6` · approved `#10b981` · disputed `#ef4444` · draft `#6b7280`. Feedback: success `#38A169` · warning `#D69E2E` · error `#E53E3E` · info `#3182CE`.
- **Type:** `Noto Sans TC` (zh) · `Inter` (Latin) · `JetBrains Mono` (financial, tabular-nums). H1 32/700 · H2 24/600 · H3 20/600 · Body 16 · Caption 12.
- **Shape/space:** radius base **4px** (cards 8px, pills full); 8px spacing scale; soft layered shadows; brand-tint reconciliation shadow `rgba(164,120,100,0.15)`.
- **A11y:** WCAG **AA** (≥4.5:1), touch **≥44px**, full keyboard, visible focus, reduced-motion support, `aria-live` for async reconciliation status.
- **Stack (so designs are buildable):** Next.js 14 App Router · React 18 · Tailwind v3 + CVA · Radix UI · lucide-react · Recharts · react-hook-form + Zod.
- **Known debt to fix in this upgrade:** no motion system, duplicated components, mixed form patterns, no command palette, no global search, stale data layer, no i18n scaffolding, inconsistent table density. Treat these as upgrade opportunities.

---

## 3. THREE DESIGN DIRECTIONS (produce all three, then recommend one)

Before detailing pages, design and present **three differentiated directions**. For each: a name, a one-line thesis, the visual moves (color/type/density/shape/motion), and **one representative screen rendered hi-fi in all three** so they can be compared side-by-side (use the same screen for fair comparison — recommended: the **Restaurant Reconciliation workspace**, the product's hero surface).

- **Direction A — "Refined Mocha" (evolution, low risk).** Keep the current identity; elevate craft: tighter spacing, real dark mode, refined Mocha palette, better data-table density, a proper motion layer. The safe, ship-incrementally path.
- **Direction B — "Operations OS" (bold redesign, high differentiation).** A dark-first, command-center aesthetic for power users: keyboard-driven (⌘K everywhere), maximal information density, monospace-forward financial surfaces, Linear/Bloomberg-terminal energy. Re-interprets (does not abandon) the brand — Mocha becomes an accent on a neutral-dark canvas.
- **Direction C — "Warm Editorial" (approachable, brand-forward).** Leans into the warm Mocha hospitality feel for less-technical restaurant staff: generous whitespace, larger type, friendlier empty/onboarding states, softer cards — while keeping data views rigorous. Optimizes for first-time and occasional users.

After presenting the three, **give a clear recommendation with rationale** (which direction best serves a money-critical, data-dense, multi-role ops tool — and why), then proceed to §4–§5 **in the recommended direction** (note the reader may override the choice).

---

## 4. THE PAGE MAP — every real surface to redesign (grouped by role)

These are the **actual** application routes. Redesign each. For **every** page deliver: **layout & shell**, **primary content components**, **every action button (primary / secondary / destructive / bulk)**, **all states (empty / loading / error / success / partial)**, **key interactions** (hover, select, expand, inline-edit, drag, optimistic update, confirm), and **keyboard/accessibility** notes.

### 4.1 Auth & onboarding (shared shell: split-screen, brand left / form right)
- `/login` — email + password, **MFA/TOTP** step, "remember me", error states (bad creds, locked, MFA required), forgot-password link.
- `/register` — **3-step wizard**: (1) email+password, (2) organization type (restaurant vs supplier), (3) user profile. Stepper, validation, back/next, review.
- `/forgot-password` — request → email-sent state → code entry → reset → success.
- `/auth/supplier-invite` — invitation-code verification → invite details display → accept/decline.
- `/auth/supplier-onboarding` — post-accept account setup steps.

### 4.2 Restaurant 餐廳 (accent `#ff6b35`; nav: 儀表板總覽 / 訂單管理 / 驗收管理 / 對帳 / 供應商管理 / 財務報表 / 系統設定 / 幫助中心)
- `/restaurant` — **Dashboard**: KPI row, reconciliation status, recent orders, performance, quick actions.
- `/restaurant/orders` — **Order management**: list + filters + create-order flow + order detail (line items, status, supplier).
- `/restaurant/acceptance` — **Delivery acceptance**: list of incoming deliveries → acceptance detail with **photo capture, quantity confirm, quality check, discrepancy logging**. (Design the **mobile** variant carefully — staff do this on a phone at the loading dock; camera-first, large touch targets, one-handed.)
- `/restaurant/reconciliation` — **THE HERO SURFACE.** AI reconciliation workspace: live auto-match feed + work surface + detail sidebar. Confidence indicators, match/diff rows, one-click approve, dispute-resolution flow, bulk approve, filters by status. This must feel like the "8h→30min" promise made visible.
- `/restaurant/suppliers` — supplier relationships, performance, contact.
- `/restaurant/analytics` — cost/financial analysis, charts, export.
- `/restaurant/settings` · `/restaurant/help`.

### 4.3 Supplier 供應商 (accent `#00a896`; nav: 供應商總覽 / 訂單管理 / 產品目錄 / SKU / 物流配送 / 財務管理 / 客戶關係 / 即時溝通 / 數據分析 / 系統設定 / 幫助支援)
- `/supplier` — **Dashboard**: order status, revenue analytics, customer insights, upcoming deliveries.
- `/supplier/orders` — order management with stats, filters, status tracking, **bulk actions**, advanced search builder, order-detail modal, export.
- `/supplier/products` — product catalog: add/edit/filter, image upload, **bulk import/export**.
- `/supplier/skus` — SKU inventory: public/private SKU types, **multi-supplier price comparison**.
- `/supplier/customers` — customer relationships, segments, preference analysis.
- `/supplier/logistics` — delivery scheduling, **delivery map**, vehicle management, transport status.
- `/supplier/finance` — **5 tabs**: 財務總覽 / 帳單 / 月結單 / 收付款 / 評級權益 (financials / billing / statements / payments / rating-benefits). Invoice manager, receivables tracker, payment analytics, payment history.
- `/supplier/onboarding` — progress tracker: company info → categories → SKU → pricing.
- `/supplier/messages` — real-time chat with restaurant customers (notification bell, live widget).
- `/supplier/analytics` · `/supplier/settings` (profile sections: basic info, operating hours, contact prefs, certifications, delivery zones) · `/supplier/help`.

### 4.4 Platform / Admin 平台 (accent `#6366f1`; nav: 平台總覽 / 客戶管理 / 供應商管理 / SKU管理 / 類別管理 / 角色管理 / 使用者管理 / 計費管理)
- `/platform` — platform overview: business + operational KPIs.
- `/platform/customers` — **customer hierarchy** management (companies / groups / locations; tabs: overview / analytics / companies / groups / locations); tree navigation.
- `/platform/suppliers` — supplier data, performance, contracts, approval workflow.
- `/platform/products` — **SKU master**: multi-supplier pricing, batch tracking, expiry management.
- `/platform/categories` — category management: hierarchy tree, product mapping, standardization, category editor.
- `/platform/roles` (+ `/new`, `/[id]`, `/[id]/edit`, `/matrix`) — **role management** incl. a **permission matrix** (roles × permissions grid editor) — a genuinely hard, data-dense surface; design it well.
- `/platform/users` (+ `/[id]`) — user account management, lifecycle, permissions.
- `/platform/billing/overview` — revenue, GMV, users, activity feed.
- `/platform/billing/reconciliation` — billing reconciliation.
- `/platform/billing/restaurant-contracts` · `/platform/billing/supplier-contracts` — contract management.

### 4.5 System admin
- `/admin/dashboard` — platform monitoring KPIs + system status.
- `/admin/users` — user lifecycle.
- `/admin/system/health` — real-time service health, performance metrics, sync status.

### 4.6 Cross-cutting elements (design once, used everywhere)
App shell (sidebar + header), per-role themed sidebar with badges + collapse, header (org switcher, role/**view-as** switcher, notification bell, user menu), **global command palette (⌘K)**, global search, toast system, confirmation dialogs, the **"檢視模式 / view-as" banner** when a platform admin impersonates a restaurant/supplier.

---

## 5. END-TO-END FLOWS — design these as connected journeys (action-by-action)

Beyond individual pages, storyboard these **multi-screen journeys**, showing each step, each decision branch, each system response. For every action specify: the trigger control, the optimistic UI, the success state, the failure/edge state, the confirmation (if destructive), and what the user sees next.

1. **Order-to-settlement spine (restaurant):** create order → submit → supplier confirms → delivery → **acceptance (photo + qty + quality + discrepancy)** → invoice arrives → **reconciliation auto-match** → approve matched / **resolve disputed** → settlement.
2. **Reconciliation deep-dive (the hero):** auto-match runs → confidence-scored results stream into live feed → user triages: bulk-approve high-confidence, inspect medium, **resolve each disputed line** (see order vs invoice diff, adjust/accept/reject, leave note, escalate) → batch close → audit trail.
3. **Supplier order fulfillment:** receive order → confirm/partial/reject → schedule logistics → dispatch → mark delivered → invoice/settlement.
4. **Supplier onboarding:** invite → account setup → company info → categories → SKU upload → pricing → go-live.
5. **Platform governance:** create role → assign permissions via matrix → invite/assign users → set up customer hierarchy → configure billing contract.

For each flow, also show the **mobile** path where it's realistic (acceptance is the priority mobile flow).

---

## 6. OUTPUT FORMAT & PHASING (so this stays tractable and reviewable)

Deliver in **phases**, pausing for the reader's pick after Phase 1:

- **Phase 1 — Directions.** §3: three directions described + the **same hero screen (Reconciliation workspace) rendered hi-fi in all three** as one self-contained HTML comparison file (a toggle to switch A/B/C in-page). End with your recommendation. **Then stop and ask the reader to confirm a direction.**
- **Phase 2 — Foundation + shell, in the chosen direction.** The app shell, sidebar (all 3 role themes), header, command palette, and the shared component kit as one hi-fi HTML file with light/dark toggle.
- **Phase 3+ — Pages by role**, in batches (Auth → Restaurant → Supplier → Platform → Admin). Each batch is a self-contained hi-fi HTML file containing that group's pages, each page rendered full-fidelity with: realistic zh-TW illustrative data, all primary/secondary/destructive actions visible and labelled, at least the empty + loading + error + populated states shown (use tabs/toggles within the file to switch states), responsive (show the mobile acceptance flow explicitly).
- **Per phase, also output the matching section of Artifact B** (the spec): for each page, a short redesign rationale + a bullet inventory of components, actions (button-by-button), states, and keyboard/a11y notes.

**HTML technical requirements (every file):** single file, opens in a browser with no build; Tailwind via CDN configured to the §2 tokens; Google Fonts `Noto Sans TC` + `Inter` + `JetBrains Mono`; lucide icons via CDN; minimal vanilla JS for toggles/tabs/hover/⌘K demo; real focus rings; genuine (re-tuned) dark mode; **header note on every file: "Sample data for design illustration only — not real records."**

---

## 7. Quality bar & guardrails

**Aim for:** Linear / Stripe Dashboard / Ramp / Mercury / Retool craft. Information hierarchy first. Color = meaning (status, money, module), not decoration. Money is tabular and aligned. Density is deliberate (offer compact mode for ops users). Motion clarifies state, never decorates. Dark mode genuinely re-tuned. Every destructive action confirmed. Every async state has loading + error, not just the happy path.

**Avoid (AI-slop):** purple/blue gradients, purposeless glassmorphism, emoji-icons, marketing-hero styling inside an ops tool, pretty-but-empty cards, centered-everything, fabricated precision in numbers, mixed radii, floating shadows.

**Honor the brand:** Mocha `#a47864`, 4px radius, the three module accents, the status taxonomy must survive even in the bold direction — a user must still recognize Orderly.

**Self-verify before finishing each phase (report pass/fail):**
- [ ] Every page in §4 for this batch is rendered hi-fi with all required states.
- [ ] Every action is present and labelled (primary/secondary/destructive/bulk); destructive ones confirm.
- [ ] The reconciliation hero clearly communicates the 8h→30min automation value.
- [ ] Mobile acceptance flow shown.
- [ ] AA contrast, 44px targets, visible focus, keyboard paths noted.
- [ ] zh-TW illustrative data, clearly labelled; no fabricated precision.
- [ ] Brand still recognizable; no §7 AI-slop red flags.

**Start now with Phase 1 (the three directions + the hero-screen comparison), then stop and ask the reader to choose a direction before continuing.**
