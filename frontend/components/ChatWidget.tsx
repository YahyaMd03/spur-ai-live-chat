"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./ChatWidget.module.css";
import apiClient from "@/lib/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  onClose?: () => void;
}

export default function ChatWidget({ onClose }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasLoadedRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const justSentMessageRef = useRef(false);
  const waitingForAIResponseRef = useRef(false);

  // Load session and messages from localStorage on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadConversation = async () => {
      setIsInitialLoading(true);
      const savedSessionId = localStorage.getItem("spur_chat_sessionId");
      if (savedSessionId) {
        setSessionId(savedSessionId);
        // Fetch existing conversation history
        try {
          const response = await apiClient.get(
            `/chat/history/${savedSessionId}`
          );
          const data = response.data;

          const loadedMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            sender: msg.sender as "user" | "ai",
            text: msg.text,
            timestamp: new Date(msg.createdAt),
          }));

          if (loadedMessages.length > 0) {
            setMessages(loadedMessages);
            setHasShownWelcome(true);
          } else {
            // No messages yet, show welcome message
            const welcomeMessage: Message = {
              id: "welcome",
              sender: "ai",
              text: "Hey 👋, how can we help you today?",
              timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
            setHasShownWelcome(true);
          }
        } catch (error) {
          // Error fetching history, show welcome message
          // Axios interceptor handles error formatting
          const welcomeMessage: Message = {
            id: "welcome",
            sender: "ai",
            text: "Hey 👋, how can we help you today?",
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
          setHasShownWelcome(true);
        }
      } else {
        // Show welcome message only if no existing session
        const welcomeMessage: Message = {
          id: "welcome",
          sender: "ai",
          text: "Hey 👋, how can we help you today?",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        setHasShownWelcome(true);
      }
      setIsInitialLoading(false);
    };

    loadConversation();
  }, []); // Empty dependency array - only run once on mount

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!isInitialLoading && messages.length > 0) {
      if (isInitialLoadRef.current) {
        // On initial load, scroll instantly to bottom (no animation)
        // Use requestAnimationFrame to ensure DOM has fully rendered
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          isInitialLoadRef.current = false;
          setShowScrollToBottom(false);
        });
      } else {
        const lastMessage = messages[messages.length - 1];
        const isNewAIMessage =
          lastMessage.sender === "ai" && waitingForAIResponseRef.current;

        // If user just sent a message, always scroll to bottom
        if (justSentMessageRef.current) {
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setShowScrollToBottom(false);
            justSentMessageRef.current = false;
          });
        } else if (isNewAIMessage) {
          // When a new AI message arrives (after user sent a message), always scroll to bottom
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setShowScrollToBottom(false);
            waitingForAIResponseRef.current = false;
          });
        } else {
          // For other message updates, only auto-scroll if user is near bottom
          const container = messagesContainerRef.current;
          if (container) {
            const isNearBottom =
              container.scrollHeight -
                container.scrollTop -
                container.clientHeight <
              5;
            if (isNearBottom) {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setShowScrollToBottom(false);
            } else {
              // User has scrolled up, show scroll to bottom button
              setShowScrollToBottom(true);
            }
          }
        }
      }
    }
  }, [messages, isInitialLoading]);

  // Track scroll position to show/hide scroll to bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || isInitialLoading) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Calculate distance from bottom
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Show button if user has scrolled up at all (more than 5px from bottom)
      // This ensures it appears as soon as user starts scrolling up
      const isNearBottom = distanceFromBottom <= 5;
      setShowScrollToBottom(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    // Check initial scroll position
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isInitialLoading]);

  // Scroll to bottom handler
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollToBottom(false);
  };

  // Handle quick question chip click
  const handleQuickQuestion = (question: string) => {
    if (isLoading) return;
    setInput(question);
    // Use the existing sendMessage logic by setting input and triggering send
    const trimmedInput = question.trim();
    if (!trimmedInput) return;

    justSentMessageRef.current = true;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: trimmedInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    waitingForAIResponseRef.current = true;

    apiClient
      .post("/chat/message", {
        message: trimmedInput,
        sessionId: sessionId || undefined,
      })
      .then((response) => {
        const data = response.data;

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: data.reply,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        if (data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem("spur_chat_sessionId", data.sessionId);
        }
      })
      .catch(() => {
        const errorMsg: Message = {
          id: (Date.now() + 2).toString(),
          sender: "ai",
          text: "I'm having trouble responding right now. Please try again in a moment.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        waitingForAIResponseRef.current = true; // Mark as waiting so it auto-scrolls
      })
      .finally(() => {
        setIsLoading(false);
        inputRef.current?.focus();
      });
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "48px";
      const scrollHeight = textarea.scrollHeight;
      if (scrollHeight > 48) {
        textarea.style.height = `${Math.min(scrollHeight, 120)}px`;
      }
    }
  }, [input]);

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Mark that user just sent a message - this will trigger auto-scroll
    justSentMessageRef.current = true;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: trimmedInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    waitingForAIResponseRef.current = true;

    try {
      const response = await apiClient.post("/chat/message", {
        message: trimmedInput,
        sessionId: sessionId || undefined,
      });

      const data = response.data;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Save sessionId to localStorage
      if (data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem("spur_chat_sessionId", data.sessionId);
      }
    } catch (err) {
      // Show error as an AI message in the chat (better UX than error banner)
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        sender: "ai",
        text: "I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      waitingForAIResponseRef.current = true; // Mark as waiting so it auto-scrolls
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.header}
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose?.();
          }
        }}
      >
        <div className={styles.logoContainer}>
          <svg
            className={styles.logo}
            viewBox="0 0 143 180"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M97.6942 41.4769C102.953 41.4769 107.908 41.3299 112.848 41.5225C117.276 41.6947 121.897 41.5427 126.077 42.7536C138.363 46.3154 145.208 59.2401 141.753 71.6125C137.137 88.1547 132.521 104.702 127.683 121.178C120.63 145.189 99.1027 161.087 73.6333 161.285C64.7922 161.356 55.9512 161.244 47.1101 161.366C45.8282 161.386 44.3134 161.964 43.3305 162.795C38.4311 166.919 33.6889 171.225 28.8706 175.451C19.2037 183.922 4.17133 179.322 0.903426 166.863C0.589302 165.662 0.538637 164.365 0.538637 163.109C0.523438 130.171 0.523438 97.2339 0.523438 64.3015C0.523438 53.3933 9.27838 43.2755 20.1157 41.9582C24.5235 41.4211 29.0074 41.4769 33.9017 41.2438C33.9017 38.6295 33.6585 35.8581 33.9574 33.1526C34.4032 29.1602 34.7224 25.031 36.0093 21.2767C40.7415 7.48559 54.8213 -1.12749 69.3774 0.438064C83.6346 1.97322 95.6625 13.6465 97.3953 27.853C97.8107 31.2729 97.6131 34.7688 97.6891 38.2292C97.7094 39.2223 97.6891 40.2153 97.6891 41.4769H97.6942ZM13.2353 113.634C13.2353 129.503 13.2455 145.371 13.2252 161.244C13.2252 163.418 13.6711 165.343 15.8041 166.301C17.9269 167.253 19.6445 166.351 21.2759 164.882C26.3526 160.322 31.5255 155.874 36.597 151.309C38.9834 149.161 41.6788 148.223 44.8707 148.244C54.5477 148.304 64.2248 148.309 73.9018 148.254C93.4231 148.142 109.702 136.018 115.245 117.216C119.956 101.236 124.197 85.1199 129.015 69.1705C131.478 61.0134 125.388 54.432 118.031 54.4877C87.1457 54.7056 56.2602 54.6904 25.3747 54.4877C19.1277 54.4472 13.1036 58.4092 13.1897 66.7791C13.3468 82.3941 13.2353 98.0091 13.2353 113.629V113.634ZM86.8974 41.3553C86.8974 37.9354 87.0089 34.7384 86.8772 31.5516C86.5175 22.8321 81.0051 15.3032 73.0456 12.471C64.6352 9.4818 55.8042 11.8175 49.8764 18.5103C43.9536 25.1981 44.6984 33.2286 45.0176 41.3553H86.8924H86.8974Z"
              fill="currentColor"
            ></path>
            <path
              d="M97.6635 97.9939C96.7869 114.572 84.4702 127.643 69.6405 129.148C52.3384 130.901 37.7823 119.359 34.636 103.825C34.1698 101.53 33.9621 99.144 33.957 96.7982C33.952 93.6164 36.3586 91.2199 39.2668 91.1541C42.104 91.0882 44.4194 93.2161 44.8045 96.3219C45.0325 98.156 44.9514 100.051 45.3516 101.839C47.7278 112.423 57.1617 119.344 67.8065 118.427C78.208 117.53 86.431 108.715 86.9022 97.9432C86.9326 97.2694 86.8768 96.5854 86.9528 95.9217C87.2568 93.2415 89.633 91.1439 92.3031 91.1591C94.8667 91.1743 97.1771 93.1503 97.5469 95.7291C97.6888 96.7222 97.6533 97.7456 97.6635 97.9939V97.9939Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
        <h1 className={styles.title}>Spur Support</h1>
        <div className={styles.minimizeIcon}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
      </div>

      <div ref={messagesContainerRef} className={styles.messagesContainer}>
        {isInitialLoading && (
          <div className={styles.loaderContainer}>
            <div className={styles.loader}>
              <div className={styles.loaderSpinner}></div>
              <p className={styles.loaderText}>Loading conversation...</p>
            </div>
          </div>
        )}

        {!isInitialLoading &&
          messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.sender === "user"
                  ? styles.userMessage
                  : styles.aiMessage
              }`}
            >
              {message.sender === "ai" ? (
                <div className={styles.profileIcon}>
                  <svg
                    viewBox="0 0 143 180"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M97.6942 41.4769C102.953 41.4769 107.908 41.3299 112.848 41.5225C117.276 41.6947 121.897 41.5427 126.077 42.7536C138.363 46.3154 145.208 59.2401 141.753 71.6125C137.137 88.1547 132.521 104.702 127.683 121.178C120.63 145.189 99.1027 161.087 73.6333 161.285C64.7922 161.356 55.9512 161.244 47.1101 161.366C45.8282 161.386 44.3134 161.964 43.3305 162.795C38.4311 166.919 33.6889 171.225 28.8706 175.451C19.2037 183.922 4.17133 179.322 0.903426 166.863C0.589302 165.662 0.538637 164.365 0.538637 163.109C0.523438 130.171 0.523438 97.2339 0.523438 64.3015C0.523438 53.3933 9.27838 43.2755 20.1157 41.9582C24.5235 41.4211 29.0074 41.4769 33.9017 41.2438C33.9017 38.6295 33.6585 35.8581 33.9574 33.1526C34.4032 29.1602 34.7224 25.031 36.0093 21.2767C40.7415 7.48559 54.8213 -1.12749 69.3774 0.438064C83.6346 1.97322 95.6625 13.6465 97.3953 27.853C97.8107 31.2729 97.6131 34.7688 97.6891 38.2292C97.7094 39.2223 97.6891 40.2153 97.6891 41.4769H97.6942ZM13.2353 113.634C13.2353 129.503 13.2455 145.371 13.2252 161.244C13.2252 163.418 13.6711 165.343 15.8041 166.301C17.9269 167.253 19.6445 166.351 21.2759 164.882C26.3526 160.322 31.5255 155.874 36.597 151.309C38.9834 149.161 41.6788 148.223 44.8707 148.244C54.5477 148.304 64.2248 148.309 73.9018 148.254C93.4231 148.142 109.702 136.018 115.245 117.216C119.956 101.236 124.197 85.1199 129.015 69.1705C131.478 61.0134 125.388 54.432 118.031 54.4877C87.1457 54.7056 56.2602 54.6904 25.3747 54.4877C19.1277 54.4472 13.1036 58.4092 13.1897 66.7791C13.3468 82.3941 13.2353 98.0091 13.2353 113.629V113.634ZM86.8974 41.3553C86.8974 37.9354 87.0089 34.7384 86.8772 31.5516C86.5175 22.8321 81.0051 15.3032 73.0456 12.471C64.6352 9.4818 55.8042 11.8175 49.8764 18.5103C43.9536 25.1981 44.6984 33.2286 45.0176 41.3553H86.8924H86.8974Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M97.6635 97.9939C96.7869 114.572 84.4702 127.643 69.6405 129.148C52.3384 130.901 37.7823 119.359 34.636 103.825C34.1698 101.53 33.9621 99.144 33.957 96.7982C33.952 93.6164 36.3586 91.2199 39.2668 91.1541C42.104 91.0882 44.4194 93.2161 44.8045 96.3219C45.0325 98.156 44.9514 100.051 45.3516 101.839C47.7278 112.423 57.1617 119.344 67.8065 118.427C78.208 117.53 86.431 108.715 86.9022 97.9432C86.9326 97.2694 86.8768 96.5854 86.9528 95.9217C87.2568 93.2415 89.633 91.1439 92.3031 91.1591C94.8667 91.1743 97.1771 93.1503 97.5469 95.7291C97.6888 96.7222 97.6533 97.7456 97.6635 97.9939V97.9939Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </div>
              ) : (
                <div className={styles.profileIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="11"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    <circle
                      cx="12"
                      cy="9"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    <path
                      d="M6 20C6 16 8.5 14 12 14C15.5 14 18 16 18 20"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
              <div className={styles.messageContent}>
                <div className={styles.messageText}>{message.text}</div>
                <div className={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}

        {/* Quick question chips - show only if welcome message is the last message */}
        {!isInitialLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].id === "welcome" &&
          !isLoading && (
            <div className={styles.quickQuestions}>
              <button
                className={styles.quickQuestionChip}
                onClick={() =>
                  handleQuickQuestion("What's your return policy?")
                }
              >
                What's your return policy?
              </button>
              <button
                className={styles.quickQuestionChip}
                onClick={() =>
                  handleQuickQuestion("Do you ship internationally?")
                }
              >
                Do you ship internationally?
              </button>
              <button
                className={styles.quickQuestionChip}
                onClick={() =>
                  handleQuickQuestion("How long does delivery take?")
                }
              >
                How long does delivery take?
              </button>
            </div>
          )}

        {!isInitialLoading && isLoading && (
          <div className={`${styles.message} ${styles.aiMessage}`}>
            <div className={styles.profileIcon}>
              <svg
                viewBox="0 0 143 180"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M97.6942 41.4769C102.953 41.4769 107.908 41.3299 112.848 41.5225C117.276 41.6947 121.897 41.5427 126.077 42.7536C138.363 46.3154 145.208 59.2401 141.753 71.6125C137.137 88.1547 132.521 104.702 127.683 121.178C120.63 145.189 99.1027 161.087 73.6333 161.285C64.7922 161.356 55.9512 161.244 47.1101 161.366C45.8282 161.386 44.3134 161.964 43.3305 162.795C38.4311 166.919 33.6889 171.225 28.8706 175.451C19.2037 183.922 4.17133 179.322 0.903426 166.863C0.589302 165.662 0.538637 164.365 0.538637 163.109C0.523438 130.171 0.523438 97.2339 0.523438 64.3015C0.523438 53.3933 9.27838 43.2755 20.1157 41.9582C24.5235 41.4211 29.0074 41.4769 33.9017 41.2438C33.9017 38.6295 33.6585 35.8581 33.9574 33.1526C34.4032 29.1602 34.7224 25.031 36.0093 21.2767C40.7415 7.48559 54.8213 -1.12749 69.3774 0.438064C83.6346 1.97322 95.6625 13.6465 97.3953 27.853C97.8107 31.2729 97.6131 34.7688 97.6891 38.2292C97.7094 39.2223 97.6891 40.2153 97.6891 41.4769H97.6942ZM13.2353 113.634C13.2353 129.503 13.2455 145.371 13.2252 161.244C13.2252 163.418 13.6711 165.343 15.8041 166.301C17.9269 167.253 19.6445 166.351 21.2759 164.882C26.3526 160.322 31.5255 155.874 36.597 151.309C38.9834 149.161 41.6788 148.223 44.8707 148.244C54.5477 148.304 64.2248 148.309 73.9018 148.254C93.4231 148.142 109.702 136.018 115.245 117.216C119.956 101.236 124.197 85.1199 129.015 69.1705C131.478 61.0134 125.388 54.432 118.031 54.4877C87.1457 54.7056 56.2602 54.6904 25.3747 54.4877C19.1277 54.4472 13.1036 58.4092 13.1897 66.7791C13.3468 82.3941 13.2353 98.0091 13.2353 113.629V113.634ZM86.8974 41.3553C86.8974 37.9354 87.0089 34.7384 86.8772 31.5516C86.5175 22.8321 81.0051 15.3032 73.0456 12.471C64.6352 9.4818 55.8042 11.8175 49.8764 18.5103C43.9536 25.1981 44.6984 33.2286 45.0176 41.3553H86.8924H86.8974Z"
                  fill="currentColor"
                ></path>
                <path
                  d="M97.6635 97.9939C96.7869 114.572 84.4702 127.643 69.6405 129.148C52.3384 130.901 37.7823 119.359 34.636 103.825C34.1698 101.53 33.9621 99.144 33.957 96.7982C33.952 93.6164 36.3586 91.2199 39.2668 91.1541C42.104 91.0882 44.4194 93.2161 44.8045 96.3219C45.0325 98.156 44.9514 100.051 45.3516 101.839C47.7278 112.423 57.1617 119.344 67.8065 118.427C78.208 117.53 86.431 108.715 86.9022 97.9432C86.9326 97.2694 86.8768 96.5854 86.9528 95.9217C87.2568 93.2415 89.633 91.1439 92.3031 91.1591C94.8667 91.1743 97.1771 93.1503 97.5469 95.7291C97.6888 96.7222 97.6533 97.7456 97.6635 97.9939V97.9939Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>
            <div className={styles.messageContent}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showScrollToBottom && (
        <button
          className={styles.scrollToBottomButton}
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </button>
      )}

      <div className={styles.inputContainer}>
        <textarea
          id="chat-message-input"
          name="message"
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          rows={1}
          disabled={isLoading}
          style={{
            minHeight: "48px",
            maxHeight: "120px",
            resize: "none",
          }}
        />
        <button
          className={styles.sendButton}
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
}
