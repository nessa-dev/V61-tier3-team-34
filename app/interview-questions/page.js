"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { loadSession, saveSession } from "@/lib/clientSession";

const CATEGORIES = [
  { key: "technical", label: "Technical Questions" },
  { key: "behavioral", label: "Behavioral Questions" },
  { key: "experience", label: "Experience Questions" },
];

export default function InterviewQuestionsPage() {
  const router = useRouter();
  const [session, setSession] = useState(() => loadSession());
  const [activeCategory, setActiveCategory] = useState("technical");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy All Questions");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.extractedJob && !session?.questions) {
      generateQuestions(session);
    }
    // Only run the auto-generate check once, against the session loaded on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateQuestions(data) {
    setIsGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: data.sessionId,
          extractedJob: data.extractedJob,
          quantityPerCategory: data.quantityPerCategory,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Could not generate questions.");

      saveSession({ questions: result.questions });
      setSession((prev) => ({ ...prev, questions: result.questions }));
    } catch (err) {
      setError(err.message || "Something went wrong generating questions.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopyAll() {
    const list = session?.questions?.[activeCategory] || [];
    const text = list.map((q, i) => `${i + 1}. ${q.question}`).join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopyLabel("Copied!");
        setTimeout(() => setCopyLabel("Copy All Questions"), 2000);
      })
      .catch(() => setError("Couldn't copy to clipboard."));
  }

  if (!session?.extractedJob) {
    return (
      <div className="flex flex-col min-h-screen md:flex-row">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="text-center max-w-sm">
            <h1 className="font-display text-2xl font-semibold text-ink mb-3">
              No job description analyzed yet
            </h1>
            <Link
              href="/"
              className="inline-flex rounded-full bg-amber-dark px-6 py-2.5 text-sm font-semibold text-paper hover:bg-amber transition-colors focus-ring"
            >
              Go to home page
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const questionList = session?.questions?.[activeCategory] || [];

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1">
          <div className="max-w-4xl mx-auto px-6 py-10 md:py-14">
            <h1 className="font-display text-3xl font-semibold text-ink mb-1">
              Interview Questions
            </h1>
            <p className="text-sm text-ink/60 mb-8">
              Personalized questions based on your job description
            </p>

            <div role="tablist" aria-label="Question category" className="flex gap-2 mb-6 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  role="tab"
                  aria-selected={activeCategory === cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors focus-ring ${
                    activeCategory === cat.key
                      ? "bg-ink text-paper"
                      : "bg-paper-alt text-ink/60 hover:text-ink"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {error && (
              <p role="alert" className="mb-4 text-sm text-error">
                {error}
              </p>
            )}

            {isGenerating ? (
              <p className="text-sm text-ink/60">Generating your questions…</p>
            ) : questionList.length === 0 ? (
              <p className="text-sm text-ink/40 italic">No questions available.</p>
            ) : (
              <ol className="space-y-4 mb-8">
                {questionList.map((q, i) => (
                  <li
                    key={q.id || i}
                    className="rounded-xl border border-line bg-white p-5"
                  >
                    <p className="text-sm font-medium text-ink mb-1">
                      <span className="text-amber-dark mr-2">{i + 1}.</span>
                      {q.question}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyAll}
                disabled={questionList.length === 0}
                className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink hover:bg-paper-alt transition-colors focus-ring disabled:opacity-50"
              >
                {copyLabel}
              </button>
              <button
                onClick={() => generateQuestions(session)}
                disabled={isGenerating}
                className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink hover:bg-paper-alt transition-colors focus-ring disabled:opacity-50"
              >
                {isGenerating ? "Generating…" : "Generate New Questions"}
              </button>
              <button
                onClick={() => router.push("/mock-interview")}
                className="rounded-full bg-amber-dark px-5 py-2.5 text-sm font-semibold text-paper hover:bg-amber transition-colors focus-ring"
              >
                Start Mock Interview
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
