---
name: doyinsoft-design-system
description: Use this skill whenever building, styling, or modifying any page or component in the DoyinSoft marketplace project — the homepage/storefront, product detail page, vendor dashboard, checkout flow, or any new page added later. It defines the exact color tokens, typography scale, spacing, and per-page layout structure approved in the wireframe. Always consult this before writing or editing anything under app/ or components/ so the UI stays pixel-consistent with the approved design, even if the request doesn't explicitly mention "wireframe" or "design system."
---

# DoyinSoft design system

A flat, neutral, content-first UI. White surfaces, hairline borders, no shadows or gradients, two font weights only. The single accent move is an inverted black/white button — everything else stays quiet so product cards and data are what stand out.

## Design tokens

Add these as CSS variables in `app/globals.css` and reference them everywhere instead of hardcoding colors, so the whole app shares one source of truth.

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f4;
  --bg-info: #e6f1fb;
  --bg-success: #eaf3de;

  --border-tertiary: #e5e5e5;
  --border-secondary: #d4d4d4;

  --text-primary: #171717;
  --text-secondary: #737373;
  --text-tertiary: #a3a3a3;
  --text-info: #0c447c;
  --text-success: #27500a;

  --radius-md: 8px;
  --radius-lg: 12px;
}
```

Typography: system sans-serif stack (`font-sans` in Tailwind is fine — no custom font import needed). Two weights only: 400 regular, 500 medium. Never use 600/700/bold. Sentence case everywhere, never Title Case or ALL CAPS.

Type scale used throughout: 11px (fine print), 12px (labels, badges, breadcrumbs), 13px (body, nav links, buttons), 14px (subheads), 16px (logo wordmark), 22px (page headline), 24px (price display).

Borders: 1px solid `var(--border-tertiary)` by default, `var(--border-secondary)` for emphasis/hover states. No box-shadows anywhere except focus rings.

Buttons: the only filled button style in this system is `background: var(--text-primary); color: var(--bg-primary);` — solid black on white. No other button colors. Outline/ghost buttons (filters, secondary nav) use a 1px border and transparent background instead.

Icons: use `lucide-react` (already a common dependency). Map: dashboard/overview → `BarChart3`, products → `Folder`, orders → `File`, payouts → `Banknote`, settings → `Settings`. Size 14–16px, inherit color from parent.

## Page layouts

Build these four pages to match this structure exactly — section by section, in this order, with this content. Treat copy (labels, placeholder names, sample data) as real default content, not lorem ipsum.

### 1. Homepage / storefront — `app/page.tsx`

Top nav (flex row, border-bottom 1px, padding-bottom 14px, margin-bottom 20px): "DoyinSoft" wordmark (16px/500) on the left, a search input (placeholder "Search software...", max-width 320px) next to it, then "Categories" and "Sell on DoyinSoft" text links (13px, secondary color), then a black "Sign in" button on the far right.

Hero block: headline "Software built for African markets" (22px/500), subhead "Desktop, mobile and web apps from independent developers" (14px, secondary), then a black "Browse software" button.

Filter pills row: "All" (active — border-secondary), "Desktop", "Mobile", "Web app", "Free" (inactive — border-tertiary, secondary text color). 12px text, pill padding 5px 12px, radius-md.

Product grid: `grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))`, gap 12px. Each card: 1px border, radius-lg, padding 12px — a 36x36 square icon placeholder (bg-secondary, radius-md), product name (13px/500), "by {vendor name}" byline (11px, secondary), price (13px, e.g. "₦15,000" or "Free").

### 2. Product detail page — `app/products/[slug]/page.tsx`

Two-column grid, `1.5fr / 1fr`, gap 24px.

Left column: breadcrumb (12px, tertiary color, "Category / Product name"), a large screenshot placeholder (bg-secondary, radius-lg, height 140px), a row of three thumbnail placeholders (48x36 each, bg-secondary, radius-md), a short description paragraph (13px, secondary, line-height 1.7), then a "System requirements" label (12px/500) with requirement text below it (12px, secondary).

Right column: a price card (1px border, radius-lg, padding 16px) showing the price (24px/500), a line of fine print "One-time purchase, license key included" (12px, secondary), a full-width black "Buy license" button, and below it small platform badges (e.g. "Windows", "macOS" — 11px, bg-secondary, radius-md pills). Below the price card, a vendor mini-card (1px border, radius-lg, padding 14px, flex row) with a 32x32 round avatar (bg-info background, text-info initials), vendor name (13px/500), and "Verified vendor" (11px, secondary).

### 3. Vendor dashboard — `app/vendor/dashboard/page.tsx`

Two-column grid, fixed 140px sidebar / flexible main area, gap 20px.

Sidebar: a vertical nav list — Overview (active: bg-secondary, font-weight 500), Products, Orders, Payouts, Settings (inactive: secondary text color). Each row has a leading icon and 13px label, padding 8px 10px, radius-md.

Main area: a row of three metric cards (`grid-template-columns: repeat(3, 1fr)`, gap 12px) — "Revenue (30d)", "Units sold", "Pending payout" — each card is bg-secondary, radius-md, padding 1rem, with a 13px secondary label and a 22px/500 value below it. Below that, a "Recent orders" label (13px/500) followed by order rows: each row is a flex line with a 1px top border, 13px text, showing product name, buyer initials (secondary), amount, and a status badge on the right ("Paid" — bg-success background, text-success color, 11px, radius-md pill).

### 4. Checkout — `app/checkout/[orderId]/page.tsx`

Max-width 420px, single column.

Order summary row at the top (flex, space-between, 1px bottom border, padding-bottom 12px): a small icon placeholder + product name on the left, price on the right.

"Payment method" label (12px/500), then a vertical list of three selectable payment options as bordered rows (radio input + label, 13px): Paystack (selected by default — border-secondary), Flutterwave, Stripe (card, international) — both unselected with border-tertiary and secondary text color.

A full-width black "Pay {amount}" button, and below it centered fine print (11px, tertiary): "License key delivered instantly after payment".

## What "exactly as the wireframe" means here

Match structure, spacing proportions, copy, and the token values above precisely — this is the approved layout, not a starting sketch to reinterpret. Where the existing scaffold's pages have placeholder Tailwind classes (gray-100, neutral-200, etc.), replace them with the CSS variables defined above so every page draws from the same token set. Keep the components functional (real data from Supabase queries already wired into the scaffold) — only the visual layer needs to change to match this spec.

---

## Prompt for Claude Code

Paste the following into Claude Code once this file is saved somewhere in the project (e.g. `.claude/skills/doyinsoft-design-system/SKILL.md`, or just point Claude Code at this file directly):

> Read `doyinsoft-design-system.md` in full before touching any code. It defines the exact design tokens and page-by-page layout for the DoyinSoft marketplace, based on an approved wireframe.
>
> Implement it across the existing Next.js project:
>
> 1. Add the CSS variables from the "Design tokens" section to `app/globals.css`.
> 2. Rebuild `app/page.tsx` (homepage), `app/products/[slug]/page.tsx` (product detail), `app/vendor/dashboard/page.tsx` (vendor dashboard), and `app/checkout/[orderId]/page.tsx` (checkout) to match the "Page layouts" section exactly — same structure, spacing, copy, and component order described there, styled using the design tokens instead of any default Tailwind grays.
> 3. Keep all existing data-fetching logic (Supabase queries, props, route params) intact — only change markup and styling, not business logic.
> 4. Use `lucide-react` for icons per the mapping given in the skill.
> 5. After each page, do a quick self-check against the corresponding wireframe section in this file and fix any structural mismatch before moving to the next page.
>
> Ask me before introducing any new color, spacing value, or component pattern not described in this file — the goal is pixel-faithful to the approved wireframe, not a fresh interpretation.
