import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/parseFile", () => ({
  extractTextFromFile: vi.fn(),
  cleanText: vi.fn((text) => text),
  UnsupportedFileError: class UnsupportedFileError extends Error {},
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

import { POST } from "../app/api/ingest/route";
import {
  extractTextFromFile,
  cleanText,
   UnsupportedFileError,
} from "@/lib/parseFile";
import { getSupabaseClient } from "@/lib/supabase";

describe("POST /api/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // JSON validation tests
  // Verify pasted job descriptions are accepted only when valid and
  // rejected when empty, missing, or too short.
  // ---------------------------------------------------------------------------

  describe("JSON validation", () => {
    it("returns 400 when job description text is missing", async () => {
      cleanText.mockReturnValue("");

      const req = {
        headers: {
          get: vi.fn().mockReturnValue("application/json"),
        },
        json: vi.fn().mockResolvedValue({}),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);

      expect(await res.json()).toEqual({
        error:
          "The job description looks too short or empty. Please provide more detail.",
      });
    });

    it("returns 400 when cleaned text is too short", async () => {
      cleanText.mockReturnValue("Too short");

      const req = {
        headers: {
          get: vi.fn().mockReturnValue("application/json"),
        },
        json: vi.fn().mockResolvedValue({
          text: "Too short",
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("accepts a valid pasted job description", async () => {
      const jd =
        "This is a software engineering position requiring Java, Spring Boot, REST APIs, SQL, AWS, and Git experience.";

      cleanText.mockReturnValue(jd);

      getSupabaseClient.mockReturnValue({
        from: () => ({
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "session123",
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const req = {
        headers: {
          get: vi.fn().mockReturnValue("application/json"),
        },
        json: vi.fn().mockResolvedValue({
          text: jd,
        }),
      };

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);

      expect(body).toEqual({
        sessionId: "session123",
        jdText: jd,
      });
    });

    it("returns 500 when request.json throws unexpectedly", async () => {
      const req = {
        headers: {
          get: vi.fn().mockReturnValue("application/json"),
        },
        json: vi.fn().mockRejectedValue(new Error("bad json")),
      };

      const res = await POST(req);

      expect(res.status).toBe(500);

      expect(await res.json()).toEqual({
        error:
          "Something went wrong while processing your job description.",
      });
    });
  });

    // ---------------------------------------------------------------------------
  // File upload validation tests
  // Verify multipart uploads correctly handle missing files, unreadable files,
  // unsupported file types, and extraction failures.
  // ---------------------------------------------------------------------------

  describe("File upload validation", () => {
    it("returns 400 when formData cannot be parsed", async () => {
      const req = {
        headers: {
          get: vi.fn().mockReturnValue("multipart/form-data"),
        },
        formData: vi.fn().mockRejectedValue(new Error("bad form")),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);

      expect(await res.json()).toEqual({
        error: "Could not read the uploaded file. Please try again.",
      });
    });

    it("returns 400 when no file is provided", async () => {
      const req = {
        headers: {
          get: vi.fn().mockReturnValue("multipart/form-data"),
        },
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(null),
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);

      expect(await res.json()).toEqual({
        error: "No file was provided.",
      });
    });

    it("returns 400 when file is a string", async () => {
      const req = {
        headers: {
          get: vi.fn().mockReturnValue("multipart/form-data"),
        },
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue("fake"),
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 when file cannot be read", async () => {
      const file = {
        name: "resume.pdf",
        arrayBuffer: vi.fn().mockRejectedValue(new Error("read failed")),
      };

      const req = {
        headers: {
          get: vi.fn().mockReturnValue("multipart/form-data"),
        },
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(file),
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);

      expect(await res.json()).toEqual({
        error: "Could not read the file contents. Please try again.",
      });
    });

    it("returns 400 for unsupported file types", async () => {
      const file = {
        name: "resume.exe",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      extractTextFromFile.mockRejectedValue(
        new UnsupportedFileError("Unsupported file type.")
      );

      const req = {
        headers: {
          get: vi.fn().mockReturnValue("multipart/form-data"),
        },
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(file),
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);

      expect(await res.json()).toEqual({
        error: "Unsupported file type.",
      });
    });

    it("returns 422 when text extraction fails", async () => {
      const file = {
        name: "resume.pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      extractTextFromFile.mockRejectedValue(new Error("pdf parser failed"));

      const req = {
        headers: {
          get: vi.fn().mockReturnValue("multipart/form-data"),
        },
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(file),
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(422);

      expect(await res.json()).toEqual({
        error:
          "Could not extract text from the file. Please try pasting the text directly instead.",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Successful ingestion tests
  // Verify valid job descriptions are stored in Supabase and a new session ID
  // is returned for both pasted text and uploaded files.
  // ---------------------------------------------------------------------------

  describe("Successful ingestion", () => {
    it("stores uploaded file text and returns a session id", async () => {
      const jd =
        "This software engineering position requires Java, Spring Boot, REST APIs, SQL, AWS, Docker, Kubernetes, and Git experience.";

      const file = {
        name: "resume.pdf",
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      extractTextFromFile.mockResolvedValue(jd);

      getSupabaseClient.mockReturnValue({
        from: () => ({
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "abc123",
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const req = {
        headers: {
          get: vi.fn().mockReturnValue("multipart/form-data"),
        },
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(file),
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(200);

      expect(await res.json()).toEqual({
        sessionId: "abc123",
        jdText: jd,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Database persistence tests
  // Verify database insert failures are handled gracefully and appropriate
  // error responses are returned.
  // ---------------------------------------------------------------------------

  describe("Supabase persistence", () => {
    it("returns 500 when Supabase insert fails", async () => {
      const jd =
        "This software engineering position requires Java, Spring Boot, REST APIs, SQL, AWS, Docker, Kubernetes, and Git experience.";

      cleanText.mockReturnValue(jd);

      getSupabaseClient.mockReturnValue({
        from: () => ({
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  message: "database failure",
                },
              }),
            }),
          }),
        }),
      });

      const req = {
        headers: {
          get: vi.fn().mockReturnValue("application/json"),
        },
        json: vi.fn().mockResolvedValue({
          text: jd,
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(500);

      expect(await res.json()).toEqual({
        error: "Could not save the job description. Please try again.",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Unexpected failure tests
  // Verify unexpected runtime exceptions return consistent server errors
  // without crashing the route.
  // ---------------------------------------------------------------------------

  describe("Unexpected failures", () => {
    it("returns 500 when getSupabaseClient throws", async () => {
      const jd =
        "This software engineering position requires Java, Spring Boot, REST APIs, SQL, AWS, Docker, Kubernetes, and Git experience.";

      cleanText.mockReturnValue(jd);

      getSupabaseClient.mockImplementation(() => {
        throw new Error("connection failed");
      });

      const req = {
        headers: {
          get: vi.fn().mockReturnValue("application/json"),
        },
        json: vi.fn().mockResolvedValue({
          text: jd,
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(500);

      expect(await res.json()).toEqual({
        error:
          "Something went wrong while processing your job description.",
      });
    });
  });
});

