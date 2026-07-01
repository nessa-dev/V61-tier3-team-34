import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InterviewQuestionsPage from "@/app/interview-questions/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/interview-questions",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}));

function saveTestSession(session) {
  window.sessionStorage.setItem("dashfetch_session", JSON.stringify(session));
}

function mockGenerateQuestionsFetch() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      questions: {
        technical: [{ id: "0", question: "Technical?", sample_answer: "" }],
        behavioral: [],
        experience: [],
      },
    }),
  });
}

describe("InterviewQuestionsPage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockGenerateQuestionsFetch();
  });

  it("passes the saved quantity when auto-generating questions", async () => {
    saveTestSession({
      sessionId: "session-1",
      extractedJob: { job_title: "Frontend Developer" },
      quantityPerCategory: 4,
      questions: null,
    });

    render(<InterviewQuestionsPage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      sessionId: "session-1",
      extractedJob: { job_title: "Frontend Developer" },
      quantityPerCategory: 4,
    });
  });

  it("passes the saved quantity when regenerating questions", async () => {
    saveTestSession({
      sessionId: "session-2",
      extractedJob: { job_title: "Backend Developer" },
      quantityPerCategory: 6,
      questions: {
        technical: [{ id: "0", question: "Existing question?" }],
        behavioral: [],
        experience: [],
      },
    });

    render(<InterviewQuestionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate New Questions" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      sessionId: "session-2",
      extractedJob: { job_title: "Backend Developer" },
      quantityPerCategory: 6,
    });
  });
});
