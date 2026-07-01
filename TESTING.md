# TESTING.md

This document defines the testing standards and workflow for DashFetch backend and API route testing.

DashFetch uses **Vitest** for all unit testing. The goal is to ensure backend logic is reliable, deterministic, and fully covered using mocked external services.

All tests must avoid real network calls, real database access, or real LLM requests.

---

## Running Backend Unit Tests

Backend tests are executed using Vitest.

### Run all tests

```bash
npm test
```

---

## Installing Coverage

Install coverage support:

```bash
npm install -D @vitest/coverage-v8@2.1.9
```

---

## Run Coverage Report

```bash
npm run coverage
```

---

## How Mocks Are Structured

All external dependencies are mocked to ensure tests are isolated and deterministic.

---

### Groq (LLM Service)

Used for AI generation and parsing responses.

```js
vi.mock("@/lib/groq", () => ({
  getGroqClient: vi.fn(),
  GROQ_MODEL: "mock-model",
}));
```

Used to simulate:
- successful LLM responses
- malformed JSON responses
- timeouts and API failures

---

### Supabase (Database)

Used for session persistence and updates.

```js
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));
```

Used to simulate:
- successful updates
- failed updates
- thrown database errors

---

### Job / Question Utilities

Used for parsing and transforming LLM output.

```js
vi.mock("@/lib/jobExtraction", () => ({
  parseLLMJson: vi.fn(),
}));

vi.mock("@/lib/questionGeneration", () => ({
  buildQuestionGenerationPrompt: vi.fn(),
  normalizeQuestions: vi.fn(),
}));
```

Used to simulate:
- valid structured output
- malformed JSON
- normalized vs raw responses

---

## How to Add New API Route Tests

### 1. Import the route handler

```js
import { POST } from "@/app/api/your-route/route";
```

---

### 2. Mock external dependencies first

Always mock before importing behavior-dependent logic.

```js
vi.mock("@/lib/groq", () => ({
  getGroqClient: vi.fn(),
}));
```

---

### 3. Create a request object

Routes are tested by calling the handler directly.

```js
const req = {
  json: vi.fn().mockResolvedValue({
    extractedJob: {},
  }),
};
```

---

### 4. Call the route

```js
const res = await POST(req);
```

---

### 5. Assert behavior (not implementation)

```js
expect(res.status).toBe(200);

const body = await res.json();
expect(body).toHaveProperty("questions");
```

---

Tests should validate:
- API behavior
- error handling
- response shape

NOT internal implementation details.
