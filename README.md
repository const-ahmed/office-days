# Office Days Tracker

A hybrid-work planning tool for teams with a monthly in-office attendance requirement. Built out of a real frustration: no existing tool gave a clear, at-a-glance view of how many office days you had planned versus how many you still needed to hit by end of month.

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat&logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/Tailwind_4-38BDF8?style=flat&logo=tailwindcss&logoColor=white)

---

## What it does

Each month, you get a calendar. Click a day once to mark it as **Planned**, click again to mark it as **Done**, click a third time to clear it. A live progress bar tracks your planned and completed days against a configurable monthly target. The target itself can be changed per month through a settings dropdown on the calendar.

There is also a shared suggestions board where you and your colleagues can leave feedback, bug reports, or feature ideas. Each person can only edit or delete their own entries.

New users are walked through the interface with a guided spotlight tour on first login.

A public demo is available on the landing page with no sign-in required, backed by in-memory state so nothing persists.

---

## Stack

- **Next.js 16** (App Router, React 19)
- **TypeScript**
- **Supabase** — PostgreSQL database and email/password authentication
- **TailwindCSS v4** — CSS-first configuration with custom theme tokens
- **Framer Motion** — calendar transitions, tooltip animations, and micro-interactions
- **Radix UI** — accessible dialog, dropdown, popover, and progress primitives
- **shadcn/ui** — component scaffolding built on top of Radix + CVA
- **date-fns** — calendar grid generation and date arithmetic
- **Vercel Analytics**

---

## Design

### Neumorphism

The UI uses a neumorphic design system — every interactive surface appears to be physically raised from or pressed into the background rather than sitting flat on top of it. The effect is achieved entirely through paired box shadows: one dark shadow cast downward and to the right, one light highlight lifted upward and to the left.

Three shadow tokens cover the full range of states:

```
--neu-raised   lifted card or button at rest
--neu-raised-sm  smaller raised element (icon buttons, chips)
--neu-inset    pressed state, active input fields
```

Neumorphism requires a surface colour that sits in the middle of the value range — not too light, not too dark — so the shadows have room to go both darker and lighter than the base. Pure white or near-black surfaces kill the effect entirely.

### Colour

**Light mode** uses `#e8ecf0`, a cool slate blue-grey. It was chosen because it reads as clean and neutral in a work context without carrying the clinical edge of a pure grey. The slight blue cast keeps it from feeling warm or playful, which felt right for a productivity tool used daily. The primary accent `#4a7fa5` is a muted steel blue — subdued enough to not compete with the status colours (amber for planned days, green for completed), but distinct enough to anchor interactive elements.

**Dark mode** shifts to `#2e3340`, a desaturated charcoal with a faint blue undertone. Keeping the same hue family across both modes means the interface feels consistent when switching, and the dark primary `#5b8fff` — slightly brighter and cooler — compensates for the reduced contrast of the darker surface.

Status colours were kept intentionally muted: amber (`#d4a017`) for planned days signals intent without urgency; green (`#3a9e6e`) for completed days reads as calm confirmation rather than celebration. Neither competes with the UI chrome at a glance.

---

## Architecture notes

- No API routes. All database reads and writes go directly through the Supabase client, with Row Level Security policies enforcing data isolation per user.
- No external state manager. Component state and `useEffect` with cancellation flags handle all async data.
- The onboarding tour is built from scratch using `getBoundingClientRect` and a dynamic SVG cutout overlay — no third-party tour library.
- The `asChild` / Slot pattern from Radix UI is used throughout so buttons can render as Next.js `<Link>` elements without losing their styles or accessibility semantics.

---

## Local setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file at the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_ADMIN_EMAIL=your_email@example.com
```

3. In your Supabase project, create the following tables:

- `office_days` — `id`, `day` (date), `status` (text), `user_id` (uuid)
- `monthly_required_days` — `user_id` (uuid), `month` (text), `required_days` (int), unique on `(user_id, month)`
- `todos` — `id`, `text` (text), `done` (bool), `user_id` (uuid), `created_at`
- `user_settings` — `user_id` (uuid), `has_seen_tour` (bool)

Enable Row Level Security on all tables and add policies scoped to `auth.uid()`.

4. Run the development server:

```bash
npm run dev
```
