import { NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL, truncateJDText } from "@/lib/groq";
import {
  buildExtractionPrompt,
  normalizeExtractedJob,
  parseLLMJson,
} from "@/lib/jobExtraction";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST /api/parse
 * Body: { sessionId: string, jdText: string }
 *
 * Sends the JD text to Groq with a structured-extraction prompt,
 * validates the JSON response, saves it to the session row, and
 * returns the structured job data to the client.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sessionId, jdText } = body;

  if (!jdText || jdText.trim().length < 30) {
    return NextResponse.json(
      { error: "Job description text is missing or too short to analyze." },
      { status: 400 }
    );
  }

  let extractedJob;
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: buildExtractionPrompt(truncateJDText(jdText)) }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices?.[0]?.message?.content || "";
    const parsed = parseLLMJson(rawContent);
    extractedJob = normalizeExtractedJob(parsed);
  } catch (err) {
    console.error("Groq extraction error:", err);
    return NextResponse.json(
      {
        error:
          "You have to upload another file, with real .txt, .docx and .pdf format. Not only file extension.",
      },
      { status: 502 }
    );
  }

  if (sessionId) {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("jd_sessions")
        .update({ extracted_json: extractedJob })
        .eq("id", sessionId);

      if (error) {
        console.error("Supabase update error (extracted_json):", error);
      }
    } catch (err) {
      console.error("Supabase write skipped:", err);
    }
  }

  return NextResponse.json({ sessionId: sessionId || null, extractedJob });
}
