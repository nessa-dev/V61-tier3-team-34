# Contributing Guide

This document defines the workflow and collaboration rules for DashFetch.

DashFetch is a Chingu Voyage team project, so treat every change like a real
software team contribution: small scope, clear intent, reviewable code, and
working checks.

---

## Git Workflow

We follow a feature-branch workflow:

1. Sync your local `main` branch.
2. Create a new branch from `main`.
3. Implement one focused change.
4. Run the required checks.
5. Push your branch.
6. Open a Pull Request.
7. Request review and respond to feedback.

Do not push directly to `main`.

---

## Branch Naming

Use short, descriptive branch names:

```txt
feature/mock-interview-notes
feature/question-count-control
fix/ingest-file-validation
fix/footer-faq-link
docs/contributing-guide
test/question-generation-route
refactor/client-session-helper
```

Recommended prefixes:

- `feature/` for new user-facing functionality
- `fix/` for bug fixes
- `docs/` for documentation-only changes
- `test/` for test-only changes
- `refactor/` for behavior-preserving code improvements
- `chore/` for maintenance tasks

---

## Commit Messages

Use this format:

```txt
type: short description
```

Common types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation update
- `test`: test-related change
- `refactor`: behavior-preserving code improvement
- `style`: formatting or visual-only change
- `chore`: maintenance or tooling change

Examples:

```txt
feat: add notes to mock interview questions
fix: reject empty uploaded job descriptions
docs: align coding standards with DashFetch
test: cover question normalizer edge cases
refactor: extract session storage helpers
```

Avoid vague messages:

```txt
update
changes
fix stuff
work in progress
```

---

## Pull Request Guidelines

Keep PRs small and focused. A reviewer should be able to understand what changed
and why without reverse-engineering the branch.

Before opening a PR:

- Pull or merge the latest `main` into your branch.
- Confirm the app still runs locally when your change affects runtime behavior.
- Run the relevant checks.
- Review your own diff for accidental files, secrets, logs, and unrelated
  formatting churn.
- Update docs when setup, environment variables, database schema, or user
  workflows change.

Required checks before PR:

```bash
npm run lint
npm test
npm run build
```

If you cannot run a check, say which check was skipped and why in the PR
description.

---

## PR Description

Each PR should include:

- A clear title.
- A short summary of the change.
- The reason for the change.
- How it was tested.
- Screenshots or screen recordings for UI changes.
- Linked issue or task, if one exists.
- Notes about environment variables, Supabase schema changes, or deployment
  concerns, if relevant.

Suggested template:

```md
## Summary

- 

## Testing

- [ ] npm run lint
- [ ] npm test
- [ ] npm run build

## Screenshots

N/A

## Notes

N/A
```

---

## Review Expectations

As an author:

- Keep the PR focused on one issue or feature.
- Explain tradeoffs when the approach is not obvious.
- Respond to review comments clearly.
- Prefer follow-up issues for unrelated improvements discovered during the work.

As a reviewer:

- Prioritize correctness, product behavior, accessibility, security, tests, and
  maintainability.
- Leave specific comments with file and line context.
- Distinguish blocking feedback from suggestions.
- Approve only when the PR is understandable and safe to merge.

---

## Issue Tracking

Before starting work:

- Make sure the issue or task is clear.
- Assign yourself or tell the team you are taking it.
- Confirm the expected behavior for ambiguous work.
- Break large features into smaller issues.

Good issue examples:

```txt
Add user notes to each mock interview question
Fix footer FAQ link pointing to a missing section
Add route tests for invalid parse requests
Create .env.example for local setup
```

---

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Run checks:

```bash
npm run lint
npm test
npm run build
```

Environment variables belong in `.env.local`. Do not commit real secrets.

Required local variables:

```txt
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

Database setup lives in:

```txt
supabase/schema.sql
```

---

## Project-Specific Guidelines

- Read `CODING-STANDARDS.md` before making code changes.
- For Next.js behavior, check `node_modules/next/dist/docs/` because this app
  uses Next.js 16.
- Keep Supabase service-role access server-side only.
- Mock Groq and Supabase in tests.
- Keep file upload behavior aligned between `components/UploadZone.jsx` and
  `lib/parseFile.js`.
- Update prompt normalizer tests when changing AI output contracts.
- Do not add unrelated refactors to feature or bug-fix PRs.

---

## Branch Protection

The `main` branch should be protected:

- No direct pushes to `main`.
- Pull Request required before merging.
- At least one approval required before merge.
- CI should pass before merge.

---

## Deployment

- Production branch: `main`
- Deployment platform: Vercel
- CI: GitHub Actions runs lint, tests, and build

Deployment-impacting changes include:

- Environment variable changes
- Supabase schema changes
- Next.js config changes
- API route behavior changes
- Dependency changes

Call these out clearly in the PR.

---

## Communication

- Share progress regularly in the team channel.
- Ask for help early when blocked.
- Mention blockers with enough context for someone to help.
- Tell the team when a PR is ready for review.
- Keep feedback specific, respectful, and focused on the work.

Useful update examples:

```txt
Working on mock interview notes. I have the UI done and am adding session tests.
Blocked on Supabase schema setup. I need someone to confirm the current project URL.
PR is ready for review: fixes the missing FAQ link and adds a home-page FAQ section.
```

---

## Final Rule

Collaboration and consistency are more important than individual preference.
Make the smallest useful contribution, verify it, and leave the codebase easier
for the next teammate to work in.
