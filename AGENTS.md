<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 🤖 RIPZY PROJECT CONTINUITY & AGENT HANDOFF RULES

### ⚠️ MANDATORY RULE FOR ALL AI AGENTS & ASSISTANTS:
1. **DO NOT waste tokens or time trying to re-parse `ecommerce_FRS_tracker.xlsx`.**
2. **ALWAYS read `PROGRESS.md` first.** That file contains:
   - Complete project architecture and tech stack
   - All 28 Prisma models & the 11 Golden Business Rules
   - Full checklist of already completed Phase 1 MVP features
   - Current state of the code and demo credentials
   - The exact next tasks to pick up (Phase 2 & beyond)
3. **TECH STACK RESTRICTIONS:**
   - Styling: Use **Tailwind CSS v3.4** (already configured in `tailwind.config.ts` and `src/app/globals.css`).
   - Database: Use **Prisma ORM with SQLite** (schema at `prisma/schema.prisma`, client singleton at `src/lib/prisma.ts`).
   - Framework: **Next.js 16 (App Router)**.
4. **CONTINUITY WORKFLOW:**
   - Always check `PROGRESS.md` before starting any new task.
   - When you complete a new feature, update the checklist and next tasks in `PROGRESS.md` so the next session or machine continues seamlessly.
