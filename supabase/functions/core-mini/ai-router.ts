// Javari-first model router with OpenAI/Anthropic fallbacks
import { AI } from "./env.ts";
import { error as logError } from "./log.ts";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: "javari" | "openai" | "anthropic";
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function callJavari(
  messages: AIMessage[],
  model: string = "gpt-4o-mini",
  requestId: string
): Promise<AIResponse> {
  const response = await fetch(`${AI.javariUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI.javariKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Javari API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: data.model,
    provider: "javari",
    usage: data.usage,
  };
}

async function callOpenAI(
  messages: AIMessage[],
  model: string = "gpt-4o-mini",
  requestId: string
): Promise<AIResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI.openaiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: data.model,
    provider: "openai",
    usage: data.usage,
  };
}

async function callAnthropic(
  messages: AIMessage[],
  model: string = "claude-3-5-sonnet-20241022",
  requestId: string
): Promise<AIResponse> {
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": AI.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemMessage?.content || "",
      messages: conversationMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    model: data.model,
    provider: "anthropic",
    usage: {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
      total_tokens: data.usage.input_tokens + data.usage.output_tokens,
    },
  };
}

export async function generate(
  messages: AIMessage[],
  options: {
    model?: string;
    requestId: string;
  }
): Promise<AIResponse> {
  const { model = "gpt-4o-mini", requestId } = options;

  try {
    if (AI.javariUrl && AI.javariKey) {
      return await callJavari(messages, model, requestId);
    }
  } catch (err) {
    logError("Javari API failed, falling back", {
      request_id: requestId,
      error: err.message,
    });
  }

  try {
    if (AI.openaiKey) {
      return await callOpenAI(messages, model, requestId);
    }
  } catch (err) {
    logError("OpenAI API failed, falling back", {
      request_id: requestId,
      error: err.message,
    });
  }

  if (AI.anthropicKey) {
    return await callAnthropic(messages, "claude-3-5-sonnet-20241022", requestId);
  }

  throw new Error("No AI provider configured");
}
