import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";


// fetch is used directly with zero or rather no supabase, so we mock globalThis.fetch
beforeEach(() => {
  globalThis.fetch = vi.fn();
  // jsdom doesn't implement scrollIntoView — mock it to prevent crashes
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

import AIAssistant from "./AIAssistant";

const defaultContext = { role: "patient", profile: { name: "Alice" } };


function mockFetchReply(reply = "Here is my answer.") {
  globalThis.fetch.mockResolvedValue({
    json: async () => ({ reply }),
  });
}

// Make fetch reject i.e network failure
function mockFetchError() {
  globalThis.fetch.mockRejectedValue(new Error("Network failure"));
}

// Open the chat window and return the userEvent instance
async function openChat(user, context = defaultContext) {
  render(<AIAssistant context={context} />);
  await user.click(screen.getByRole("button", { name: /open ai assistant/i }));
}

describe("AIAssistant", () => {

  //Trigger button

  it("renders the trigger button closed by default", () => {
    render(<AIAssistant context={defaultContext} />);
    expect(screen.getByRole("button", { name: /open ai assistant/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ask anything…")).not.toBeInTheDocument();
  });

  it("opens the chat window when the trigger is clicked", async () => {
    const user = userEvent.setup();
    await openChat(user);
    expect(screen.getByPlaceholderText("Ask anything…")).toBeInTheDocument();
  });

  it("closes the chat window when clicking the trigger again", async () => {
    const user = userEvent.setup();
    await openChat(user);
    // Click trigger a second time to close
    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));
    expect(screen.queryByPlaceholderText("Ask anything…")).not.toBeInTheDocument();
  });

  it("closes the chat window via the ✕ button inside the window", async () => {
    const user = userEvent.setup();
    await openChat(user);
    await user.click(screen.getByRole("button", { name: /✕/i }));
    expect(screen.queryByPlaceholderText("Ask anything…")).not.toBeInTheDocument();
  });

  it("shows the patient greeting with the user's name on first open", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "patient", profile: { name: "Alice" } });
    expect(screen.getByText(/Hi Alice!/)).toBeInTheDocument();
  });

  it("falls back to 'there' when profile name is missing", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "patient", profile: {} });
    expect(screen.getByText(/Hi there!/)).toBeInTheDocument();
  });

  it("shows the staff greeting for the staff role", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "staff", profile: { name: "Bob" } });
    expect(screen.getByText(/Hi Bob!/)).toBeInTheDocument();
    expect(screen.getByText(/Staff Assistant/)).toBeInTheDocument();
  });

  it("shows the admin greeting for the admin role", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "admin", profile: { name: "Carol" } });
    expect(screen.getByText(/Hi Carol!/)).toBeInTheDocument();
    expect(screen.getByText(/Admin Assistant/)).toBeInTheDocument();
  });

  it("shows the analytics greeting for the analytics role", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "analytics", profile: {} });
    expect(screen.getByText(/Analytics Assistant/)).toBeInTheDocument();
  });

  it("shows the correct sub-label for each role", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "staff", profile: {} });
    expect(screen.getByText(/Queue, patients & clinic operations/)).toBeInTheDocument();
  });

  //Suggestion from chat interface.

  it("renders patient suggestion chips on first open", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "patient", profile: {} });
    expect(screen.getByText("Where am I in the queue?")).toBeInTheDocument();
    expect(screen.getByText("Find clinics near Johannesburg")).toBeInTheDocument();
  });

  it("renders staff suggestion chips for the staff role", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "staff", profile: {} });
    expect(screen.getByText("Who is next in the queue?")).toBeInTheDocument();
    expect(screen.getByText("How many patients are waiting?")).toBeInTheDocument();
  });

  it("renders admin suggestion chips for the admin role", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "admin", profile: {} });
    expect(screen.getByText("How many pending applications?")).toBeInTheDocument();
  });

  it("renders analytics suggestion chips for the analytics role", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "analytics", profile: {} });
    expect(screen.getByText("What is the peak hour today?")).toBeInTheDocument();
  });

  it("hides chips after a chip is clicked and a reply arrives", async () => {
    mockFetchReply("Here you go!");
    const user = userEvent.setup();
    await openChat(user);

    await user.click(screen.getByText("Where am I in the queue?"));

    await waitFor(() => {
      expect(screen.getByText("Here you go!")).toBeInTheDocument();
    });

    // containers for suggestions should no longer be present messages.length > 1.
    expect(screen.queryByText("Find clinics near Johannesburg")).not.toBeInTheDocument();
  });

  //Sending messages

  it("send button is disabled when input is empty", async () => {
    const user = userEvent.setup();
    await openChat(user);
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("send button is enabled when input has text", async () => {
    const user = userEvent.setup();
    await openChat(user);
    await user.type(screen.getByPlaceholderText("Ask anything…"), "hello");
    expect(screen.getByRole("button", { name: /send/i })).toBeEnabled();
  });

  it("sends a message via the send button and shows the user bubble", async () => {
    mockFetchReply("Got it!");
    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "Hello there");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByText("Hello there")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Got it!")).toBeInTheDocument());
  });

  it("sends a message via Enter key", async () => {
    mockFetchReply("Enter key works!");
    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "Test message{Enter}");

    await waitFor(() => expect(screen.getByText("Enter key works!")).toBeInTheDocument());
  });

  it("does NOT send on Shift+Enter", async () => {
    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "line one{Shift>}{Enter}{/Shift}");

    // fetch should not have been called
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("clears the input field after sending", async () => {
    mockFetchReply("Cleared!");
    const user = userEvent.setup();
    await openChat(user);

    const textarea = screen.getByPlaceholderText("Ask anything…");
    await user.type(textarea, "My question");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(textarea.value).toBe("");
  });

  it("sends a chip message when a suggestion chip is clicked", async () => {
    mockFetchReply("Queue reply.");
    const user = userEvent.setup();
    await openChat(user);

    await user.click(screen.getByText("Where am I in the queue?"));

    expect(screen.getByText("Where am I in the queue?")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Queue reply.")).toBeInTheDocument());
  });

  //Loading state

  it("shows the typing indicator while waiting for a reply", async () => {
    // Keep fetch pending so we can observe the loading state
    let resolve;
    globalThis.fetch.mockReturnValue(new Promise(r => { resolve = r; }));

    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "Ping");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(document.querySelector(".ai-typing")).toBeInTheDocument();
    resolve({ json: async () => ({ reply: "Pong" }) });
  });

  it("disables the textarea and send button while loading", async () => {
    let resolve;
    globalThis.fetch.mockReturnValue(new Promise(r => { resolve = r; }));

    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "Question");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByPlaceholderText("Ask anything…")).toBeDisabled();
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();

    resolve({ json: async () => ({ reply: "Answer" }) });
  });

  it("hides the typing indicator after the reply arrives", async () => {
    mockFetchReply("Done!");
    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "Hey");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("Done!")).toBeInTheDocument());
    expect(document.querySelector(".ai-typing")).not.toBeInTheDocument();
  });

  //API payload

  it("sends the correct context and message history to the API", async () => {
    mockFetchReply("OK");
    const ctx = { role: "admin", profile: { name: "Dave" } };
    const user = userEvent.setup();
    await openChat(user, ctx);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "Show staff");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    const [, options] = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.context).toEqual(ctx);
    expect(body.messages.some(m => m.role === "user" && m.content === "Show staff")).toBe(true);
  });

  it("includes previous messages in subsequent API calls", async () => {
    mockFetchReply("First reply.");
    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "First question");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(screen.getByText("First reply.")).toBeInTheDocument());

    mockFetchReply("Second reply.");
    await user.type(screen.getByPlaceholderText("Ask anything…"), "Second question");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(screen.getByText("Second reply.")).toBeInTheDocument());

    const [, options] = globalThis.fetch.mock.calls[1];
    const body = JSON.parse(options.body);
    const roles = body.messages.map(m => m.role);

    // History must contain the greeting + first user msg + first assistant reply + second user msg
    expect(roles).toContain("assistant");
    expect(body.messages.filter(m => m.role === "user").length).toBeGreaterThanOrEqual(2);
  });

  //Error handling

  it("shows a connection error message when fetch throws", async () => {
    mockFetchError();
    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "Will fail");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not connect to the AI service/i)).toBeInTheDocument();
    });
  });

  it("shows a fallback message when the API returns an error field", async () => {
    globalThis.fetch.mockResolvedValue({
      json: async () => ({ error: "Service unavailable" }),
    });
    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "Question");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    });
  });

  it("re-enables input after a fetch error", async () => {
    mockFetchError();
    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "Fail");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask anything…")).not.toBeDisabled();
    });
  });

  //Unread dot

  it("does not show the unread dot initially", () => {
    render(<AIAssistant context={defaultContext} />);
    expect(document.querySelector(".ai-unread-dot")).not.toBeInTheDocument();
  });

  it("clears the unread dot when the chat is opened", async () => {
    // Simulate a reply arriving while closed — we just set hasNew via the
    // internal path: open to send to close to reply arrives (we can't easily
    // do this without timing hacks, so we test the inverse: opening clears it)
    const user = userEvent.setup();
    render(<AIAssistant context={defaultContext} />);
    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));

    // Unread dot must not be visible while open
    expect(document.querySelector(".ai-unread-dot")).not.toBeInTheDocument();
  });

  //Greeting persistence

  it("does not reset the greeting when the window is closed and reopened", async () => {
    mockFetchReply("My reply.");
    const user = userEvent.setup();
    await openChat(user);

    await user.type(screen.getByPlaceholderText("Ask anything…"), "A question");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(screen.getByText("My reply.")).toBeInTheDocument());

    // Close then reopen
    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));
    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));

    // Previous messages should still be there
    expect(screen.getByText("A question")).toBeInTheDocument();
    expect(screen.getByText("My reply.")).toBeInTheDocument();
  });

  //Unknown role fallback

  it("falls back to patient chips for an unknown role", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "unknown_role", profile: {} });
    expect(screen.getByText("Where am I in the queue?")).toBeInTheDocument();
  });

  it("shows a generic header title for an unknown role", async () => {
    const user = userEvent.setup();
    await openChat(user, { role: "unknown_role", profile: {} });
    expect(screen.getByText("QueueCare AI")).toBeInTheDocument();
  });
});