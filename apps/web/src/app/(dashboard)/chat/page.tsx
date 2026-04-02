"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, UtensilsCrossed, Wallet, Heart, Baby, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const quickReplies = [
  { label: "Plan my meals", icon: UtensilsCrossed, color: "bg-amber/15 text-amber border-amber/20" },
  { label: "Budget check", icon: Wallet, color: "bg-blue/15 text-blue border-blue/20" },
  { label: "Date night ideas", icon: Heart, color: "bg-rose/15 text-rose border-rose/20" },
  { label: "What should the kids eat today?", icon: Baby, color: "bg-purple/15 text-purple border-purple/20" },
];

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 mb-4"
    >
      <div className="w-8 h-8 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
        <Sparkles size={14} className="text-primary shimmer" />
      </div>
      <div className="glass-strong rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                className="w-2 h-2 rounded-full bg-primary/50"
              />
            ))}
          </div>
          <span className="text-warm-white/25 text-[11px] ml-1">Kin is thinking...</span>
        </div>
      </div>
    </motion.div>
  );
}

function MessageBubble({
  message,
  onSpeak,
  isSpeaking,
}: {
  message: Message;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex items-start gap-3 mb-4 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles size={14} className="text-primary" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 group relative ${
          isUser
            ? "bg-primary text-background rounded-tr-md"
            : "glass-strong text-warm-white rounded-tl-md"
        }`}
      >
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "" : "text-warm-white/90"}`}>
          {message.content}
        </p>
        {/* Read aloud button for Kin's messages */}
        {!isUser && (
          <button
            onClick={() => onSpeak(message.content)}
            className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              isSpeaking
                ? "bg-primary text-background scale-110"
                : "bg-surface-raised border border-warm-white/10 text-warm-white/30 opacity-0 group-hover:opacity-100 hover:text-primary hover:border-primary/30"
            }`}
            title={isSpeaking ? "Stop reading" : "Read aloud"}
          >
            {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Hook for speech recognition
function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let final = "";
        let interim = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(final || interim);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return { isListening, transcript, isSupported, startListening, stopListening };
}

// Hook for speech synthesis
function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, id?: string) => {
    // Stop if already speaking
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (speakingId === id) {
        setIsSpeaking(false);
        setSpeakingId(null);
        return;
      }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to pick a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Google") || v.name.includes("Natural")
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingId(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingId(null);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setSpeakingId(id || null);
  }, [speakingId]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingId(null);
  }, []);

  return { isSpeaking, speakingId, speak, stop };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isListening, transcript, isSupported: micSupported, startListening, stopListening } = useSpeechRecognition();
  const { isSpeaking, speakingId, speak, stop: stopSpeaking } = useSpeechSynthesis();

  // Sync transcript to input
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Auto-send when voice recognition ends with content
  useEffect(() => {
    if (!isListening && transcript.trim()) {
      // Small delay to let the final transcript settle
      const timer = setTimeout(() => {
        sendMessage(transcript.trim());
        setInput("");
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  // Load conversation history
  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();
      const { data } = await supabase
        .from("conversations")
        .select("id, role, content, created_at")
        .order("created_at", { ascending: true })
        .limit(100);

      if (data && data.length > 0) {
        setMessages(data as Message[]);
      }
      setInitialLoading(false);
    }
    loadHistory();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const { response: assistantText } = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantText,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Something went wrong — give me another try in a moment.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleSpeak(text: string, msgId?: string) {
    if (isSpeaking && speakingId === msgId) {
      stopSpeaking();
    } else {
      speak(text, msgId);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Sparkles size={14} className="text-primary shimmer" />
          </div>
          <h1 className="font-serif italic text-2xl text-primary">Kin</h1>
        </div>
        <p className="text-warm-white/40 text-sm ml-10">
          Your family AI — always watching the full picture
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-1 -mx-1">
        {initialLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        ) : !hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
              <Sparkles size={28} className="text-primary shimmer" />
            </div>
            <h2 className="font-serif italic text-xl text-warm-white mb-2">
              Hey, I&apos;m Kin
            </h2>
            <p className="text-warm-white/40 text-sm max-w-xs mb-2">
              Your family&apos;s AI chief of staff. Ask me about meals, budget, scheduling — or just say hi.
            </p>
            {micSupported && (
              <p className="text-warm-white/25 text-xs mb-8">
                Tap the mic to talk to me
              </p>
            )}

            {/* Quick replies for empty state */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {quickReplies.map(({ label, icon: Icon, color }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(label)}
                  className={`flex items-center gap-2 px-3 py-3 rounded-2xl text-xs font-medium border transition-all hover:scale-[1.03] active:scale-95 ${color}`}
                >
                  <Icon size={14} />
                  <span className="text-left">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSpeak={(text) => handleSpeak(text, msg.id)}
                isSpeaking={isSpeaking && speakingId === msg.id}
              />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick replies when there are messages */}
      {hasMessages && !loading && (
        <div className="flex gap-2 overflow-x-auto py-2 px-1 -mx-1 scrollbar-none">
          {quickReplies.map(({ label, icon: Icon, color }) => (
            <button
              key={label}
              onClick={() => sendMessage(label)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-medium border whitespace-nowrap transition-all hover:scale-105 active:scale-95 shrink-0 ${color}`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Voice listening indicator */}
      {isListening && (
        <div className="flex items-center gap-3 py-2 px-3 bg-rose/10 rounded-2xl mb-2 border border-rose/20">
          <div className="relative">
            <Mic size={16} className="text-rose" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose animate-pulse" />
          </div>
          <span className="text-rose/80 text-sm flex-1">
            {transcript || "Listening..."}
          </span>
          <button
            onClick={stopListening}
            className="text-rose/60 text-xs hover:text-rose"
          >
            Done
          </button>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        {micSupported && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={loading}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all disabled:opacity-30 ${
              isListening
                ? "bg-rose text-white shadow-lg shadow-rose/25 scale-110 animate-pulse"
                : "bg-surface-raised text-warm-white/40 hover:text-warm-white/70 hover:scale-105 active:scale-95"
            }`}
            title={isListening ? "Stop listening" : "Voice input"}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "Listening..." : "Ask Kin anything..."}
          disabled={loading || isListening}
          className="flex-1 bg-surface-raised rounded-2xl px-4 py-3.5 text-sm text-warm-white placeholder:text-warm-white/25 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-background disabled:opacity-30 hover:shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95 transition-all"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
