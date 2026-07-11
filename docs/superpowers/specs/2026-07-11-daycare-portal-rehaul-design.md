# St. Joseph Daycare Portal — Complete Rehaul Design Spec

**Date:** 2026-07-11
**Branch strategy:** clean feature branches off `main`, one per PR
**Direction (approved):** Warm & trustworthy — professional structure, human warmth

---

## 1. Context & goals

St. Joseph Daycare Center (Barangay Sto. Domingo, Cainta) currently runs enrollment
on paper + Google Forms. This portal (React 18 + Vite + TS + Tailwind + Supabase) is
the digitalization effort. It works but is a "vibecode mess": three god-files
(`StaffDashboard` 2.3k, `EnrollmentForm` 2.1k, `AdminDashboard` 1.6k lines), a
minified `Contact.tsx`, an empty Tailwind theme, state-based routing, generic
slate/blue "admin template" styling with no warmth, and fetch-on-mount messaging.

**Goals**
1. **Design** — a cohesive, warm-professional design system applied everywhere.
2. **Flow / UX** — clearer information architecture and task flows for all 3 roles.
3. **Editable-database UX** — everything overridable/editable with proper role perms,
   inline where sensible, always audited (activity_logs already exists).
4. **Live** — real-time messaging (Supabase Realtime) replacing fetch-on-mount.
5. **Maintainability** — decompose god-files, kill minified code, shared primitives.

**Non-goals (YAGNI):** new backend services, mobile-native apps, i18n, payment,
attendance/billing modules. Keep Supabase + GitHub Pages deploy.

---

## 2. Design system — "Warm & Trustworthy"

A caring community school that is still a credible data tool. Warmth via palette,
type, and radius; professionalism via structure, density, and restraint.

### Palette (semantic tokens, CSS variables + Tailwind)
- **Brand / Primary — Teal "Pine":** trust, calm, growth. `#0F766E` deep → `#14B8A6`
  light. Used for primary actions, active nav, links, focus rings.
- **Accent — Marigold "Sun":** warmth, childhood, Filipino sunshine. `#F59E0B` →
  `#FBBF24`. Used sparingly for highlights, badges, emphasis — never for destructive.
- **Neutrals — warm "Ink & Sand":** warm-tinted grays (stone), NOT cold slate.
  Page bg soft cream `#FBF7F0` / `#F7F3EC`; surfaces warm white `#FFFFFF`/`#FBFAF7`;
  text ink `#1C1917`; muted `#78716C`; border `#EAE3D9`.
- **Status:** success `#16A34A`, warning `#D97706`, danger `#DC2626`, info = brand teal.
  Each with a soft tint background for chips/alerts.
- **Dark mode:** optional, tokens authored to allow it later; not required for v1.

### Typography
- **Display / headings:** `Fraunces` (optical soft serif) — warm, human, distinctive.
- **UI / body:** `Plus Jakarta Sans` (friendly geometric humanist) — clean, legible.
- Scale: display 30–48, h1 24–30, h2 20, h3 16–18, body 14–15, small 12–13.
- This serif-display + humanist-body pairing is deliberately non-templated.

### Shape, depth, motion
- Radius: cards `rounded-2xl` (16px), controls `rounded-xl` (12px), chips full.
- Shadows: soft, warm-tinted, layered (`shadow-sm`/`shadow-md` retuned).
- Motion: framer-motion already present; subtle enter/`y` transitions, respectful of
  `prefers-reduced-motion`. No gratuitous animation.

### Tokens live in
- `tailwind.config.js` `theme.extend` (colors, fontFamily, radius, shadow, keyframes).
- `src/index.css` `:root` CSS variables + base element styles + font `@import`.

---

## 3. Shared UI primitives (`src/components/ui/`)

Build once, reuse everywhere — this is what makes the whole app cohesive and is the
biggest lever on "professional." Each is small, typed, headless-ish, token-driven:

`Button` (variants: primary/accent/subtle/ghost/danger, sizes, loading state) ·
`Card` (+ `CardHeader`/`CardBody`) · `Input` / `Textarea` / `Select` (labels, error,
hint, icon slots) · `Field` (label+control+error wrapper) · `Badge`/`StatusPill` ·
`Modal`/`Dialog` (focus trap, ESC, backdrop) · `Toast` (global provider) ·
`Tabs` · `Table` primitives (`DataTable` with sort/filter/empty/loading) ·
`Avatar` · `EmptyState` · `Skeleton` · `Tooltip` · `SegmentedControl` ·
`ConfirmDialog` (for destructive/irreversible edits) · `PageHeader`.

Accessibility baked in: labels, `aria-*`, keyboard nav, visible focus, 4.5:1 contrast.

---

## 4. Information architecture & flow

Keep the state-based nav (introducing react-router is out of scope) but clean it and
make an explicit `AppShell` (sidebar + topbar + content) driven by a typed route map.

### Guardian
- **Home** — CMS hero, highlights, announcements, and a **clear enrollment
  progress tracker** (Apply → Requirements → Review → Enrolled) with next-step CTA.
- **Enrollment** — decompose the 2.1k-line form into a real **multi-step wizard**
  (Child → Guardians → Household/Income → Health → Program/Section → Review) with
  a persistent stepper, per-step validation, save-as-draft, and a Review summary.
- **Requirements** — clearer checklist + upload states (per-doc status chips).
- **My Children** — card/list of children with status + quick links.
- **Messages** — real-time chat with staff (see §6).
- **Profile** — account + guardian details, editable.

