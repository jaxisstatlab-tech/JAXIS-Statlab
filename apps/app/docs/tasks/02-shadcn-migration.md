# JAXIS — Shadcn UI Migration Task List

**Active Phase:** `Migration Complete (All Batches 0–4 Verified)`\
**Target Package:** `@repo/ui` (`packages/ui`)\
**Consumers:** `apps/app` (SaaS Platform, Port 3001) & `apps/web` (Marketing Site, Port 3002)\
**Design Standard:** Enterprise Scientific / Dark Ocean Precision ([`apps/app/docs/design-system.md`](./apps/app/docs/design-system.md) & [`DESIGN.md`](./DESIGN.md))\
**Iconography:** Tabler Icons (`@tabler/icons-react`) exclusively\
**Quality Gate:** Every batch must pass `npm run check-types`, `npm run lint`, and verify dev server status with 0 errors before proceeding.

---

## Migration Philosophy: Safe Backward-Compatible Migration

To prevent breaking any of the 28 active dashboard pages and modals in `apps/app`:
1. **Shadcn Architecture:** Build components using Radix UI primitives, `cva()` variant definitions, and `cn()` utility.
2. **Backward Compatibility:** Maintain legacy props as aliases (e.g., `variant="primary"` maps to default amber gradient, `loading` spinner prop supported).
3. **Compound + Facade Pattern:** Export granular shadcn subcomponents (`CardHeader`, `CardTitle`, `DialogContent`, etc.) while keeping convenient high-level facades (`<Card>`, `<Modal>`).
4. **Theme Fidelity:** 100% compliant with JAXIS dark navy (`#010114`, `#011B38`), amber (`#CC6600`), and sky blue (`#38BDF8`) color systems with crisp 1px borders and zero glow.

---

## Batch 0 — Foundation & Initial Primitives (Completed)

- [x] **Task 0.1 — Core Utilities & Dependencies**
  - [x] Install `clsx`, `tailwind-merge`, `class-variance-authority` in `@repo/ui`
  - [x] Create `packages/ui/src/utils.ts` (`cn()`, `cva`, `VariantProps`, `ClassValue`)
  - [x] Configure exports in `packages/ui/package.json` and `packages/ui/src/index.ts`
