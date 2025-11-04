// api/groq-chat.js
import Groq from "groq-sdk";

export const config = { runtime: "edge" }; // Required for Vercel Edge Functions

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { messages = [], stream = true, model } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response("Missing GROQ_API_KEY", { status: 500 });
    }

    const groq = new Groq({ apiKey });

    // Add a fallback system prompt if none is provided
    const safeMessages =
      Array.isArray(messages) && messages.length > 0
        ? messages
        : [
            {
              role: "system",
              content:
                "You are ResumeAI for Deva Sai Kumar Bheesetti. Answer using only the provided context. Be concise (1–4 sentences).",
            },
            { role: "user", content: "Hello" },
          ];

    // Create a streaming response from Groq
    const response = await groq.chat.completions.create({
      model: model || "llama-3.1-8b-instant",
      messages: safeMessages,
      stream,
    });

    const encoder = new TextEncoder();
    const streamBody = new ReadableStream({
      async start(controller) {
        for await (const part of response) {
          const token = part?.choices?.[0]?.delta?.content ?? "";
          if (token) controller.enqueue(encoder.encode(token));
        }
        controller.close();
      },
    });

    return new Response(streamBody, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Groq API error:", err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
