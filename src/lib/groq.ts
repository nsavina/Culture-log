import Groq from "groq-sdk";

export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("GROQ_API_KEY not set. AI features unavailable.");
    return null;
  }
  return new Groq({ apiKey });
}
