# Shadcn/UI Library Audit Report

**Task:** FN-003
**Date:** 2026-05-24
**Scope:** `libs/ui/src/components/ui/` (22 components) + `apps/web/src/client/` (~23 consumer files)

---

## Executive Summary

The Lattice UI library (`@lattice/ui`) ships 22 components that form the foundation of the web app's visual layer. While the library covers the essential shadcn/ui primitives (Accordion, Avatar, Badge, Button, Card, Dialog, DropdownMenu, Input, Select, Tabs, Tooltip, etc.), it suffers from **systemic hardcoded color values** that bypass the CSS variable system defined in `globals.css`. This is the single most critical finding: over **60 hardcoded color references** across the UI library and web app consumer code should be tokenized to use CSS variable utilities (e.g., `bg-primary` instead of `bg-gray-900`, `bg-destructive` instead of hardcoded reds).

The library also has **architectural inconsistencies**: some components lack `"use client"` directives, `forwardRef` usage is inconsistent, `displayName` assignments are spotty, and the `data-slot` pattern is applied selectively (8 of 22 components use it). The `components.json` file points to a stale path (`@/client/components/ui`) that does not exist. The `replace-imports.ts` migration script suggests a past partial migration from `@/client/` to `@lattice/ui` that was never fully completed.

**23 standard shadcn/ui components are missing**, including critical form primitives (Checkbox, RadioGroup, Switch, Slider) and UX patterns (Popover, Progress, Alert, Collapsible, HoverCard, Command). Many of these rely on Radix primitives that are already installed in `package.json`, meaning they can be implemented without new npm dependencies.

The **upgrade path** is clear: Phase 1 tokenizes all hardcoded values in existing components, Phase 2 fixes web app overrides, Phase 3 adds missing components, and Phase 4 fixes configuration.

---

## 1. Component Inventory

| Component | Radix Primitives | CVA Variants | data-slot | "use client" | forwardRef | Typed Props | DisplayName |
|-----------|-----------------|--------------|-----------|--------------|------------|-------------|-------------|
| Accordion | `@radix-ui/react-accordion` (Root, Item, Trigger, Header, Content) | No | No | ✅ | ✅ (Item, Trigger, Content) | `ComponentPropsWithoutRef` | ✅ (Item, Trigger, Content) |
| Avatar | `@radix-ui/react-avatar` (Root, Image, Fallback) | No | No | ✅ | ✅ (all 3) | `ComponentPropsWithoutRef` | ✅ (all 3) |
| Badge | None | ✅ (6 variants) | No | ✅ | No | `HTMLAttributes + VariantProps` | ❌ |
| Banner | None | ✅ (5 variants) | No | ✅ | ✅ | Custom interface | ✅ |
| Button | `@radix-ui/react-slot` | ✅ (8 variants × 5 sizes) | ✅ | ❌ | No | `ComponentProps<"button"> + VariantProps` | ❌ |
| Card | None | No | ✅ (7 sub-slots) | ❌ | No | `ComponentProps<"div">` | ❌ |
| Container | None | No | No | ✅ | ✅ | Custom interface | ✅ |
| Dialog | `@radix-ui/react-dialog` (Root, Trigger, Portal, Close, Overlay, Content, Header, Footer, Title, Description) | No | No | ✅ | ✅ (Overlay, Content, Title, Description) | `ComponentPropsWithoutRef`, `HTMLAttributes` | ✅ (Overlay, Content, Title, Description) |
| DropdownMenu | `@radix-ui/react-dropdown-menu` (16 sub-components) | No | ✅ (16 sub-slots) | ✅ | No | `ComponentProps<typeof Primitive>` | ❌ |
| FullPageLoader | None | No | No | ❌ | No | Custom interface | ❌ |
| Input | None | No | ✅ | ❌ | No | `ComponentProps<"input">` | ❌ |
| Label | `@radix-ui/react-label` | No | ✅ | ✅ | No | `ComponentProps<typeof Primitive>` | ❌ |
| ScrollArea | `@radix-ui/react-scroll-area` (Root, Viewport, Scrollbar, Thumb, Corner) | No | ✅ (4 sub-slots) | ✅ | No | `ComponentProps<typeof Primitive>` | ❌ |
| Section | None | No | No | ✅ | ✅ | Custom interface | ✅ |
| Select | `@radix-ui/react-select` (Root, Group, Value, Trigger, Content, Label, Item, Separator, ScrollUpButton, ScrollDownButton) | No | ✅ (10 sub-slots) | ✅ | No | `ComponentProps<typeof Primitive>` | ❌ |
| Separator | `@radix-ui/react-separator` | No | No | ✅ | ✅ | `ComponentPropsWithoutRef` | ✅ |
| Skeleton | None | No | ✅ | ❌ | No | `ComponentProps<"div">` | ❌ |
| Table | None | No | No | ❌ | ✅ (all 8 sub-components) | `HTMLAttributes`, `ThHTMLAttributes` | ✅ (all 8) |
| Tabs | `@radix-ui/react-tabs` (Root, List, Trigger, Content) | No | No | ✅ | ✅ (List, Trigger, Content) | `ComponentPropsWithoutRef` | ✅ (List, Trigger, Content) |
| Textarea | None | No | No | ❌ | ✅ | Custom `TextareaProps` | ✅ |
| Tooltip | `@radix-ui/react-tooltip` (Provider, Root, Trigger, Content) | No | No | ✅ | ✅ (Content) | `ComponentPropsWithoutRef` | ✅ (Content) |
| Typography | None | ✅ (13 variants) | No | ✅ | ✅ | Custom interface | ✅ |

### Key Architecture Findings

- **`"use client"` inconsistency:** 5 components are **missing** `"use client"`: `button.tsx`, `card.tsx`, `input.tsx`, `full-page-loader.tsx`, `textarea.tsx`, `skeleton.tsx`. This means they could be used in server components, but some (like Button which renders `<button>`) should explicitly be client components.
- **`forwardRef` inconsistency:** 10 components use `forwardRef`, 12 don't. Components wrapping DOM elements or Radix primitives that need ref forwarding (Button, Card, Input, etc.) are missing it.
- **`data-slot` pattern:** Only 8 components use `data-slot`: Button, Card (+ sub-slots), DropdownMenu (+ sub-slots), Input, Label, ScrollArea (+ sub-slots), Select (+ sub-slots), Skeleton. The remaining 14 lack this pattern.
- **`displayName` assignment:** 14 components have `displayName`, 8 don't (Badge, Button, Card, FullPageLoader, Input, Label, Skeleton, ScrollArea, Select, DropdownMenu). Missing displayName hurts React DevTools debugging.
- **CVA usage:** Only 4 components use `class-variance-authority`: Badge, Banner, Button, Typography.
- **Radix dependency:** 9 components depend on Radix UI primitives; 13 are pure HTML/CSS.

---

## 2. Hardcoded Values Audit

### 2.1 Button (`button.tsx`)

