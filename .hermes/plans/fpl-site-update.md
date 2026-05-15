# FPL Predictor Site Update

**Goal:** Update deps, fix broken elements, refresh the look

**Current Issues Found:**
- package.json claims Next 15.2.4 / React 19 but lockfile has Next 14.2.4 / React 18 — deps are in limbo
- Build fails: `@tailwindcss/oxide-linux-x64-gnu` missing (native binding issue)
- Duplicate hook files: `useFplData.ts` + `useFplData.tsx` (`.ts` version unused)
- Table page hardcodes `bg-gray-900` instead of using theme CSS variables
- Fixtures/Highlights pages inject inline `<style>` tags for dark dropdown styling (brittle)
- Two placeholder pages (Points, Transfers) with no content
- Header has basic gradient design — can be modernized
- Home page is minimal — needs proper landing content
- Overall lacks consistent polish (transitions, hover effects, card styling)

## Plan

### Phase 1: Fix Dependencies & Build
1. Reinstall deps cleanly to resolve the Next 14 vs 15 conflict
2. Fix TypeScript/tailwind issues so `npm run build` passes

### Phase 2: Fix Broken/Inconsistent Elements
3. Remove unused duplicate files
4. Replace brittle `<style>` injection in Fixtures/Highlights with proper Tailwind classes
5. Fix hardcoded dark colors in Table page to use CSS variables

### Phase 3: Refresh the Look
6. Redesign Header with cleaner, more professional look
7. Redesign Home page with hero section and feature highlights
8. Polish all pages with consistent card styling, transitions, spacing
9. Fill Points page with useful content
10. Update README

---

## Task Breakdown

### Phase 1 — Dependencies & Build

**Task 1: Clean dependency install**
Files: `package.json`, `package-lock.json`
Delete node_modules + package-lock.json, reinstall clean. pin to Next 15.2.4, React 19. Fix any postinstall/build issues.

**Task 2: Fix Tailwind v4 CSS config for build**
Files: `src/app/globals.css`, `postcss.config.mjs`
Tailwind v4 uses `@import "tailwindcss"` — need `@tailwindcss/postcss` plugin installed and working. Ensure native bindings are present.

**Task 3: Fix TypeScript config for Next 15**
Files: `tsconfig.json`
Next 15 uses ES2017 target — should be fine. Verify no TS errors.

### Phase 2 — Fix Broken Elements

**Task 4: Remove duplicate useFplData.ts**
Files: Delete `src/lib/hooks/useFplData.ts` (keep `.tsx` version which is more complete with SWR config and logger)
Verify all imports reference useFplData from the `.tsx` file.

**Task 5: Fix inline `<style>` injection in Fixtures and Highlights pages**
Files: `src/app/fixtures/page.tsx`, `src/app/highlights/page.tsx`
Remove `useEffect` that injects `<style>` for dropdown options. Add Tailwind classes directly to select/option elements for dark mode.

**Task 6: Fix hardcoded dark theme in Table page**
Files: `src/app/table/page.tsx`
Replace `bg-gray-900 text-white` with CSS variable-based classes matching other pages.

### Phase 3 — Design Refresh

**Task 7: Redesign Header**
Files: `src/components/Header.tsx`
Modern, cleaner header with: proper branding, better nav with active indicators, smooth theme toggle, sticky on scroll.

**Task 8: Redesign Home page**
Files: `src/app/page.tsx`, `src/components/FutureGameweeks.tsx`
Add hero section with quick stats, feature grid, better layout.

**Task 9: Polish all pages**
Files: All page.tsx files, component files
Consistent card styling, transitions, responsive improvements. Add loading skeletons instead of spinner.

**Task 10: Fill Points & Transfers pages**
Files: `src/app/points/page.tsx`, `src/app/transfers/page.tsx`
Add useful content to these placeholder pages.

**Task 11: Update README**
Files: `README.md`
Update tech stack versions, remove stale info, add accurate setup instructions.
