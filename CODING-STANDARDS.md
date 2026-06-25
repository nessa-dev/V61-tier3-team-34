# Coding Standards

This document defines the coding conventions and architecture rules for DashFetch.

DashFetch is a Next.js App Router application that turns job descriptions into
structured job summaries, tailored interview questions, and mock interview
practice flows.

---

## General Principles

- Follow existing patterns in the codebase before introducing new ones.
- Keep changes small, focused, and easy to review.
- Prefer simple, explicit code over clever abstractions.
- Keep user-facing errors clear and actionable.
- Validate data at boundaries: browser input, API request bodies, file parsing,
  database writes, and LLM responses.
- Do not commit secrets, generated build output, or local environment files.

If a convention is not covered here, follow the current codebase style first,
then React, Next.js, MDN, and library documentation.

---

## Tech Stack

- Framework: Next.js 16 App Router
- React: React 19
- Styling: Tailwind CSS 4
- Backend: Next.js route handlers in `app/api`
- Database: Supabase PostgreSQL
- AI: Groq SDK
- File parsing: `pdf-parse` and `mammoth`
- Testing: Vitest, Testing Library, jsdom
- CI: GitHub Actions

This project uses a newer Next.js version with breaking API and configuration
changes. Before writing Next-specific code, read the relevant guide in
`node_modules/next/dist/docs/`.

---

## Project Structure

```txt
app/
  page.js
  layout.js
  globals.css
  job-summary/page.js
  interview-questions/page.js
  mock-interview/page.js
  api/
    ingest/route.js
    parse/route.js
    generate-questions/route.js
components/
  Footer.jsx
  JobInfoCard.jsx
  SampleQuestionsPreview.jsx
  Sidebar.jsx
  UploadZone.jsx
lib/
  clientSession.js
  groq.js
  jobExtraction.js
  parseFile.js
  questionGeneration.js
  supabase.js
supabase/
  schema.sql
test/
  *.test.js
docs/
public/
```

### Responsibilities

- `app/` contains route-level pages, layouts, styles, and API route handlers.
- `app/api/**/route.js` contains server-only HTTP handlers.
- `components/` contains reusable UI components.
- `lib/` contains shared helpers, prompts, parsing, normalization, and clients.
- `lib/clientSession.js` is the only place client components should access
  `sessionStorage`.
- `lib/supabase.js` and `lib/groq.js` are server-only helpers and must not be
  imported into client components.
- `supabase/schema.sql` is the source of truth for database schema setup.
- `test/` contains Vitest tests.

Do not add a `pages/` directory or a generic `src/` tree unless the team agrees
to a larger migration.

---

## Data Flow

The main application flow should stay consistent:

```txt
Client page/component -> API route -> lib helper/client -> Supabase/Groq/parser
```

Current examples:

- Home input submits to `/api/ingest`.
- `/api/ingest` extracts and stores raw job description text.
- `/api/parse` sends cleaned text to Groq and stores structured job data.
- `/api/generate-questions` sends extracted job data to Groq and stores
  generated questions.
- Client pages read short-lived flow state through `lib/clientSession.js`.

Rules:

- Client components must not call Supabase or Groq directly.
- API routes must validate request bodies before calling external services.
- API routes should return safe, user-friendly error messages.
- Server logs can include technical detail; client responses should not expose
  secrets or stack traces.
- LLM responses must be parsed, normalized, and treated as untrusted data.

---

## Next.js Rules

- Use App Router conventions: `page.js`, `layout.js`, and `route.js`.
- Mark components with `"use client"` only when they need browser APIs, state,
  effects, event handlers, or client navigation.
- Keep server-only code out of client components.
- Route handlers use Web Request/Response APIs such as `request.json()` and
  `request.formData()`.
- Do not use deprecated Pages Router API config in App Router route handlers.
- Export route segment options directly when supported by Next.js 16, such as
  `runtime` or `maxDuration`.
- Prefer `NextResponse.json()` for JSON responses from API routes.

---

## Imports and Exports

Use the existing project convention:

- Pages and UI components may use default exports.
- Shared helpers in `lib/` should use named exports.
- Keep imports ordered from framework/library imports to local imports.
- Use the `@/` alias for project-root imports.

Examples:

```js
import UploadZone from "@/components/UploadZone";
import { cleanText } from "@/lib/parseFile";
```

---

## Component Rules