| Hardcoded Value | Line Context | Should Use |
|----------------|-------------|------------|
| `bg-gray-900` | default variant background | `bg-primary` (or define primary in CVA) |
| `text-white` | default variant text | `text-primary-foreground` |
| `bg-gray-800` | default variant hover | `bg-primary/90` or `hover:bg-primary` |
| `shadow-xl shadow-gray-200/50` | default variant shadow | `shadow-lg` with semantic token |
| `bg-white` | outline variant background | `bg-background` |
| `text-gray-700` | outline variant text | `text-foreground` |
| `hover:bg-gray-50` | outline variant hover bg | `hover:bg-accent` or `hover:bg-muted` |
| `hover:border-gray-300` | outline variant hover border | `hover:border-border` |
| `border border-gray-200` | outline variant border | `border-border` |
| `bg-gray-100` | secondary variant bg | `bg-secondary` |
| `text-gray-900` | secondary variant text | `text-secondary-foreground` |
| `hover:bg-gray-200` | secondary variant hover | `hover:bg-secondary` |
| `text-gray-600` | ghost variant text | `text-muted-foreground` |
| `hover:bg-gray-100/80` | ghost variant hover | `hover:bg-accent` |
| `hover:text-gray-900` | ghost variant hover text | `hover:text-foreground` |
| `from-brand-primary to-[#FFD700]` | brand variant gradient stop | Define gold token in CSS vars or keep as intentional brand accent |
| `shadow-[0_8px_20px_-4px_rgba(255,242,66,0.4)]` | brand variant shadow | `shadow-brand` token (new CSS var needed) |
| `border border-brand-primary/20` | brand variant border | Acceptable — uses brand token |

### 2.2 Badge (`badge.tsx`)

| Hardcoded Value | Variant | Should Use |
|----------------|---------|------------|
| `bg-gray-900` | default bg | `bg-primary` |
| `text-white` | default text | `text-primary-foreground` |
| `bg-gray-100` | secondary bg | `bg-secondary` |
| `text-gray-600` | secondary text | `text-secondary-foreground` |
| `border-red-100` | destructive border | `border-destructive/20` (new var) or `border-destructive` |
| `bg-red-50` | destructive bg | `bg-destructive/10` (new var) |
| `text-red-600` | destructive text | `text-destructive` |
| `border-gray-200` | outline border | `border-border` |
| `text-gray-600` | outline text | `text-muted-foreground` |
| `border-green-100` | success border | `border-green-200` — no semantic token (new needed) |
| `bg-green-50` | success bg | `bg-green-50` — no semantic token (new needed) |
| `text-green-700` | success text | `text-green-700` — no semantic token |
| `border-yellow-100` | warning border | No semantic token |
| `bg-yellow-50` | warning bg | No semantic token |
| `text-yellow-700` | warning text | No semantic token |
| `border-red-200` | error border | No semantic token |

**Assessment:** The Badge component has **14 hardcoded color references** and uses the `gray-*` palette where it should use semantic tokens (`primary`, `secondary`, `muted`). Additionally, the success/warning/error variants rely on Tailwind's built-in color utilities (green, yellow, red) which have no corresponding CSS variable tokens in `globals.css`.

### 2.3 Banner (`banner.tsx`)

| Hardcoded Value | Variant | Should Use |
|----------------|---------|------------|
| `bg-blue-50` | info bg | `bg-blue-50` — no semantic token (new needed) |
| `border-blue-100` | info border | No semantic token |
| `text-blue-800` | info text | No semantic token |
| `bg-blue-50` | brand bg | Same as info |
| `text-blue-900` | brand text | No semantic token |
| `bg-green-50` | success bg | No semantic token |
| `border-green-100` | success border | No semantic token |
| `text-green-800` | success text | No semantic token |
| `bg-orange-50` | warning bg | No semantic token |
| `border-orange-100` | warning border | No semantic token |
| `text-orange-800` | warning text | No semantic token |
| `bg-red-50` | error bg | No semantic token |
| `border-red-100` | error border | No semantic token |
| `text-red-800` | error text | No semantic token |
| `hover:bg-black/5` | close button hover | `hover:bg-muted` or `hover:bg-primary/5` |

