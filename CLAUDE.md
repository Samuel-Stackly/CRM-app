
# Mini CRM — Project Instructions

## Project Overview
Build a full-stack Mini CRM based on the provided Figma design.
Deadline: October 14, 2026.

## Tech Stack
- Frontend: React, Vite, TypeScript, React Router
- Styling: CSS modules or Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: MongoDB Atlas with Mongoose
- Validation: Zod
- Authentication: JWT in httpOnly cookies, bcryptjs
- Testing: Vitest or an appropriate backend test framework
- Deployment: Vercel frontend, Render backend

## Repository Structure
This repo holds multiple apps, one folder per app under `apps/`.
- apps/crm/client/: Mini CRM React frontend
- apps/crm/server/: Mini CRM Express backend
- apps/app2/client/, apps/app2/server/: second app (scaffold)
- apps.config.json: sets `activeApp`; root scripts target that app
- scripts/run.mjs: runs an npm script in the active app's client and/or server
- docs/: Project documentation

Switch apps by editing `activeApp` in `apps.config.json`, or per command with
`APP=app2 npm run dev`. Keep the apps independent — no cross-app imports.

## Development Rules
- Work on one feature at a time.
- Inspect existing files before modifying them.
- Explain the plan before making significant changes.
- Do not overwrite working code without a reason.
- Keep components and modules small and maintainable.
- Use strict TypeScript; avoid `any`.
- Follow consistent naming and formatting.
- Never create empty placeholder files without a purpose.
- Do not install unnecessary dependencies.

## Security Requirements
- Store authentication tokens in httpOnly cookies, never localStorage.
- Hash passwords with bcryptjs.
- Validate every request body with Zod.
- Apply authentication and user-specific authorization to protected routes.
- Every customer, deal, and task query must be scoped to the authenticated user.
- Return 404 when a record does not belong to the requesting user.
- Use Helmet, CORS allowlisting, and rate limiting for authentication endpoints.
- Never hardcode secrets or commit `.env` files.
- Use environment variables for deployment configuration.
- Never log passwords, tokens, or sensitive personal data.

## CRM Features
- Authentication: register, login, logout, and session restoration.
- Customers: CRUD, search, status filters, server-side pagination.
- Deals: CRUD and pipeline stages.
- Tasks: CRUD, due dates, priorities, and calculated overdue status.
- Dashboard: MongoDB aggregation for all metrics and pipeline values.
- URL-based filters that survive page refreshes.

## Quality Requirements
- Include loading, empty, and error states.
- Support mobile screens from 360px and desktop layouts.
- Add backend API tests, including cross-user access prevention.
- Ensure ESLint reports zero errors.
- Verify production builds before deployment.
- Add meaningful, small Git commits throughout development.

## Claude Code Workflow
1. Inspect relevant files before coding.
2. Propose a concise implementation plan.
3. Implement only the requested scope.
4. Run relevant lint, build, and tests.
5. Explain changed files and report test results.
6. Never claim tests pass unless they were actually run.
7. Ask before making destructive changes or changing architecture.