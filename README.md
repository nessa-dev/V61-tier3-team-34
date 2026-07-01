# DashFetch

---

## Project Overview

### The Challenge

Empower job seekers with fast, personalized, and effective interview preparation by transforming any job description into tailored, role‑specific practice questions.

### Project Vision

Candidates waste time searching for practice questions that may not even match the role they're applying for. Job descriptions contain everything needed to prepare effectively — DashFetch turns that text into a curated set of role-specific, skill-aligned interview questions.

By analyzing the responsibilities, required skills, and experience level in a job description, DashFetch generates tailored behavioral, technical, and experience-based questions that mirror what real interviewers ask, including a Mock Interview mode for hands-on practice.

---

## Key Features

- Upload a job description (`.txt`, `.pdf`, `.docx`) or paste it directly into a text box.
- AI-powered extraction of structured job data (title, skills, responsibilities, experience, etc.) via Groq.
- Generated interview questions across three categories: Technical, Behavioral, and Experience-based.
- Job Summary screen reviewing the extracted job data before practicing.
- Mock Interview mode — one question at a time, with a "Show Answer" reveal and STAR-method tips.
- Fully responsive, accessible UI (desktop and mobile).

---

## Tech Stack

| Layer            | Technology               |
| :---------------- | :----------------------- |
| **Framework**     | **Next.js (App Router)** — full-stack: React frontend + API routes backend |
| **Styling**        | **Tailwind CSS**         |
| **Database**       | **Supabase (PostgreSQL)** |
| **AI Layer**       | **Groq**                 |
| **Hosting**        | **Vercel**                |
| **Testing**        | **Vitest**                |
| **CI/CD**          | **GitHub Actions** — runs lint + tests on every Pull Request before merge/deploy |

> Next.js is full-stack on its own, so frontend and backend are deployed together as a single Vercel project — no separate Netlify/Render split.

---

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in Supabase service-role + Groq credentials
npm run dev
```

Required local environment variables:

```txt
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed in
client-side code or `NEXT_PUBLIC_` variables.

Set up the database by running `supabase/schema.sql` in the Supabase SQL editor for your project.

### Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

---

## Project Structure

```
app/
  page.js                      # Home — upload/paste a job description
  job-summary/page.js          # Extracted job data review
  interview-questions/page.js  # Questions by category (tabs)
  mock-interview/page.js       # One-question-at-a-time practice
  api/
    ingest/route.js            # Extracts + stores raw JD text
    parse/route.js             # Groq: JD text -> structured JSON
    generate-questions/route.js # Groq: structured JSON -> questions
components/                    # Shared UI (Sidebar, Footer, cards, upload zone)
lib/                           # Supabase/Groq clients, prompts, parsing, validation
supabase/schema.sql            # Database schema (run once on a fresh project)
test/                          # Vitest unit tests
```

---

## Meet the Team

| Name              | Role            | Links      |
| :---------------- | :------------   | :--------- |
| **Roger**         | Scrum Master    |            |
| **Thanasis**      | Web Developer   |            |
| **Jason**         | Web Developer   |            |
| **Vanessa**       | Web Developer   |            |
| **Simbongile**    | Web Developer   |            |
| **Val**           | Technical Guide |            |