**Assessment:** All 15 Banner color references use hardcoded Tailwind palette values. The Banner component is not a standard shadcn component (it's Lattice-specific), so it needs its own semantic tokens.

### 2.4 Card (`card.tsx`)

| Hardcoded Value | Component | Should Use |
|----------------|-----------|------------|
| `rounded-xl` | Card | Acceptable — maps to `--radius-lg` |
| `gap-6` | Card | Acceptable — consistent spacing |
| `py-6` | Card | Acceptable — consistent padding |
| `px-6` | CardHeader, CardContent, CardFooter | Acceptable — consistent padding |
| `hover:border-blue-500` | Card hover | Should use `hover:border-ring` or a semantic hover token |
| `hover:shadow-xl` | Card hover | Hardcoded shadow size — should use a consistent shadow token |
| `hover:shadow-gray-200/50` | Card hover | Should use `hover:shadow-card-hover` or similar |
| `hover:-translate-y-1` | Card hover | Acceptable — consistent transition |
| `transition-all duration-300` | Card | Acceptable — consistent transition |
| `@container/card-header grid` | CardHeader | Acceptable — container queries |
| `px-6` | CardContent | Acceptable — consistent padding |
| `[.border-b]:pb-6` | CardHeader | Acceptable — variant padding |

**Assessment:** The Card component's most critical issue is the **hardcoded hover effect** (`hover:border-blue-500 hover:shadow-xl`) baked into the base Card variant. This makes the hover effect impossible to override without `!important` or className overrides. The Card also lacks `forwardRef`, preventing ref forwarding for accessibility.

### 2.5 Table (`table.tsx`)

| Hardcoded Value | Component | Should Use |
|----------------|-----------|------------|
| `border-b` | TableHeader, TableRow | Acceptable — standard border |
| `bg-muted/50` | TableHeader, TableFooter | ✅ Good — uses semantic token |
| `border-gray-50` | TableRow border | `border-border/50` or new token |
| `hover:bg-gray-50/50` | TableRow hover | `hover:bg-muted/50` or `hover:bg-accent/50` |
| `data-[state=selected]:bg-gray-50` | TableRow selected | `data-[state=selected]:bg-accent` or `bg-muted` |
| `h-12` | TableHead height | Acceptable — consistent row height |
| `px-4` | TableHead padding | Acceptable |
| `p-4` | TableCell padding | Acceptable |
| `[&_tr]:border-b` | TableHeader | Acceptable |
| `[&_tr:last-child]:border-0` | TableBody | Acceptable |
| `[&>tr]:last:border-b-0` | TableFooter | Acceptable |
| `text-muted-foreground` | TableHead | ✅ Good |

**Assessment:** The Table component uses some semantic tokens (`bg-muted/50`, `text-muted-foreground`) but falls back to hardcoded gray values in 3 places. The hover/selected states should use `accent` or `muted` tokens instead of `gray-50`.

### 2.6 Input (`input.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `h-11` | Acceptable — consistent height |
| `rounded-xl` | Acceptable — maps to `--radius-lg` |
| `bg-gray-50/50` | `bg-muted/50` or `bg-input` |
| `shadow-sm` | Acceptable |
| `focus-visible:border-brand-primary` | ✅ Good — uses brand token |
| `focus-visible:ring-brand-primary/20` | ✅ Good |
| `focus-visible:ring-[4px]` | Acceptable |
| `focus-visible:bg-white` | `focus-visible:bg-background` |
| `aria-invalid:ring-destructive/20` | ✅ Good |
| `aria-invalid:border-destructive` | ✅ Good |

**Assessment:** Input uses `bg-gray-50/50` where it could use `bg-muted/50` (more consistent with CardHeader/TableHeader). Otherwise well-tuned with brand-focused ring colors.

### 2.7 Textarea (`textarea.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `min-h-[80px]` | Acceptable — explicit minimum |
| `rounded-xl` | Acceptable |
| `border-input` | ✅ Good — uses semantic token |
| `bg-gray-50/50` | `bg-muted/50` or `bg-input` |
| `focus-visible:border-brand-primary` | ✅ Good |
| `focus-visible:ring-brand-primary/20` | ✅ Good |

**Assessment:** Same `bg-gray-50/50` pattern as Input. Otherwise well-structured.

### 2.8 Dialog (`dialog.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `rounded-[2rem]` | `rounded-[2rem]` — custom but intentional, maps to a design token |
| `bg-black/60` | `bg-background/60` or `bg-black/80` for better contrast |
| `p-8` | Acceptable — consistent padding |
| `gap-6` | Acceptable |
| `shadow-2xl` | Acceptable — standard Tailwind |
| `duration-300` | Acceptable — consistent with other components |
| `opacity-70` | Acceptable |

**Assessment:** Dialog is relatively clean. The `rounded-[2rem]` is a design decision (large corner radius), and `p-8` is consistent with Card's `py-6` + header padding.

### 2.9 Accordion (`accordion.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `py-4` | Acceptable — consistent vertical padding |
| `duration-200` | Acceptable — 200ms transition |
| `h-4 w-4` | Acceptable — icon size |

**Assessment:** Accordion is clean — uses semantic tokens and standard spacing.

### 2.10 Avatar (`avatar.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `h-10 w-10` | Acceptable — standard avatar size |
| `rounded-full` | Acceptable — standard |
| `bg-muted` | ✅ Good — uses semantic token |

**Assessment:** Clean — uses `bg-muted` for fallback.

### 2.11 FullPageLoader (`full-page-loader.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `bg-white/90` | `bg-background/90` |
| `text-blue-500` | `text-brand-primary` or `text-primary` |
| `bg-blue-600` | `bg-brand-primary` — the blur glow |
| `border-gray-100` | `border-border/50` |
| `text-gray-900` | `text-foreground` |
| `text-gray-500` | `text-muted-foreground` |

**Assessment:** FullPageLoader has 6 hardcoded color values. As a full-screen overlay, it should use semantic tokens for maintainability.

### 2.12 Section (`section.tsx`)

| Hardcoded Value | Variant | Should Use |
|----------------|---------|------------|
| `bg-white` | background=white | Acceptable — but could be `bg-background` |
| `bg-gray-50/50` | background=muted | `bg-muted/50` |
| `bg-blue-50/30` | background=brand | `bg-brand-primary/5` or new token |
| `border-t border-gray-100` | border=top/bottom | `border-t border-border/50` |
| `border-b border-gray-100` | border=bottom | `border-b border-border/50` |

**Assessment:** Section has 5 hardcoded color references. The `bg-blue-50/30` for brand background is the most notable — should use a brand token.

### 2.13 Skeleton (`skeleton.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `bg-accent` | ✅ Good — uses semantic token |
| `animate-pulse` | Acceptable — standard animation |
| `rounded-md` | Acceptable |

**Assessment:** Clean — uses `bg-accent`.

### 2.14 Select (`select.tsx`)

| Hardcoded Value | Component | Should Use |
|----------------|-----------|------------|
| `h-9` | SelectTrigger default | Acceptable — consistent |
| `h-8` | SelectTrigger small | Acceptable |
| `w-4` | Icons | Acceptable |
| `opacity-50` | Chevron icon | Acceptable |
| `rounded-md` | Content, Items | Acceptable — maps to `--radius-md` |

**Assessment:** Select is relatively clean — mostly uses standard sizing, no hardcoded colors.

### 2.15 Tabs (`tabs.tsx`)

| Hardcoded Value | Component | Should Use |
|----------------|-----------|------------|
| `h-10` | TabsList | Acceptable |
| `rounded-md` | TabsList | Acceptable |
| `bg-muted` | TabsList | ✅ Good |
| `p-1` | TabsList | Acceptable |
| `text-muted-foreground` | TabsList | ✅ Good |
| `rounded-sm` | TabsTrigger | Acceptable |
| `px-3 py-1.5` | TabsTrigger | Acceptable |
| `text-sm` | TabsTrigger | Acceptable |

**Assessment:** Tabs uses semantic tokens for colors (`bg-muted`, `text-muted-foreground`).

### 2.16 Separator (`separator.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `bg-border` | ✅ Good — uses semantic token |

**Assessment:** Clean.

### 2.17 Container (`container.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `max-w-7xl` | Acceptable — standard container size |
| `max-w-4xl` | Acceptable |
| `max-w-[1400px]` | Acceptable |
| `max-w-full` | Acceptable |

**Assessment:** Clean — no color hardcoding.

### 2.18 Tooltip (`tooltip.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `rounded-xl` | Acceptable — maps to `--radius-lg` |
| `bg-popover` | ✅ Good |
| `px-3 py-1.5` | Acceptable |
| `text-sm` | Acceptable |
| `text-popover-foreground` | ✅ Good |

**Assessment:** Clean — uses semantic tokens.

### 2.19 Typography (`typography.tsx`)

| Hardcoded Value | Variant | Should Use |
|----------------|---------|------------|
| `text-4xl lg:text-5xl` | h1 | Acceptable — heading scale |
| `text-3xl` | h2 | Acceptable |
| `text-2xl` | h3 | Acceptable |
| `text-xl` | h4 | Acceptable |
| `text-xl` | lead | Acceptable |
| `text-lg` | large | Acceptable |
| `text-sm` | small | Acceptable |
| `text-[10px]` | tiny | Acceptable |
| `text-muted-foreground` | muted | ✅ Good |
| `scroll-m-20` | headings | Acceptable — standard scroll margin |
| `leading-7` | p | Acceptable |
| `px-[0.3rem] py-[0.2rem]` | inlineCode | Acceptable — inline code padding |

**Assessment:** Typography is clean — heading sizes follow a consistent scale and use `font-heading`/`font-sans` families defined in `globals.css`.

### 2.20 Label (`label.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `gap-2` | Acceptable |
| `text-sm` | Acceptable |
| `font-medium` | Acceptable |

**Assessment:** Clean.

### 2.21 ScrollArea (`scroll-area.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `bg-border` | ✅ Good — ScrollBar thumb |
| `w-2.5` / `h-2.5` | Acceptable — scrollbar dimensions |

**Assessment:** Clean.

### 2.22 DropdownMenu (`dropdown-menu.tsx`)

| Hardcoded Value | Should Use |
|----------------|------------|
| `min-w-[8rem]` | Acceptable |
| `p-1` | Acceptable |
| `rounded-md` | Acceptable |
| `text-sm` | Acceptable |

**Assessment:** Clean — uses semantic tokens throughout.

---

### 2.3 Web App Overrides

The web app consumer code introduces **significant hardcoded style overrides** that override UI component defaults:

#### `dashboard-container.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-6 h-12 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"` | Overrides Button variant with hardcoded blue colors | Should use `variant="brand"` or `variant="default"` and let Button handle colors. 3 hardcoded colors + 3 shadow overrides. |
| `DialogContent className="sm:max-w-[500px] rounded-3xl p-8 bg-white border border-gray-100"` | Overrides DialogContent defaults with `bg-white`, `border-gray-100`, custom radius | DialogContent already has `bg-background`, `border`. Overrides radius to `3xl` (12px) vs component's `2rem` (16px). |
| `Input className="h-12 bg-gray-50/50 border-gray-100 rounded-xl"` | Overrides Input defaults with `bg-gray-50/50` and `border-gray-100` | Input already has `bg-gray-50/50` and `border-input`. Extra `border-gray-100` overrides. |
| `Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"` | Same hardcoded blue pattern | Redundant color override |
| `Input className="pl-10 h-11 bg-gray-50/50 border-gray-100 focus:bg-white transition-all rounded-xl"` | Input override in search | Same pattern |
| Stats cards: `bg-white p-6 rounded-2xl border border-gray-100 shadow-sm` | Raw div styling instead of Card | Could use `<Card>` component |
| Stats icons: `p-3 bg-blue-50 text-blue-600 rounded-xl`, `bg-green-50 text-green-600`, `bg-purple-50 text-purple-600` | Hardcoded icon backgrounds | No semantic token for these |
| Main content area: `bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20` | Raw div styling instead of Card | Card component exists but not used |
| Control bar: `bg-gray-50 p-1 rounded-xl` | Raw div styling | Could use a UI wrapper |
| Grid/List toggle buttons: `cn("h-9 w-9 rounded-lg transition-all bg-transparent border-transparent", ...)` | Raw Button with hardcoded styling | Button variant="ghost" or "outline" would handle this |
| No results button: `className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"` | Hardcoded blue | Same as above |

#### `welcome-credits-modal.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0 bg-white rounded-xl sm:rounded-xl border border-gray-200 shadow-2xl"` | Overrides DialogContent with hardcoded `bg-white`, `border-gray-200` | DialogContent already has `bg-background`, `border`. `shadow-2xl` is redundant with component's shadow. |
| `bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400` | Hardcoded gradient on header | Not a UI component prop but inline style |
| `Button className="w-full h-12 text-lg font-sans bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl font-semibold transition-all duration-200 hover:scale-105"` | Hardcoded blue Button override | Should use `variant="brand"` or a new `variant="primary-blue"` |

#### `signup-form.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100"` | Raw div instead of Card | Card component exists |
| `Input className="bg-gray-50 border-gray-200 focus:ring-blue-500/50"` | Overrides Input defaults × 3 | Input already has `bg-gray-50/50` and `border-input` |
| `Button className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-lg shadow-blue-500/20"` | Hardcoded blue override | Should use `variant="brand"` |
| `div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg"` | Hardcoded error styling | Banner component exists with `variant="error"` |
| `div className="p-3 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg"` | Hardcoded success styling | Banner component exists with `variant="success"` |

#### `user-nav.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-all duration-200"` | Hardcoded blue override | Should use `variant="brand"` |

#### `login-form.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100"` | Raw div instead of Card | Card component exists |
| `Input className="bg-gray-50 border-gray-200 focus:ring-blue-500/50"` | Input override × 2 | Same pattern as signup |
| `Button className="w-full h-12"` | Extra sizing override | Button `variant="brand"` should handle size |
| `div className="relative my-6"` with `border-gray-200` | Raw horizontal rule | Could use `<Separator>` |

#### `profile-form.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `Input className="bg-gray-50 font-sans"` | Input override | Same pattern |
| `Input className="font-sans focus:ring-2 focus:ring-blue-500/50"` | Input override with custom ring | Ring color hardcoded |
| `Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-all duration-300 font-sans font-medium"` | Hardcoded blue override | Should use `variant="brand"` |

#### `settings-content.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-xl border border-blue-100"` | Raw div with hardcoded blue | No UI wrapper for this pattern |
| `Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-all duration-300"` | Hardcoded blue override | Same pattern |

#### `session-card.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `className="group relative bg-white border border-gray-100 rounded-3xl p-6 transition-all duration-300 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"` | Raw div styled like Card with extra hover effects | Card component exists but session-card bypasses it |
| `p-4 bg-gray-50 rounded-2xl group-hover:bg-blue-500 group-hover:text-white` | Icon box with hardcoded gray/blue | No UI wrapper |
| `div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"` | Decorative blur | Not a component issue |

#### `session-table-row.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `tr className="group hover:bg-gray-50/50 transition-all cursor-pointer"` | TableRow override | TableRow already has `hover:bg-gray-50/50` |
| `div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600"` | Icon box | No UI wrapper |

#### `app-sidebar.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `TooltipContent className="rounded-xl bg-gray-900 text-white border-gray-800"` | Tooltip override with hardcoded dark bg | Tooltip already has `bg-popover` |
| `TooltipContent className="flex flex-col gap-1 rounded-2xl bg-white text-gray-900 border-gray-200 shadow-2xl p-4"` | Tooltip override in sidebar | Same pattern |
| `Button variant="brand"` with hardcoded `rounded-xl` | Brand button | Button already has rounded-xl |

#### `chat-interface.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `Textarea className="w-full bg-muted/50 min-h-[80px] max-h-48 resize-none"` | Textarea override | Uses `bg-muted/50` (good) but hardcodes min/max height |
| `Button className="rounded-xl h-11 w-11 flex-shrink-0 shadow-lg shadow-blue-500/20"` | Icon button override | Hardcoded blue shadow |

#### `credits-modal.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0 bg-white rounded-[2rem] border border-gray-100 shadow-2xl"` | Hardcoded `bg-white`, `border-gray-100` | Same as welcome modal |
| `TabsTrigger className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-gray-900 data-[state=active]:shadow-none rounded-none px-4 py-3 bg-transparent text-gray-500 hover:text-gray-900 transition-colors"` | Tab trigger override | Overrides default tab styling with hardcoded colors |
| `TabsContent value="buy"` section: `bg-blue-600 text-[9px]` | Badge override | Hardcoded blue |
| Table rows: `hover:bg-blue-50/30 transition-colors border-gray-100` | TableRow override | Hardcoded border |
| `Badge variant="success"` | Uses Badge with success variant | Good — uses UI component |
| `div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center group-hover:bg-blue-600 transition-colors"` | Icon circle override | Hardcoded colors |

#### `hero-section.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `div className="w-full max-w-md mx-auto py-12 px-6 bg-white border border-gray-100 rounded-3xl shadow-xl text-center space-y-6"` | Raw div instead of Card | Card component exists |
| `div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center"` | Icon box with hardcoded blue | No UI wrapper |

#### `user-sessions-section.tsx`
| File:Line | Override | Issue |
|-----------|----------|-------|
| `Link className="group relative block p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-500 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1"` | Raw div styled like Card with hover effects | Card component exists but this bypasses it |
| `div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"` | Uses semantic tokens (good!) | Consistent with CSS vars |

---

## 3. Missing Components

### 3.1 Radix Primitives Installed but Missing from UI Lib

These Radix primitives are already in `package.json` and can be implemented without new dependencies:

| Component | Radix Package | Priority | Notes |
|-----------|--------------|----------|-------|
| **Alert** | NOT installed | P0 | `@radix-ui/react-alert-dialog` not installed. Needed for error/success messages. Supersedes Banner? |
| **Checkbox** | NOT installed | P0 | `@radix-ui/react-checkbox` not installed. Essential for forms. |
| **Collapsible** | NOT installed | P1 | `@radix-ui/react-collapsible` not installed. Needed for accordion-like expandable sections. |
| **Popover** | NOT installed | P0 | `@radix-ui/react-popover` not installed. Widely used pattern for dropdowns, forms, tooltips. |
| **Progress** | NOT installed | P1 | `@radix-ui/react-progress` not installed. Needed for loading states, progress bars. |
| **RadioGroup** | NOT installed | P1 | `@radix-ui/react-radio-group` not installed. Needed for form selection groups. |
| **Slider** | NOT installed | P2 | `@radix-ui/react-slider` not installed. Range inputs. |
| **Switch** | NOT installed | P1 | `@radix-ui/react-switch` not installed. Toggle switches for settings. |
| **HoverCard** | NOT installed | P2 | `@radix-ui/react-hover-card` not installed. Advanced tooltips. |
| **Menubar** | NOT installed | P3 | `@radix-ui/react-menubar` not installed. Application menus. |
| **NavigationMenu** | NOT installed | P3 | `@radix-ui/react-navigation-menu` not installed. Site navigation. |
| **Resizable** | NOT installed | P3 | `@hello-pangea/dnd` or `react-resizable-panels` not installed. Split panels. |
| **Scroll Bar** | NOT installed | P2 | Separate ScrollBar component (not ScrollArea). Standalone scrollbar. |
| **Toolbar** | NOT installed | P3 | `@radix-ui/react-toolbar` not installed. Formatting toolbars. |
| **Toggle** | NOT installed | P3 | `@radix-ui/react-toggle` not installed. Toggle buttons. |
| **ToggleGroup** | NOT installed | P3 | `@radix-ui/react-toggle-group` not installed. Toggle button groups. |
| **Context Menu** | NOT installed | P3 | `@radix-ui/react-context-menu` not installed. Right-click menus. |

### 3.2 Radix Primitives NOT Installed (Need npm install)

| Package | Purpose |
|---------|---------|
| `@radix-ui/react-alert-dialog` | Alert/confirmation dialogs |
| `@radix-ui/react-checkbox` | Checkbox inputs |
| `@radix-ui/react-collapsible` | Collapsible sections |
| `@radix-ui/react-popover` | Popover dropdowns |
| `@radix-ui/react-progress` | Progress bars |
| `@radix-ui/react-radio-group` | Radio button groups |
| `@radix-ui/react-slider` | Range sliders |
| `@radix-ui/react-switch` | Toggle switches |
| `@radix-ui/react-hover-card` | Hover preview cards |
| `@radix-ui/react-menubar` | Application menus |
| `@radix-ui/react-navigation-menu` | Nav menus |
| `@radix-ui/react-toolbar` | Toolbar controls |
| `@radix-ui/react-toggle` | Toggle buttons |
| `@radix-ui/react-toggle-group` | Toggle button groups |
| `@radix-ui/react-context-menu` | Context menus |
| `react-resizable-panels` | Resizable split panels |

### 3.3 Non-Radix shadcn Components

| Component | Dependency | Notes |
|-----------|-----------|-------|
| **Command** | `cmdk` (not installed) | Quick command palette |
| **Date Picker** | `@internationalized/date` or `react-day-picker` (not installed) | Calendar date picker |
| **Drawer** | `@use-drawer/react` or custom (not installed) | Mobile-style drawer |
| **Input OTP** | `@input-otp/react` (not installed) | One-time password input |
| **Toast** | `sonner` (v2.0.7 installed) | Already using sonner instead of shadcn toast |

### 3.4 Already Implemented (✅)

| Component | Radix | Notes |
|-----------|-------|-------|
| Separator | `@radix-ui/react-separator` | ✅ |
| Table | None | ✅ (pure HTML) |
| Tabs | `@radix-ui/react-tabs` | ✅ |
| Tooltip | `@radix-ui/react-tooltip` | ✅ |

---

## 4. CSS Variable Mapping

### 4.1 Variables Defined in globals.css and Their UI Component Usage

| CSS Variable | Light Mode Value | Dark Mode Value | Used By | Status |
|-------------|-----------------|----------------|---------|--------|
| `--background` | `0 0% 100%` | `222.2 84% 4.9%` | Body, DialogContent (as bg-background) | ✅ Used |
| `--foreground` | `222.2 84% 4.9%` | `210 40% 98%` | Body text, Typography | ✅ Used |
| `--card` | `0 0% 100%` | `222.2 84% 4.9%` | Card (as bg-card) | ✅ Used |
| `--card-foreground` | `222.2 84% 4.9%` | `210 40% 98%` | Card (as text-card-foreground) | ✅ Used |
| `--popover` | `0 0% 100%` | `222.2 84% 4.9%` | Tooltip (bg-popover), DropdownMenu (bg-popover) | ✅ Used |
| `--popover-foreground` | `222.2 84% 4.9%` | `210 40% 98%` | Tooltip, DropdownMenu | ✅ Used |
| `--primary` | `221.2 83.2% 53.3%` | `217.2 91.2% 59.8%` | AvatarFallback (text-primary-foreground), TabsTrigger active | ✅ Used |
| `--primary-foreground` | `210 40% 98%` | `222.2 47.4% 11.2%` | AvatarFallback | ✅ Used |
| `--secondary` | `210 40% 96.1%` | `217.2 32.6% 17.5%` | Badge (as bg-secondary via bg-gray-100) | ⚠️ Overridden by hardcoded colors |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | `210 40% 98%` | Badge (via bg-gray-100) | ⚠️ Overridden |
| `--muted` | `210 40% 96.1%` | `217.2 32.6% 17.5%` | Badge, TabsList, TableHeader, ScrollBar, Skeleton, Textarea (via bg-gray-50/50) | ⚠️ Partially overridden |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `215 20.2% 65.1%` | Badge, SelectLabel, Typography, TableHead | ✅ Used |
| `--accent` | `199 89% 48%` | `199 89% 48%` | DialogClose (bg-accent), Skeleton (bg-accent), TabsTrigger (via hover) | ✅ Used |
| `--accent-foreground` | `210 40% 98%` | `210 40% 98%` | DialogClose | ✅ Used |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` | Button (text-destructive), Input (border-destructive), Tooltip | ✅ Used |
| `--destructive-foreground` | `210 40% 98%` | `210 40% 98%` | Button | ✅ Used |
| `--border` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Separator (bg-border), DropdownMenuSeparator | ✅ Used |
| `--input` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | Input (border-input), Textarea (border-input) | ✅ Used |
| `--ring` | `221.2 83.2% 53.3%` | `224.3 76.3% 48%` | Button (focus-visible:ring), Input, Select, Tabs | ✅ Used |
| `--radius` | `0.75rem` | `0.75rem` | Card (via rounded-xl), Button (via rounded-xl) | ✅ Used |
| `--radius-*` | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl` | — | Tailwind config mapped | ✅ Defined |

### 4.2 Brand Color Variables (defined in globals.css `@theme inline`)

| CSS Variable | Value | Used By | Status |
|-------------|-------|---------|--------|
| `--color-brand-primary` | `#2563eb` | Button brand variant, Input focus | ✅ Used |
| `--color-brand-secondary` | `#38bdf8` | — | ❌ UNUSED |
| `--color-brand-dark` | `#0f172a` | Badge brand variant text | ✅ Used |

### 4.3 Variables Missing from globals.css That Components Need

| Needed Variable | Currently Hardcoded | Where Used |
|----------------|-------------------|------------|
| `--brand-accent` | `#FFD700` (gold) | Button brand gradient (`from-brand-primary to-[#FFD700]`) |
| `--success` | `green-50, green-100, green-600, green-700, green-800` | Badge success, Banner success, login-form messages |
| `--success-foreground` | `green-700, green-800` | Badge success text, Banner success text |
| `--warning` | `yellow-50, yellow-100, yellow-700` | Badge warning, Banner warning |
| `--warning-foreground` | `yellow-700` | Badge warning text, Banner warning text |
| `--info` | `blue-50, blue-100, blue-600, blue-700, blue-800, blue-900` | Banner info, Banner brand, hero-section icons |
| `--info-foreground` | `blue-800, blue-900` | Banner info text, Banner brand text |
| `--purple` | `purple-50, purple-600` | Dashboard stats icons |
| `--purple-foreground` | `purple-600` | Dashboard stats icons |
| `--orange` | `orange-50, orange-800` | Banner warning variant |
| `--orange-foreground` | `orange-800` | Banner warning variant |
| `--brand-glow` | `rgba(255,242,66,0.4)` | Button brand shadow |

**Critical Gap:** The `brand-secondary` CSS variable (`#38bdf8`) is defined in `globals.css` but **never used anywhere** in the UI components or web app. Meanwhile, many hardcoded colors have no corresponding CSS variable at all.

---

## 5. Cross-Component Consistency Issues

### 5.1 Border Radius Convention

| Component | Radius Used | CSS Token Equivalent |
|-----------|------------|---------------------|
| Button | `rounded-xl` | `--radius-lg` (12px) |
| Card | `rounded-xl` | `--radius-lg` (12px) |
| Input | `rounded-xl` | `--radius-lg` (12px) |
| Textarea | `rounded-xl` | `--radius-lg` (12px) |
| DialogContent | `rounded-[2rem]` | 16px (hardcoded, not using `--radius-xl` which is also 12px) |
| Badge | `rounded-full` | — (pill shape, intentional) |
| DropdownMenu items | `rounded-sm` | `--radius-sm` (4px) |
| TooltipContent | `rounded-xl` | `--radius-lg` (12px) |
| Select trigger | `rounded-md` | `--radius-md` (8px) |
| TabsList | `rounded-md` | `--radius-md` (8px) |
| TableHeader | no explicit radius | Inherits parent |
| ScrollArea | `rounded-[inherit]` | Inherits parent |

**Inconsistency:** DialogContent uses `rounded-[2rem]` (16px) while `--radius-xl` is defined as `calc(var(--radius) + 4px)` = `calc(12px + 4px)` = 16px. So DialogContent **is** using the right size, but it's hardcoded as `rounded-[2rem]` instead of `rounded-xl`.

### 5.2 Shadow Convention

| Component | Shadow Used | Consistency |
|-----------|------------|-------------|
| Button (default) | `shadow-xl shadow-gray-200/50` | Heavy shadow |
| Button (brand) | `shadow-[0_8px_20px_-4px_rgba(255,242,66,0.4)]` | Custom RGBA shadow |
| Button (destructive) | `shadow-lg shadow-red-200/50` | Medium shadow |
| Button (outline) | `shadow-sm` | Subtle |
| Card | `shadow-sm` + `hover:shadow-xl` | Subtle base, heavy hover |
| DialogContent | `shadow-2xl` | Very heavy |
| TooltipContent | `shadow-md` | Medium |
| DropdownMenu | `shadow-md` / `shadow-lg` | Medium |
| FullPageLoader | `shadow-lg` | Medium |

**Inconsistency:** Shadow utilities vary from `shadow-sm` to `shadow-2xl`. No consistent shadow tokens defined in `globals.css`.

### 5.3 Transition Timing

| Component | Duration | Consistency |
|-----------|----------|-------------|
| Button | `duration-300` | 300ms |
| Card | `duration-300` | 300ms ✅ |
| Accordion | `duration-200` | 200ms ❌ |
| DialogContent | `duration-300` | 300ms ✅ |
| FullPageLoader | `duration-500` (fade), `duration-300` (zoom) | 500ms/300ms ❌ |
| Section | — | N/A |
| TabsTrigger | `transition-all` | No explicit duration ❌ |
| Avatar | `transition-colors` | No explicit duration ❌ |

**Inconsistency:** Button, Card, and Dialog use 300ms. Accordion uses 200ms. FullPageLoader uses 500ms for fade-in. TabsTrigger and Avatar don't specify explicit durations.

### 5.4 Focus Ring Convention

| Component | Focus Ring | Consistency |
|-----------|-----------|-------------|
| Button | `focus-visible:ring-brand-primary/30 focus-visible:ring-4 focus-visible:ring-offset-2` | Blue ring, 4px, offset |
| Input | `focus-visible:ring-brand-primary/20 focus-visible:ring-[4px]` | Blue ring, 4px, no offset |
| Textarea | Same as Input | ✅ |
| Badge | `focus:ring-2 focus:ring-ring focus:ring-offset-2` | Ring token, 2px, offset |
| TabsTrigger | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` | Ring token, 2px, offset |
| Select | `focus-visible:ring-ring/50` | Ring token, no explicit size |
| ScrollArea | `focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-1` | Ring token, 3px, outline |
| DialogClose | `focus:ring-2 focus:ring-ring focus:ring-offset-2` | Ring token, 2px, offset |

**Inconsistency:** Button uses `brand-primary/30` with 4px ring and offset. Input uses `brand-primary/20` with 4px ring but NO offset. Badge/Tabs/Dialog use `ring` token with 2px and offset. ScrollArea uses `ring/50` with 3px + outline.

### 5.5 Disabled State Convention

| Component | Disabled Handling | Consistency |
|-----------|------------------|-------------|
| Button | `disabled:pointer-events-none disabled:opacity-50` | ✅ |
| Badge | None (no disabled prop) | N/A |
| Input | `disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50` | ✅ |
| Textarea | `disabled:cursor-not-allowed disabled:opacity-50` | ⚠️ No pointer-events-none |
| TabsTrigger | `disabled:pointer-events-none disabled:opacity-50` | ✅ |
| SelectTrigger | `disabled:cursor-not-allowed disabled:opacity-50` | ⚠️ No pointer-events-none |

**Inconsistency:** Textarea and SelectTrigger don't set `pointer-events-none` when disabled.

### 5.6 data-slot Pattern

| Uses data-slot | Count |
|---------------|-------|
| ✅ Button, Card (7 sub-slots), DropdownMenu (16 sub-slots), Input, Label, ScrollArea (4 sub-slots), Select (10 sub-slots), Skeleton | 8 components |

| ❌ No data-slot | Count |
|----------------|-------|
| Accordion, Avatar, Badge, Banner, Container, Dialog, FullPageLoader, Section, Separator, Table, Tabs, Textarea, Tooltip, Typography | 14 components |

**Inconsistency:** Only 8 of 22 components use `data-slot`. This pattern enables component-specific styling overrides without className conflicts. The remaining 14 should adopt it.

### 5.7 Component Prop Naming

| Pattern | Components | Inconsistency |
|---------|-----------|---------------|
| `children` | Most | ✅ Consistent |
| `content` | None | N/A |
| `size` | Button (5 values), Select (2 values), Container (4 values), Section (4 values) | Different enum values across components |
| `variant` | Button (8), Badge (8), Banner (5), Typography (13) | Different variant sets |
| `as` | Typography (`as` prop) | Non-standard |
| `asChild` | Button only | ✅ Standard |

### 5.8 Typography Scale

| Variant | Font Size | Font Weight | Consistency |
|---------|-----------|------------|-------------|
| h1 | `text-4xl lg:text-5xl` | `font-bold` | ✅ |
| h2 | `text-3xl` | `font-semibold` | ✅ |
| h3 | `text-2xl` | `font-semibold` | ✅ |
| h4 | `text-xl` | `font-semibold` | ✅ |
| p | `leading-7` | (inherited) | ✅ |
| lead | `text-xl` | (inherited) | ⚠️ Same as h4 |
| large | `text-lg` | `font-semibold` | ✅ |
| small | `text-sm` | `font-medium` | ✅ |
| tiny | `text-[10px]` | `font-medium` | ✅ |
| muted | `text-sm` | (inherited) | ⚠️ Same as small |

**Observation:** `lead` and `h4` share the same font size (`text-xl`). This is a design decision but should be documented.

### 5.9 Animation Naming

| Animation | Definition | Used By |
|-----------|-----------|---------|
| `animate-in` / `animate-out` | Tailwind plugin (tw-animate-css) | Dialog, DropdownMenu, Select, ScrollArea |
| `fade-in-*` / `fade-out-*` | tw-animate-css | Dialog |
| `zoom-in-*` / `zoom-out-*` | tw-animate-css | Dialog, FullPageLoader |
| `slide-in-*` / `slide-out-*` | tw-animate-css | Dialog, DropdownMenu, Select |
| `pulse` | Custom `@keyframes` in globals.css | Skeleton, FullPageLoader |
| `pressDown` / `pressUp` | Custom `@keyframes` in globals.css | Button (via CSS vars, not used in components) |
| `accordion-up` / `accordion-down` | Custom (not defined in globals.css!) | Accordion ❌ |

**Critical Bug:** The Accordion references `animate-accordion-up` and `animate-accordion-down` classes, but these animations are **NOT defined in `globals.css`**. They would only work if defined in a CSS file that gets imported. This is a potential runtime bug.

---

## 6. Configuration Issues

### 6.1 `components.json` — Stale Paths

```json
{
  "aliases": {
    "ui": "@/client/components/ui",  // ❌ Points to non-existent path
    "utils": "@/lib/utils",          // ❌ Should be "@/client/lib/utils" or "@lattice/ui/lib/utils"
    "components": "@/components",    // ❌ Points to apps/web/src/client/components
    "lib": "@/lib",                  // ❌ Should be "@/client/lib" or "@lattice/ui/lib"
    "hooks": "@/hooks"               // ❌ Should be "@/client/hooks" or "@lattice/ui/hooks"
  }
}
```

**Issue:** The `ui` alias points to `@/client/components/ui` which does not exist. The UI components live in `libs/ui/src/components/ui/` and are exported via the `@lattice/ui` package alias. This stale config means `npx shadcn@latest add <component>` would fail or create files in the wrong location.

**Fix:** Should be updated to:
```json
{
  "aliases": {
    "ui": "@lattice/ui",
    "utils": "@lattice/ui/lib/utils",
    "components": "@/components",
    "lib": "@lattice/ui/lib",
    "hooks": "@lattice/ui/hooks"
  }
}
```

Or better yet, since this is a custom monorepo with a shared UI library, the `components.json` may need to be removed entirely if shadcn CLI commands are not used for the shared library.

### 6.2 Tailwind Config

**`apps/web/tailwind.config.js`:**
- ✅ Properly maps CSS variables to Tailwind color utilities (`primary`, `secondary`, `accent`, `destructive`, `muted`, `border`, `input`, `ring`, `background`, `foreground`)
- ✅ Defines `brand.*` color aliases (`#2563eb`, `#38bdf8`, `#0f172a`)
- ✅ Defines border radius tokens (`lg`, `md`, `sm` from `--radius`)
- ✅ Defines font families (`sans`, `heading`, `mono`)
- ✅ Defines animations (`fadeIn`, `pulse`, `pressDown`, `pressUp`)

**`apps/web/src/app/globals.css`:**
- ✅ Properly defines all CSS custom properties for light and dark modes
- ✅ Uses `@theme inline` directive for Tailwind v4
- ✅ Defines `--radius: 0.75rem` (12px)
- ❌ Missing `--brand-glow` or brand accent shadow variable
- ❌ Missing semantic color variables for success/warning/info variants

### 6.3 `replace-imports.ts` — Historical Migration Script

This is a one-time migration script that replaces:
- `@/client/components/ui` → `@lattice/ui`
- `@/common/` → `@lattice/shared/`
- `@/client/utils` → `@lattice/ui`
- `./src/common/types` → `@lattice/shared`

**Status:** This script has been used in the past (evidenced by the `@lattice/ui` import pattern throughout the codebase). It should be **removed from the repository** now that the migration is complete, to prevent accidental re-execution.

**Evidence of partial migration:** The `components.json` still has old paths (`@/client/components/ui`), suggesting the migration was never fully completed or the config was not updated afterward.

### 6.4 Path Alias Resolution

- ✅ `@lattice/ui` → `../../libs/ui/src/index.ts` (correct, resolves all 22 components)
- ✅ `@lattice/shared` → `../../libs/shared/src/index.ts` (correct)
- ✅ `@/client/*` → `./src/client/*` (correct)
- ✅ `@/components/*` → `./src/client/components/*` (correct)

### 6.5 `"use client"` Directive Audit

Components that **should** have `"use client"` but don't:
| Component | Reason |
|-----------|--------|
| `button.tsx` | Renders `<button>` — safe in server components, but brand variant has Tailwind classes that need client-side processing |
| `card.tsx` | Pure div wrapper — can be server-safe, but Card hover effects use CSS |
| `input.tsx` | Renders `<input>` — safe in server components |
| `textarea.tsx` | Renders `<textarea>` — safe in server components |
| `full-page-loader.tsx` | Uses CSS animations and lucide-react icons — should be `"use client"` |
| `skeleton.tsx` | Uses `animate-pulse` — can be server-safe |

**Recommendation:** Add `"use client"` to `button.tsx`, `full-page-loader.tsx`, and `skeleton.tsx` for consistency. Leave `card.tsx`, `input.tsx`, `textarea.tsx` as-is since they render plain HTML elements that work in server components.

---

## 7. Recommended Implementation Plan

### Phase 1: Fix Existing Components (Tokenization)

Replace all hardcoded Tailwind color values with CSS variable-based semantic tokens.

- [ ] Replace all hardcoded colors in **Button** (17 hardcoded values → use `bg-primary`, `bg-secondary`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`)
- [ ] Replace all hardcoded colors in **Badge** (14 hardcoded values → use `bg-primary`, `bg-secondary`, `text-primary-foreground`, `text-secondary-foreground`, `text-muted-foreground`, `border-border`)
- [ ] Replace all hardcoded colors in **Card** (3 hardcoded values → use `hover:border-ring`, consistent shadow token)
- [ ] Replace all hardcoded colors in **Table** (3 hardcoded values → `border-border/50`, `hover:bg-muted/50`, `data-[state=selected]:bg-muted`)
- [ ] Replace all hardcoded colors in **Input/Textarea** (2 hardcoded values → `bg-muted/50`, `focus-visible:bg-background`)
- [ ] Replace all hardcoded colors in **Banner** (15 hardcoded values → define new success/warning/info semantic tokens)
- [ ] Replace all hardcoded colors in **Section** (5 hardcoded values → `bg-muted/50`, `border-border/50`, brand token)
- [ ] Replace all hardcoded colors in **FullPageLoader** (6 hardcoded values → `bg-background/90`, `text-brand-primary`, `text-foreground`, `text-muted-foreground`)
- [ ] Add **brand-glow** CSS variable for Button brand shadow
- [ ] Add **success**, **warning**, **info**, **purple**, **orange** CSS variables to globals.css for non-primary semantic colors
- [ ] Add `"use client"` to `button.tsx`, `full-page-loader.tsx`, `skeleton.tsx`
- [ ] Add `forwardRef` to Button, Card, Input, Textarea, Skeleton, Label, ScrollArea, Select, DropdownMenu (all sub-components)
- [ ] Add `data-slot` pattern to Accordion, Avatar, Banner, Container, Dialog, FullPageLoader, Section, Separator, Table, Tabs, Textarea, Tooltip, Typography
- [ ] Add `displayName` to Badge, Button, Card, FullPageLoader, Input, Label, Skeleton, ScrollArea, Select, DropdownMenu (all sub-components)

### Phase 2: Fix Web App Overrides

Remove hardcoded className overrides from consumer components and use proper UI component props/variants.

- [ ] Remove hardcoded `bg-blue-600 hover:bg-blue-700` from **dashboard-container.tsx** (use `variant="brand"`)
- [ ] Remove hardcoded `bg-white border-gray-100` from **dashboard-container.tsx** DialogContent (use defaults)
- [ ] Remove hardcoded `bg-gray-50/50 border-gray-100` from **dashboard-container.tsx** Input (use defaults)
- [ ] Replace raw div cards with `<Card>` component in **dashboard-container.tsx** stats section
- [ ] Remove hardcoded styles from **welcome-credits-modal.tsx** DialogContent
- [ ] Remove hardcoded blue from **welcome-credits-modal.tsx** Button (use `variant="brand"`)
- [ ] Remove hardcoded styles from **signup-form.tsx** Input (3 instances) and Button
- [ ] Replace raw error/success divs in **signup-form.tsx** with `<Banner>` component
- [ ] Remove hardcoded blue from **user-nav.tsx** Button (use `variant="brand"`)
- [ ] Remove hardcoded styles from **login-form.tsx** Input and raw div wrapper (use Card)
- [ ] Remove hardcoded styles from **profile-form.tsx** Input and Button
- [ ] Remove hardcoded styles from **settings-content.tsx** Button
- [ ] Replace raw div with `<Card>` in **session-card.tsx**
- [ ] Remove hardcoded TooltipContent overrides in **app-sidebar.tsx** (use defaults + className overrides sparingly)
- [ ] Remove hardcoded blue shadow from **chat-interface.tsx** Button
- [ ] Remove hardcoded overrides in **credits-modal.tsx** DialogContent and TabsTrigger
- [ ] Replace raw div card in **hero-section.tsx** with `<Card>`
- [ ] Replace raw div cards in **user-sessions-section.tsx** with `<Card>` (or create `SessionCard` UI component)

### Phase 3: Add Missing Components (Priority Order)

1. **Popover** (`@radix-ui/react-popover`) — Most widely used Radix pattern, needed for dropdown-like behaviors
2. **Checkbox** (`@radix-ui/react-checkbox`) — Essential for forms, settings, selections
3. **Switch** (`@radix-ui/react-switch`) — Toggle controls in settings, preferences
4. **RadioGroup** (`@radix-ui/react-radio-group`) — Form radio selections
5. **Progress** (`@radix-ui/react-progress`) — Loading indicators, progress bars
6. **Alert** (needs `@radix-ui/react-alert-dialog`) — Confirmation dialogs, error messages (supersedes Banner?)
7. **Slider** (`@radix-ui/react-slider`) — Range inputs
8. **HoverCard** (`@radix-ui/react-hover-card`) — Advanced tooltip patterns
9. **Collapsible** (`@radix-ui/react-collapsible`) — Expandable sections (alternative to Accordion for non-accordion patterns)
10. **Command** (needs `cmdk`) — Quick action palette

### Phase 4: Configuration Fixes

- [ ] Fix `components.json` aliases to point to `@lattice/ui` package
- [ ] Remove or archive `replace-imports.ts` (migration is complete)