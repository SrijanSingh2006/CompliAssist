import { Bot, ChevronRight, Send, Sparkles, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { showToast } from '../utils/toast';
import './AIQueryAssistant.css';

const EMPTY_MESSAGES = [];

const SUGGESTED_QUESTIONS = [
  'What is my GST filing status?',
  'Show me my compliance health',
  'What loans are available for me?',
  'Are there any overdue alerts?',
  'Which government schemes match my profile?',
  'Explain EPF requirements',
  'What documents should I upload?',
  'What is TDS for my company?',
];

function FormattedMessage({ text }) {
  // Convert **bold**, bullet points (\n•), and \n to proper formatting
  const lines = text.split('\n');
  return (
    <div className="message-text">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        // bold: **text**
        const parts = line.split(/\*\*(.+?)\*\*/g);
        const formatted = parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
        );
        if (line.startsWith('•') || line.startsWith('⛔') || line.match(/^\d+\./)) {
          return (
            <div key={i} className="message-bullet">
              {formatted}
            </div>
          );
        }
        return <p key={i}>{formatted}</p>;
      })}
    </div>
  );
}

export function AIQueryAssistant() {
  const { data, askAssistant } = useApp();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const messages = data?.assistantHistory || EMPTY_MESSAGES;

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isTyping]);

  async function handleSend(questionOverride) {
    const question = (questionOverride || input).trim();
    if (!question || isSending) return;
    setInput('');
    setIsSending(true);
    setIsTyping(true);

    try {
      await askAssistant(question);
    } catch (error) {
      showToast(error.message);
    } finally {
      setIsTyping(false);
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSuggestion(q) {
    handleSend(q);
  }

  return (
    <div className="ai-container">
      <div className="ai-header">
        <div className="ai-header-content">
          <div className="icon-wrapper bg-primary-light text-primary">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Compliance Assistant</h1>
            <p className="text-sm text-secondary">
              Ask about GST, EPF, TDS, loans, schemes, documents, or any compliance topic.
            </p>
          </div>
        </div>
        <div className="ai-status-badge">
          <span className="status-dot"></span>
          Live
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="suggestions-panel">
          <p className="suggestions-label">
            <ChevronRight size={14} /> Suggested questions
          </p>
          <div className="suggestions-grid">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                className="suggestion-chip"
                onClick={() => handleSuggestion(q)}
                disabled={isSending}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-area card">
        <div className="messages-container" ref={messagesContainerRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-wrapper ${message.role === 'assistant' ? 'bot' : 'user'}`}
            >
              <div className="message-avatar">
                {message.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div className={`message-bubble ${message.role === 'assistant' ? 'bot' : 'user'}`}>
                {message.role === 'assistant' ? (
                  <FormattedMessage text={message.text} />
                ) : (
                  message.text
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="message-wrapper bot">
              <div className="message-avatar">
                <Bot size={20} />
              </div>
              <div className="message-bubble bot typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        <div className="input-area">
          {input && (
            <button className="clear-input" onClick={() => setInput('')} title="Clear">
              <X size={14} />
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about GST, loans, EPF, schemes..."
            className="chat-input"
            disabled={isSending}
          />
          <button className="btn-primary" onClick={() => handleSend()} disabled={isSending || !input.trim()}>
            <Send size={18} />
            {isSending ? 'Sending...' : 'Ask'}
          </button>
        </div>
      </div>

      {messages.length > 1 && (
        <div className="quick-suggestions-row">
          {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
            <button
              key={q}
              className="suggestion-chip small"
              onClick={() => handleSuggestion(q)}
              disabled={isSending}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
