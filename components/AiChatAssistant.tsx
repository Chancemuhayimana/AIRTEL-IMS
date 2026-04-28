import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Bot, MessageSquare, Send, X } from "lucide-react";
import { fetchJson, getApiMessage } from "../api";
import { API_BASE_URL } from "../config";
import type { LoggedInUser } from "../types";

type ChatRecord = {
  title: string;
  subtitle: string;
  meta?: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string[];
  records?: ChatRecord[];
};

type ChatResponse = {
  answer?: string[];
  records?: ChatRecord[];
  suggestions?: string[];
  message?: string;
};

type AiChatAssistantProps = {
  user: LoggedInUser;
};

function getStarterPrompts(role: string) {
  if (role === "employee") {
    return [
      "What is the status of my request?",
      "Which devices are assigned to me?",
      "How do I return a device?",
    ];
  }

  if (role === "IT Support engineer" || role === "IT officer" || role === "IT security manager") {
    return [
      "How many devices are available in my branch?",
      "Show assets under maintenance",
      "What requests are waiting for fulfillment?",
    ];
  }

  if (role === "IT Director" || role === "IT infrastructure manager") {
    return [
      "What requests are waiting for IT approval?",
      "Summarize open issues",
      "Show maintenance workload",
    ];
  }

  if (role === "HR DIRECTOR" || role === "HR Recruitment officer" || role === "Hr department") {
    return [
      "What requests are waiting for HR approval?",
      "How does the request workflow work?",
      "Summarize pending requests",
    ];
  }

  return [
    "Summarize inventory status",
    "Show pending requests",
    "Find asset TAG-102",
  ];
}

function AiChatAssistant({ user }: AiChatAssistantProps) {
  const starterPrompts = useMemo(() => getStarterPrompts(user.role), [user.role]);
  const [isOpen, setIsOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: [
        `Hello ${user.firstName}. I am your read-only Airtel IMS assistant.`,
        "I can answer questions about requests, approvals, assignments, inventory, returns, maintenance, issues, and workflow steps without changing any data.",
      ],
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>(starterPrompts);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();

    if (!trimmed || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: [trimmed],
    };

    setChatMessages((current) => [...current, userMessage]);
    setMessage("");
    setIsSending(true);

    try {
      const { response, data } = await fetchJson<ChatResponse>(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          message: trimmed,
        }),
      });

      if (!response.ok) {
        throw new Error(getApiMessage(data, "The Airtel IMS assistant could not answer right now."));
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: data?.answer?.length ? data.answer : ["I could not generate a useful answer for that just yet."],
        records: data?.records ?? [],
      };

      setChatMessages((current) => [...current, assistantMessage]);
      setSuggestions(data?.suggestions?.length ? data.suggestions : starterPrompts);
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text: [error instanceof Error ? error.message : "The Airtel IMS assistant is unavailable right now."],
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(message);
  };

  return (
    <div className="ai-chat-shell">
      {isOpen ? (
        <section className="ai-chat-panel" aria-label="Airtel IMS assistant">
          <header className="ai-chat-header">
            <div className="ai-chat-title-group">
              <span className="ai-chat-badge">
                <Bot size={15} strokeWidth={2.2} />
                Read-only
              </span>
              <strong>Airtel IMS Assistant</strong>
            </div>
            <button className="ai-chat-close" type="button" onClick={() => setIsOpen(false)} aria-label="Close assistant">
              <X size={16} strokeWidth={2.4} />
            </button>
          </header>

          <div className="ai-chat-messages">
            {chatMessages.map((item) => (
              <article key={item.id} className={`ai-chat-message ai-chat-message-${item.role}`}>
                <div className="ai-chat-bubble">
                  {item.text.map((line, index) => (
                    <p key={`${item.id}-${index}`}>{line}</p>
                  ))}
                </div>
                {item.records?.length ? (
                  <div className="ai-chat-records">
                    {item.records.map((record, index) => (
                      <article className="ai-chat-record-card" key={`${item.id}-record-${index}`}>
                        <strong>{record.title}</strong>
                        <span>{record.subtitle}</span>
                        {record.meta ? <small>{record.meta}</small> : null}
                      </article>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {isSending ? <p className="ai-chat-thinking">Thinking through Airtel IMS data...</p> : null}
          </div>

          <div className="ai-chat-suggestions">
            {suggestions.map((suggestion) => (
              <button key={suggestion} className="ai-chat-suggestion" type="button" onClick={() => void sendMessage(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>

          <form className="ai-chat-form" onSubmit={handleSubmit}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about requests, stock, maintenance, issues, or workflow..."
            />
            <button className="primary-btn compact-btn ai-chat-send" type="submit" disabled={isSending}>
              <Send size={15} strokeWidth={2.2} />
              <span>{isSending ? "Sending..." : "Ask"}</span>
            </button>
          </form>
        </section>
      ) : null}

      <button className="ai-chat-trigger" type="button" onClick={() => setIsOpen(true)} aria-label="Open Airtel IMS assistant">
        <MessageSquare size={18} strokeWidth={2.3} />
        <span>IMS Assistant</span>
      </button>
    </div>
  );
}

export default AiChatAssistant;