- Use function declarations for React components.
- Keep components focused on rendering and user interaction.
- Move parsing, normalization, API client setup, and prompt building into `lib/`.
- Keep accessibility in mind: semantic HTML, labels, `aria-*` where useful, and
  visible focus states.
- Disable actions during loading states to avoid duplicate requests.
- Show empty, loading, and error states for async flows.

Example:

```jsx
export default function JobInfoCard({ label, value }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">
        {label}
      </h3>
      <p className="text-sm text-ink">{value || "Not provided"}</p>
    </section>
  );
}
```

---

## Hooks and State

- Only call hooks at the top level.
- Use `useState` for local UI state.
- Use `useEffect` only for side effects, not derived rendering logic.
- Use `useMemo` only when it improves clarity or avoids meaningful repeated
  work.
- Add custom hooks only when repeated stateful behavior appears in multiple
  places.
- Keep session persistence behind `lib/clientSession.js`.

---

## Styling

- Use Tailwind CSS utility classes.
- Use project design tokens from `app/globals.css` such as `ink`, `paper`,
  `paper-alt`, `amber`, `line`, `success`, and `error`.
- Reuse the existing `focus-ring` utility for keyboard focus.
- Avoid inline styles unless a value must be computed at runtime.
- Keep layouts responsive with mobile-first classes.
- Keep UI copy concise and specific to interview preparation.
- Do not introduce a second styling system without team agreement.

---

## API and Server Rules

- API routes belong under `app/api/**/route.js`.
- Use `export const runtime = "nodejs"` for routes that need Node APIs or
  Node-only packages.
- Validate input size, type, and required fields before processing.
- Keep Supabase service role usage server-side only.
- Catch external service errors and return stable response shapes.
- Prefer small helper functions in `lib/` for reusable parsing and validation.

---

## AI and Prompt Rules

- Keep extraction prompt logic in `lib/jobExtraction.js`.
- Keep question generation prompt logic in `lib/questionGeneration.js`.
- Update tests when changing prompt output contracts or normalizers.
- Always normalize LLM output before returning it to the client.
- Do not rely on the model to enforce schema correctness by itself.
- Avoid prompts that ask the model to invent missing job details.

---

## File Upload Rules

Supported uploads are:

- `.txt`
- `.pdf`
- `.docx`

Rules:

- Keep accepted client extensions in sync with `lib/parseFile.js`.
- Reject unsupported formats with clear messages.
- Preserve useful paragraph structure while cleaning unsafe control characters.
- Do not add heavyweight file conversion tools unless the team agrees to the
  operational cost.

---

## Testing

Use Vitest for automated tests.

Run before opening a PR:

```bash
npm run lint
npm test
npm run build
```

Testing expectations:

- Add or update tests for helper logic in `lib/`.
- Add component tests when changing meaningful UI behavior.
- Add route-handler tests for validation and error paths when API behavior
  changes.
- Mock Groq and Supabase in tests; do not call real external services.
- Keep tests deterministic and independent of real environment variables.

---

## Naming Conventions

| Type | Rule | Example |
| --- | --- | --- |
| Component | PascalCase | `UploadZone.jsx` |
| Component export | PascalCase function | `function UploadZone()` |
| App route page | Next.js convention | `app/job-summary/page.js` |
| API route | Next.js convention | `app/api/parse/route.js` |
| Helper file | camelCase | `questionGeneration.js` |
| Helper function | camelCase | `normalizeQuestions` |
| Constant | UPPER_SNAKE or descriptive uppercase | `QUESTION_CATEGORIES` |
| Test file | `*.test.js` | `questionGeneration.test.js` |

Use descriptive names tied to the product domain: job descriptions, extracted
job data, interview questions, mock interviews, sessions, and practice flow.

---

## Environment Variables

Required local variables:

```txt
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

Rules:

- Store real values in `.env.local`.
- Keep `.env.local` and other `.env*` files out of git.
- Commit only safe placeholders in `.env.example`.
- Never expose the Supabase service role key to client components.

---

## Documentation

- Update `README.md` when setup steps, scripts, environment variables, or major
  features change.
- Update `supabase/schema.sql` when database structure changes.
- Update tests and docs together when changing a public workflow.
- Keep documentation examples aligned with the actual app, not old project
  names or old feature scopes.

---

## Final Rule

Consistency with this codebase is more important than personal preference. When
in doubt, make the smallest change that keeps the product working and easier to
maintain.
