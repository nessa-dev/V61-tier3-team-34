import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/groq", () => ({
  getGroqClient: vi.fn(),
  GROQ_MODEL: "mock-model",
}));

vi.mock("@/lib/questionGeneration", () => ({
  buildQuestionGenerationPrompt: vi.fn(() => "prompt"),
  normalizeQuestions: vi.fn((q) => q),
}));

vi.mock("@/lib/jobExtraction", () => ({
  parseLLMJson: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

import { POST } from "../app/api/generate-questions/route";

// ✅ import mocked modules ONLY as namespaces (safe access pattern)
import * as groq from "@/lib/groq";
import * as jobExtraction from "@/lib/jobExtraction";
import * as supabase from "@/lib/supabase";

const { getGroqClient } = groq;
const { parseLLMJson } = jobExtraction;
const { getSupabaseClient } = supabase;

describe("POST /api/generate-questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Validation tests
  // ---------------------------------------------------------------------------

  describe("Validation", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = {
        json: vi.fn().mockRejectedValue(new Error()),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Invalid request body.",
      });
    });

    it("returns 400 when extractedJob is missing", async () => {
      const req = {
        json: vi.fn().mockResolvedValue({}),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 when extractedJob is not an object", async () => {
      const req = {
        json: vi.fn().mockResolvedValue({
          extractedJob: "developer",
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Success tests
  // ---------------------------------------------------------------------------

  describe("Successful generation", () => {
    it("returns generated questions", async () => {
      getGroqClient.mockReturnValue({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: '{"technical":[]}',
                  },
                },
              ],
            }),
          },
        },
      });

      parseLLMJson.mockReturnValue({
        technical: [],
      });

      const req = {
        json: vi.fn().mockResolvedValue({
          extractedJob: {
            job_title: "Developer",
          },
        }),
      };

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.questions).toEqual({
        technical: [],
      });
    });

    it("returns sessionId when supplied", async () => {
      getGroqClient.mockReturnValue({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: "{}" } }],
            }),
          },
        },
      });

      parseLLMJson.mockReturnValue({});

      getSupabaseClient.mockReturnValue({
        from: () => ({
          update: () => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const req = {
        json: vi.fn().mockResolvedValue({
          sessionId: "123",
          extractedJob: {},
        }),
      };

      const res = await POST(req);
      const body = await res.json();

      expect(body.sessionId).toBe("123");
    });
  });

  // ---------------------------------------------------------------------------
  // Groq failures
  // ---------------------------------------------------------------------------

  describe("Groq failures", () => {
    it("returns 502 when Groq throws", async () => {
      getGroqClient.mockReturnValue({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error("timeout")),
          },
        },
      });

      const req = {
        json: vi.fn().mockResolvedValue({
          extractedJob: {},
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(502);
    });

    it("returns 502 when LLM returns malformed JSON", async () => {
      getGroqClient.mockReturnValue({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: "not json" } }],
            }),
          },
        },
      });

      parseLLMJson.mockImplementation(() => {
        throw new Error("bad json");
      });

      const req = {
        json: vi.fn().mockResolvedValue({
          extractedJob: {},
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(502);
    });
  });

  // ---------------------------------------------------------------------------
  // Supabase
  // ---------------------------------------------------------------------------

  describe("Supabase persistence", () => {
    it("continues when database update succeeds", async () => {
      getGroqClient.mockReturnValue({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: "{}" } }],
            }),
          },
        },
      });

      parseLLMJson.mockReturnValue({});

      getSupabaseClient.mockReturnValue({
        from: () => ({
          update: () => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const req = {
        json: vi.fn().mockResolvedValue({
          sessionId: "1",
          extractedJob: {},
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("still returns 200 when Supabase update fails", async () => {
      getGroqClient.mockReturnValue({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{ message: { content: "{}" } }],
            }),
          },
        },
      });

      parseLLMJson.mockReturnValue({});

      getSupabaseClient.mockReturnValue({
        from: () => ({
          update: () => ({
            eq: vi.fn().mockResolvedValue({
              error: { message: "db failed" },
            }),
          }),
        }),
      });

      const req = {
        json: vi.fn().mockResolvedValue({
          sessionId: "1",
          extractedJob: {},
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });
});