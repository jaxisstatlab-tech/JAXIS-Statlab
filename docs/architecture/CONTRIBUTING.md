# JAXIS StatLab — Development & Workflow Guide

Welcome to **JAXIS StatLab**! This guide details local environment setup, developer workflow, pre-commit QA checks, and the strategic development roadmap.

---

## 1. Local Development Setup

### Prerequisites
- **Node.js:** `v18.0.0` or higher (Recommended: Node `v22.x`)
- **npm:** `v10.x` or higher
- **PostgreSQL:** Local or cloud instance (e.g. Supabase / Neon / Docker)

### Installation & Launch

1. **Clone & Install Dependencies:**
   ```bash
   git clone https://github.com/Viviore/JAXIS-Statlab.git
   cd JAXIS-Statlab
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` in both `apps/web` and `apps/app`:
   ```bash
   cp .env.example .env
   ```

3. **Start Development Servers (Turborepo):**
   ```bash
   npm run dev
   ```
   - **Landing Page (`apps/web`):** `http://localhost:3000`
   - **SaaS Web Tool Workspace (`apps/app`):** `http://localhost:3001`

---

## 2. Strategic Development Roadmap (Version 1 - MVP Focus)

Development follows the 4-Version Roadmap outlined in Section 10 of the specification document.

### 🎯 Version 1: Foundational Core (Current Goal)
Focus on the critical path from project request to file delivery:
- [x] Monorepo workspace scaffolding & documentation
- [ ] Identity & Authentication (NextAuth / Clerk RBAC)
- [ ] Basic Project Intake Form & Master Status Tracker
- [ ] Manual Quotation Builder (Admin interface)
- [ ] Payment Proof Upload & Admin Verification
- [ ] Resource Assignment Desk (Statisticians & QA)
- [ ] Statistician Workspace & Draft Analysis Upload
- [ ] Deliverables Repository & Payment Release Gate (`FULLY_PAID` check)

### 🔮 Version 2: Quality & Collaboration
- Advanced QA Scorecard & Error Logging (Minor/Major/Critical)
- Messaging System (Support & Technical Audit threads)
- Automated Revision Tracking & Scope Classification
- Operational Metrics Dashboard

### 🔮 Version 3: Finance & Automation
- Automated Financial Ledger & Revenue Share Splits
- Advanced Payout Processing Engine
- Interactive Executive Dashboards

---

## 3. Pre-Commit Quality Verification

Before committing code or opening a Pull Request, you **MUST** run the complete verification suite from the repository root:

```bash
# 1. Type Safety Check (Zero TypeScript errors)
npm run check-types

# 2. Linter Verification (Zero ESLint errors)
npm run lint

# 3. Production Build Validation
npm run build
```

---

## 4. Git Commit Conventions

Format all commit messages following standard Conventional Commits:

- `feat(intake): add multi-step research request wizard`
- `feat(payments): implement server-side payment release gate check`
- `fix(quotes): restrict statistician access to quotation edit controls`
- `docs(arch): update database schema definitions for deliverables domain`
- `refactor(ui): update status badge HSL tokens in @repo/ui`
