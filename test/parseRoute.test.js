import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../app/api/parse/route";

vi.mock("@/lib/groq", () => ({
  getGroqClient: vi.fn(),
  GROQ_MODEL: "mock-model",
  truncateJDText: vi.fn((text) => text),
}));

vi.mock("@/lib/jobExtraction", () => ({
  buildExtractionPrompt: vi.fn(() => "mock prompt"),
  parseLLMJson: vi.fn(),
  normalizeExtractedJob: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

import { getGroqClient } from "@/lib/groq";
import {
  parseLLMJson,
  normalizeExtractedJob,
} from "@/lib/jobExtraction";
import { getSupabaseClient } from "@/lib/supabase";

beforeEach(() => {
  vi.resetAllMocks();

  // safe default supabase mock (prevents accidental crashes)
  getSupabaseClient.mockReturnValue({
    from: () => ({
      update: () => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  });
});

/**
 * Helpers
 */
const makeRequest = (payload) =>
  new Request("http://localhost/api/parse", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

const mockGroqSuccess = (content = '{"job_title":"Frontend Developer"}') => {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content } }],
  });

  getGroqClient.mockReturnValue({
    chat: {
      completions: { create },
    },
  });

  return create;
};

/**
 * TESTS
 */
describe("POST /api/parse", () => {
  /**
   * SUCCESS
   */
  describe("success", () => {
    it("returns extracted job data for valid input", async () => {
      mockGroqSuccess();

      parseLLMJson.mockReturnValue({
        job_title: "Frontend Developer",
      });

      normalizeExtractedJob.mockReturnValue({
        job_title: "Frontend Developer",
      });

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description for React.",
        })
      );

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.extractedJob.job_title).toBe("Frontend Developer");
    });
  });

  /**
   * VALIDATION
   */
  describe("validation", () => {
    it("returns 400 for invalid JSON", async () => {
      const req = {
        json: vi.fn().mockRejectedValue(new Error("bad json")),
      };

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when jdText is missing", async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
    });

    it("returns 400 for empty job description", async () => {
      const res = await POST(makeRequest({ jdText: "   " }));
      expect(res.status).toBe(400);
    });

    it("returns 400 for short job description", async () => {
      const res = await POST(makeRequest({ jdText: "short" }));
      expect(res.status).toBe(400);
    });

    it("handles unexpected payload shape safely", async () => {
      mockGroqSuccess();

      const res = await POST(
        makeRequest({
          jdText: "valid enough long job description text",
        })
      );

      expect([200, 502, 400]).toContain(res.status);
    });
  });

  /**
   * LLM FAILURES
   */
  describe("LLM failures", () => {
    it("returns 502 when Groq throws error", async () => {
      getGroqClient.mockReturnValue({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error("Groq down")),
          },
        },
      });

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect(res.status).toBe(502);
    });

    it("returns 502 when LLM returns invalid JSON", async () => {
      mockGroqSuccess("not-json");

      parseLLMJson.mockImplementation(() => {
        throw new Error("invalid json");
      });

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect(res.status).toBe(502);
    });

    it("handles LLM returning empty JSON object", async () => {
      mockGroqSuccess("{}");

      parseLLMJson.mockReturnValue({});
      normalizeExtractedJob.mockReturnValue({});

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect(res.status).toBe(200);
    });

    it("handles LLM timeout scenario", async () => {
      getGroqClient.mockReturnValue({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error("timeout")),
          },
        },
      });

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect([502, 500]).toContain(res.status);
    });
  });

  /**
   * SUPABASE
   */
  describe("Supabase integration", () => {
    it("updates Supabase when sessionId exists", async () => {
      mockGroqSuccess("{}");

      parseLLMJson.mockReturnValue({});
      normalizeExtractedJob.mockReturnValue({ job_title: "Dev" });

      const eq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn(() => ({ eq }));
      const from = vi.fn(() => ({ update }));

      getSupabaseClient.mockReturnValue({ from });

      await POST(
        makeRequest({
          sessionId: "123",
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect(from).toHaveBeenCalledWith("jd_sessions");
      expect(update).toHaveBeenCalled();
      expect(eq).toHaveBeenCalledWith("id", "123");
    });

    it("still returns 200 when Supabase update fails", async () => {
      mockGroqSuccess("{}");

      parseLLMJson.mockReturnValue({});
      normalizeExtractedJob.mockReturnValue({});

      const eq = vi.fn().mockResolvedValue({
        error: new Error("DB failed"),
      });

      getSupabaseClient.mockReturnValue({
        from: vi.fn(() => ({
          update: vi.fn(() => ({ eq })),
        })),
      });

      const res = await POST(
        makeRequest({
          sessionId: "123",
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect(res.status).toBe(200);
    });
  });

  /**
   * EDGE CASES
   */
  describe("edge cases", () => {
    it("handles extremely large job description", async () => {
      mockGroqSuccess();

      const res = await POST(
        makeRequest({
          jdText: "x".repeat(50000),
        })
      );

      expect(res.status).toBe(200);
    });

    it("handles whitespace-heavy input", async () => {
      const res = await POST(
        makeRequest({
          jdText: "   \n\t   valid long text here   ",
        })
      );

      expect([200, 400]).toContain(res.status);
    });

    it("handles LLM returning partial JSON fields", async () => {
      mockGroqSuccess('{"job_title": ""}');

      parseLLMJson.mockReturnValue({ job_title: "" });
      normalizeExtractedJob.mockReturnValue({ job_title: "" });

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect([200, 400]).toContain(res.status);
    });
  });
});