### Staff
- **Dashboard** — enrollment workqueue: filter by status/program/section, bulk +
  inline status changes, applicant detail drawer with full editable record.
- **Sections** — assign/rename sections.
- **Messages** — real-time inbox (all conversations).
- **Homepage / Contact CMS** — edit site_content live with preview.
- **Activity Logs** — audit viewer with filters.

### Admin (superset of staff)
- **Admin Dashboard** — operational overview, program **age-rule editor**, **backup /
  restore** package builder, admin maintenance.
- Everything staff has.

---

## 5. Editable-database UX ("like editing a database")

Principle: any record a role may change is editable in place, with guardrails.
- **Inline edit** for simple fields (status, section, names) via editable cells /
  popovers; **detail drawer/modal** for full records (enrollment form_data, profile).
- **Field-level permissions** enforced by existing Supabase RLS + `current_app_role()`;
  UI hides/disables what the role can't change (never rely on UI alone).
- **Confirm on destructive/irreversible** actions (`ConfirmDialog`); soft feedback via
  toasts; optimistic updates with rollback on error.
- **Everything audited** — writes already flow through `activity_logs` triggers; extend
  coverage where the redesign adds new editable surfaces.
- **Validation** shared between form + DB constraints (e.g., program/age via `ageRules`).

No schema-breaking changes required for v1; additive migration only for realtime chat.

---

## 6. Real-time messaging (Supabase Realtime)

Replace fetch-on-mount contact/reply model with live chat.

- **Data:** keep `contact_messages` as the conversation/thread row; add a normalized
  **`message_replies`** table (`id, conversation_id, author_id, author_name,
  author_role, body, created_at`) instead of the `replies` jsonb blob, so realtime
  row-inserts stream cleanly. Migrate existing jsonb replies in the SQL migration.
  RLS mirrors existing contact_messages policies (owner + staff/admin).
- **Client:** a `useRealtimeConversation(conversationId)` /
  `useRealtimeInbox()` hook subscribing to Postgres changes via
  `supabase.channel(...).on('postgres_changes', ...)`. Live append, unread badges,
  typing-optional. Graceful fallback to fetch if realtime unavailable.
- **UI:** proper chat surface (message list, composer, conversation list, unread,
  timestamps, role labels) shared between guardian "Messages" and staff inbox.

Additive migration file: `backend/supabase/migrations/2026-07-11-realtime-messaging.sql`.
`schema.sql` stays the canonical full schema; migration is idempotent.

---

## 7. Code structure / decomposition

- `src/components/ui/` — primitives (§3).
- `src/components/app/` — `AppShell`, `Sidebar`, `Topbar`, `PageHeader`, route map.
- `src/features/enrollment/` — wizard steps + `EnrollmentForm` orchestrator (was 2.1k).
- `src/features/staff/` — dashboard split into `EnrollmentQueue`, `ApplicantDrawer`,
  `SectionManager`, filters (was 2.3k).
- `src/features/admin/` — `AuditViewer`, `AgeRuleEditor`, `BackupRestore` (was 1.6k).
- `src/features/messaging/` — chat components + realtime hooks.
- `src/lib/` — keep existing data libs; add `messages.ts`, `useRealtime.ts`.
- Kill minified files; consistent formatting; no dead code (`Dashboard.tsx` is orphaned
  — remove or repurpose).

Target: no single component file > ~400 lines.

---

## 8. PR breakdown (each reviewed → labeled `ready-to-merge` → merged)

1. **PR1 — Design system foundation:** tokens (tailwind + index.css), fonts, and the
   full `components/ui/` primitive kit + a hidden style reference. No behavior change.
2. **PR2 — App shell & auth:** `AppShell`/`Sidebar`/`Topbar`/route map, redesigned
   Login/Signup/Reset/MFA/Access-gate pages on the new system.
3. **PR3 — Guardian experience:** Home (with progress tracker), Enrollment wizard
   (decomposed), Requirements, My Children, Profile.
4. **PR4 — Staff & Admin:** decomposed + redesigned dashboards, editable-database UX,
   CMS managers, activity logs, admin tools.
5. **PR5 — Real-time messaging:** migration + `message_replies` + realtime hooks +
   chat UI for guardian & staff.

PRs are drafts by default, target `main`, descriptive titles. Ordered so each builds on
the previous; earlier PRs merge first. Where safe, later PRs branch off the prior
branch to avoid churn, then rebase onto `main` as each merges.

---

## 9. Testing / verification

- `npm run build` (tsc + vite) must pass for every PR.
- `npm run lint` clean (or no worse than baseline).
- Manual/browser verification of each redesigned flow (per `verify` skill) before
  labeling a PR `ready-to-merge`.
- Realtime chat verified with two sessions (guardian + staff) live-updating.
- No secrets committed; `.env` stays untracked.

---

## 10. Risks & mitigations

- **Scope is large** → staged PRs; each independently valuable and shippable.
- **Parallel work conflicts** (shared `App.tsx`, `Sidebar`) → foundation + shell land
  first; later work builds on stable interfaces.
- **Realtime needs a schema change** → additive, idempotent migration; jsonb replies
  migrated; fallback path if Realtime is disabled on the project.
- **Design cohesion** → single source of truth in tokens + primitives; pages compose
  primitives rather than re-styling ad hoc.
