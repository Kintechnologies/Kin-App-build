/**
 * Chat API agentic loop tests
 *
 * Covers:
 *   - maxIterations guard: Claude keeps requesting tool use → fallback message after 3 iterations
 *   - Tool result accumulation: each tool call result is appended to the messages array
 *   - Normal flow: Claude responds with text on first turn (no tool call)
 *   - Error handling: Anthropic SDK throws → route returns 500
 *   - Input validation: missing message → 400
 *   - Auth: unauthenticated request → 401
 *
 * Strategy: mock Anthropic client, Supabase, auth, and buildSystemPrompt.
 * Inspect the messages array passed to each anthropic.messages.create() call.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

// ── Hoisted mock handles ──────────────────────────────────────────────────────
const { mockCreate, mockGetAuthenticatedUser, mockSupabaseChain } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  const mockGetAuthenticatedUser = vi.fn();

  // Chainable Supabase mock — all terminal ops resolve successfully with empty data
  // Covers the full set of methods used by the B30 chat route:
  // select, eq, gte, lte, is, in, order, limit (context queries) + single (profile) + insert (save)
  const chain: Record<string, unknown> = {};
  const noop = vi.fn().mockReturnValue(chain);
  chain["select"] = noop;
  chain["eq"] = noop;
  chain["gte"] = noop;
  chain["lte"] = noop;
  chain["is"] = noop;
  chain["in"] = noop;
  chain["order"] = noop;
  chain["limit"] = vi.fn().mockResolvedValue({ data: [], error: null });
  chain["single"] = vi.fn().mockResolvedValue({ data: null, error: null });
  chain["insert"] = vi.fn().mockResolvedValue({ error: null });

  return { mockCreate, mockGetAuthenticatedUser, mockSupabaseChain: chain };
});

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      status: (init as { status?: number } | undefined)?.status ?? 200,
      json: async () => data,
    })),
  },
}));

vi.mock("@/lib/supabase/api-auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => mockSupabaseChain),
  })),
}));

vi.mock("@/lib/anthropic", () => ({
  getAnthropicClient: vi.fn(() => ({ messages: { create: mockCreate } })),
  ANTHROPIC_MODEL: "claude-test-model",
}));

vi.mock("@/lib/system-prompt", () => ({
  buildSystemPrompt: vi.fn(() => "mocked system prompt"),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Rate limiter — allow all requests in tests (Upstash env vars not present in CI)
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 99, limit: 100, reset: 0 }),
  rateLimitResponse: vi.fn(),
}));

vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-xxx");

import { POST } from "../app/api/chat/route";

// ── Response builders ─────────────────────────────────────────────────────────

function textResponse(text: string): Anthropic.Message {
  return {
    id: "msg_text",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text, citations: null }],
    model: "claude-test-model",
    stop_reason: "end_turn",
    stop_sequence: null,
    container: null,
    usage: {
      input_tokens: 10,
      output_tokens: 20,
      cache_creation: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      inference_geo: null,
      server_tool_use: null,
      service_tier: null,
    },
  };
}

function toolUseResponse(id = "tu_001", query = "test query"): Anthropic.Message {
  return {
    id: "msg_tool",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id,
        name: "web_search",
        input: { query },
      } as Anthropic.ToolUseBlock,
    ],
    model: "claude-test-model",
    stop_reason: "tool_use",
    stop_sequence: null,
    container: null,
    usage: {
      input_tokens: 10,
      output_tokens: 20,
      cache_creation: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      inference_geo: null,
      server_tool_use: null,
      service_tier: null,
    },
  };
}

function makeRequest(message: string = "What should we have for dinner?"): Request {
  return new Request("https://example.com/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Chat API — normal flow (no tool use)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-001", email: "user@example.com" });
    (mockSupabaseChain["insert"] as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    (mockSupabaseChain["limit"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    (mockSupabaseChain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
  });

  it("returns the assistant's text response", async () => {
    mockCreate.mockResolvedValue(textResponse("Pasta sounds great tonight!"));

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ response: "Pasta sounds great tonight!" });
  });

  it("calls anthropic.messages.create exactly once when Claude returns text directly", async () => {
    mockCreate.mockResolvedValue(textResponse("Tacos!"));

    await POST(makeRequest());
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("includes the user message in the messages array sent to Anthropic", async () => {
    mockCreate.mockResolvedValue(textResponse("Sure!"));

    await POST(makeRequest("Plan my week"));
    const callArgs = mockCreate.mock.calls[0][0] as { messages: Anthropic.MessageParam[] };
    const lastMsg = callArgs.messages.at(-1);
    // B30 route prepends [CONTEXT] block before the user message
    expect(lastMsg?.role).toBe("user");
    expect(lastMsg?.content).toEqual(expect.stringContaining("Plan my week"));
  });
});

describe("Chat API — agentic loop: maxIterations guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-001", email: "user@example.com" });
    (mockSupabaseChain["insert"] as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    (mockSupabaseChain["limit"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    (mockSupabaseChain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
  });

  it("stops after maxIterations (3) even if Claude keeps requesting tool use", async () => {
    // Always return a tool_use block — never text
    mockCreate.mockResolvedValue(toolUseResponse("tu_loop", "endless search"));

    await POST(makeRequest());

    // 1 initial call + 3 loop iterations (while iterations < 3) = 4 total
    expect(mockCreate).toHaveBeenCalledTimes(4);
  });

  it("returns a graceful fallback message when maxIterations is exhausted with no text", async () => {
    mockCreate.mockResolvedValue(toolUseResponse("tu_loop", "endless search"));

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBe("I couldn't generate a response right now.");
  });

  it("uses the final response's text when maxIterations is hit but last message has text", async () => {
    // First two calls → tool_use; third call → text
    mockCreate
      .mockResolvedValueOnce(toolUseResponse("tu_1", "search 1"))
      .mockResolvedValueOnce(toolUseResponse("tu_2", "search 2"))
      .mockResolvedValueOnce(textResponse("Here is what I found after searching."));

    const res = await POST(makeRequest());
    const data = await res.json();
    expect(data.response).toBe("Here is what I found after searching.");
  });
});

describe("Chat API — agentic loop: tool result accumulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-001", email: "user@example.com" });
    (mockSupabaseChain["insert"] as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    (mockSupabaseChain["limit"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    (mockSupabaseChain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
  });

  it("appends assistant tool_use block and user tool_result to messages after a tool call", async () => {
    mockCreate
      .mockResolvedValueOnce(toolUseResponse("tu_abc", "find summer camps"))
      .mockResolvedValueOnce(textResponse("Here are some camps near you."));

    await POST(makeRequest("Find summer camps for my kids"));

    // Route called create twice: once for initial response, once after tool use
    expect(mockCreate).toHaveBeenCalledTimes(2);

    // The route mutates the messages array in place, so the final state is visible
    // on any call's reference. After one tool round-trip the array should have:
    //   [0] user message, [1] assistant tool_use, [2] user tool_result  = 3 items
    const msgs = (mockCreate.mock.calls[1][0] as { messages: Anthropic.MessageParam[] }).messages;
    expect(msgs).toHaveLength(3);

    // The final message must be a user message containing a tool_result block
    const toolResultMsg = msgs.at(-1);
    expect(toolResultMsg?.role).toBe("user");
    expect(Array.isArray(toolResultMsg?.content)).toBe(true);
  });

  it("includes a tool_result message with the correct tool_use_id", async () => {
    mockCreate
      .mockResolvedValueOnce(toolUseResponse("tu_specific_id", "search query"))
      .mockResolvedValueOnce(textResponse("Done."));

    await POST(makeRequest("Search for something"));

    const secondCallMsgs = (mockCreate.mock.calls[1][0] as { messages: Anthropic.MessageParam[] }).messages;

    // Find the tool_result message (last user message before the final call)
    const toolResultMsg = secondCallMsgs.find(
      (m) =>
        m.role === "user" &&
        Array.isArray(m.content) &&
        (m.content as Anthropic.ToolResultBlockParam[]).some(
          (c) => c.type === "tool_result" && c.tool_use_id === "tu_specific_id"
        )
    );

    expect(toolResultMsg).toBeDefined();
  });
});

describe("Chat API — input validation and auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when message is empty", async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-001", email: "user@example.com" });

    const req = new Request("https://example.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "   " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });
});

describe("Chat API — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-001", email: "user@example.com" });
    (mockSupabaseChain["insert"] as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });
    (mockSupabaseChain["limit"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    (mockSupabaseChain["single"] as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
  });

  it("returns 500 when the Anthropic SDK throws", async () => {
    mockCreate.mockRejectedValue(new Error("Anthropic API unavailable"));

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });
});