- [x] **Task 0.2 — Essential Shadcn Primitives**
  - [x] Create `Tabs.tsx` (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` via `@radix-ui/react-tabs`)
  - [x] Create `Accordion.tsx` (`Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` via `@radix-ui/react-accordion`)
  - [x] Create `Switch.tsx` (via `@radix-ui/react-switch` with JAXIS amber state)
  - [x] Create `Popover.tsx` (via `@radix-ui/react-popover` with dark navy backdrop blur)
- [x] **Task 0.3 — Tremor Raw Dashboard Primitives**
  - [x] Install `recharts` and `@radix-ui/react-tooltip` in `@repo/ui`
  - [x] Create `Tracker.tsx` (telemetry workflow and uptime status blocks with floating tooltips)
  - [x] Create `ProgressBar.tsx` (telemetry progress bar with amber, sky, emerald variants)
  - [x] Create `BarList.tsx` (ranked metric distribution list with proportional background bars)
  - [x] Create `CategoryBar.tsx` (multi-segment budget and ratio distribution bar)
  - [x] Create `AreaChart.tsx` (interactive time-series area chart with dark gradients and tooltips)
- [x] **Task 0.4 — Batch 0 Quality Gate & Verification**
  - [x] Typecheck `@repo/ui`, `app`, `web` -> 0 errors
  - [x] Lint `@repo/ui`, `app`, `web` -> 0 warnings
  - [x] Full production build verified -> 26/26 routes compiled cleanly

---

## Batch 1 — Base Primitives Migration (Completed)

**Objective:** Modernize base UI building blocks (`Button`, `Badge`, `Card`) using shadcn `cva()` and compound exports while maintaining zero breaking changes for existing consumers.

### Task 1.1 — `Button.tsx` CVA Standardization
- [x] Install `@radix-ui/react-slot`
- [x] Implement `buttonVariants` via `cva`
- [x] Support both shadcn and legacy variant names
- [x] Support `loading` and `asChild` props
- [x] Verify exports in `index.ts`

---

### Task 1.2 — `Badge.tsx` CVA Standardization
- [x] Implement `badgeVariants` via `cva`
- [x] Add JAXIS telemetry color variants
- [x] Retain legacy prop compatibility
- [x] Verify exports in `index.ts`

---

### Task 1.3 — `Card.tsx` Compound Components
- [x] Create `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- [x] Maintain backward-compatible `Card` wrapper
- [x] Verify exports in `index.ts`

---

### Task 1.4 — Batch 1 Quality Gate & Verification
- [x] `@repo/ui` check-types passed (0 errors)
- [x] `@repo/ui` lint passed (0 warnings)
- [x] `app` check-types passed (0 errors)
- [x] `app` lint passed (0 warnings)
- [x] `web` check-types passed (0 errors)
- [x] Dev servers verified healthy (HTTP 200)

---

## Batch 2 — Form Controls Migration (Completed)

**Objective:** Migrate form elements to Radix-backed, accessible shadcn inputs.

### Task 2.1 — Accessible `Label.tsx`
- [x] Install `@radix-ui/react-label`
- [x] Create `Label.tsx` with CVA

### Task 2.2 — `Input.tsx` & `FormInput.tsx` Harmonization
- [x] Create `Input.tsx`
- [x] Refactor `FormInput.tsx` to consume `Input` and `Label` internally

### Task 2.3 — `Textarea.tsx` & `FormTextarea.tsx` Harmonization
- [x] Create `Textarea.tsx`
- [x] Refactor `FormTextarea.tsx` to consume `Textarea` and `Label` internally

### Task 2.4 — `Checkbox.tsx` & `FormCheckbox.tsx`
- [x] Install `@radix-ui/react-checkbox`
- [x] Create `Checkbox.tsx`
- [x] Enhance `FormCheckbox.tsx` with card variants and responsive sizing

### Task 2.5 — `Select.tsx` & `FormSelect.tsx`
- [x] Install `@radix-ui/react-select`
- [x] Create `Select.tsx` compound components
- [x] Refactor `FormSelect.tsx` with responsive sizing and Label integration

### Task 2.6 — Batch 2 Quality Gate & Verification
- [x] `@repo/ui` check-types passed (0 errors)
- [x] `@repo/ui` lint passed (0 warnings)
- [x] `app` check-types passed (0 errors)
- [x] `app` lint passed (0 warnings)
- [x] `web` check-types passed (0 errors)
- [x] Dev servers verified healthy (HTTP 200)

---

## Batch 3 — Overlays & Feedback Migration (Completed)

**Objective:** Convert modals, sheets, tooltips, alerts, and menus to standard Radix-powered overlays.

### Task 3.1 — `Dialog.tsx` & `Modal.tsx` Harmonization
- [x] Install `@radix-ui/react-dialog`
- [x] Create `Dialog.tsx` compound components (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`)
- [x] Maintain backward-compatible `Modal.tsx` wrapper

### Task 3.2 — `Sheet.tsx` & `Drawer.tsx` Harmonization
- [x] Create `Sheet.tsx` (slide-out panel using `@radix-ui/react-dialog` with side variants)
- [x] Maintain backward-compatible `Drawer.tsx` wrapper

### Task 3.3 — `Alert.tsx` CVA Standardization
- [x] Update `Alert.tsx` to CVA pattern with `AlertTitle` and `AlertDescription`

### Task 3.4 — `Tooltip.tsx` Radix Standardization
- [x] Standardize `Tooltip.tsx` on `@radix-ui/react-tooltip` with portal rendering
- [x] Preserve `TagsOverflow` helper for staff and admin pages

### Task 3.5 — `DropdownMenu.tsx` Radix Standardization
- [x] Install `@radix-ui/react-dropdown-menu`
- [x] Create `DropdownMenu.tsx` compound components with backward-compatible `items[]` facade

### Task 3.6 — Batch 3 Quality Gate & Verification
- [x] `@repo/ui` check-types passed (0 errors)
- [x] `@repo/ui` lint passed (0 warnings)
- [x] `app` check-types passed (0 errors)
- [x] `app` lint passed (0 warnings)
- [x] `web` check-types passed (0 errors)
- [x] Dev servers verified healthy (HTTP 200)

---

## Batch 4 — Tables, Dividers & Final Polish (Completed)

**Objective:** Implement standard shadcn data table primitives, hairline dividers, and complete full monorepo production build verification.

### Task 4.1 — `Table.tsx` Primitives
- [x] Create standard atomic shadcn `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` with responsive scroll wrapper

### Task 4.2 — `DataTable.tsx` Harmonization
- [x] Refactor `DataTable.tsx` to consume `Table` primitives internally while preserving high-level interface

### Task 4.3 — `Separator.tsx`
- [x] Install `@radix-ui/react-separator`
- [x] Create `Separator.tsx` component supporting horizontal and vertical orientations

### Task 4.4 — Batch 4 Quality Gate & Verification
- [x] `@repo/ui` check-types passed (0 errors)
- [x] `@repo/ui` lint passed (0 warnings)
- [x] `app` check-types passed (0 errors)
- [x] `app` lint passed (0 warnings)
- [x] `web` check-types passed (0 errors)
- [x] Full production build passed across all packages (`turbo run build` clean)
- [x] Dev servers verified healthy (HTTP 200)

---

## Component Inventory Status Matrix

| Component | Target Standard | Status |
|---|---|---|
| `utils.ts` (`cn`, `cva`) | Shadcn Core | ✅ Completed |
| `Tabs` | Shadcn / Radix | ✅ Completed |
| `Accordion` | Shadcn / Radix | ✅ Completed |
| `Switch` | Shadcn / Radix | ✅ Completed |
| `Popover` | Shadcn / Radix | ✅ Completed |
| `Tracker` | Tremor Raw | ✅ Completed |
| `ProgressBar` | Tremor Raw | ✅ Completed |
| `BarList` | Tremor Raw | ✅ Completed |
| `CategoryBar` | Tremor Raw | ✅ Completed |
| `AreaChart` | Tremor Raw / Recharts | ✅ Completed |
| `Button` | Shadcn CVA + Slot | ✅ Completed |
| `Badge` | Shadcn CVA | ✅ Completed |
| `Card` | Shadcn Compound | ✅ Completed |
| `Label` | Shadcn / Radix | ✅ Completed |
| `Input` / `FormInput` | Shadcn | ✅ Completed |
| `Textarea` / `FormTextarea` | Shadcn | ✅ Completed |
| `Checkbox` / `FormCheckbox` | Shadcn / Radix | ✅ Completed |
| `Select` / `FormSelect` | Shadcn / Radix | ✅ Completed |
| `Dialog` / `Modal` | Shadcn / Radix | ✅ Completed |
| `Sheet` / `Drawer` | Shadcn / Radix | ✅ Completed |
| `Alert` | Shadcn CVA | ✅ Completed |
| `Tooltip` | Shadcn / Radix | ✅ Completed |
| `DropdownMenu` | Shadcn / Radix | ✅ Completed |
| `Table` / `DataTable` | Shadcn | ✅ Completed |
| `Separator` | Shadcn / Radix | ✅ Completed |
| `AlertDialog` / `ConfirmDialog` | Shadcn / Radix | ✅ Completed |
| `Avatar` / `UserAvatar` | Shadcn / Radix | ✅ Completed |
| `Breadcrumb` | Shadcn | ✅ Completed |
| `CopyButton` | Shadcn Utility | ✅ Completed |
| `FileTypeIcon` | Shadcn Utility | ✅ Completed |
| `FileDropzone` | Shadcn Utility | ✅ Completed |
| `MoneyDisplay` | Shadcn Utility | ✅ Completed |
| `TagPicker` | Shadcn Utility | ✅ Completed |
| `DividerWithText` | Shadcn Utility | ✅ Completed |
| `Toast` | JAXIS Spec (Design Sec 9) | ✅ Complete & Standardized |
| `KpiCard` | JAXIS Telemetry Custom | ✅ Complete & Standardized |
| `StatusBadge` | JAXIS Multi-Role Custom | ✅ Complete & Standardized |
| `Stepper` | JAXIS Workflow Custom | ✅ Complete & Standardized |
| `PageHeader` | JAXIS Composite Custom | ✅ Complete & Standardized |
| `FilterToolbar` | JAXIS Composite Custom | ✅ Complete & Standardized |


