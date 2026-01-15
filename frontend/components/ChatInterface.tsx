import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, ThumbsUp, ThumbsDown, FileText } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  feedback?: 'up' | 'down';
}

export type { Message };

interface ChatInterfaceProps {
  projectId: string;
  projectName: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function ChatInterface({ projectId, projectName, messages, setMessages }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/chat?project_id=${projectId}&message=${encodeURIComponent(userMsg)}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.response) {
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: data.response, 
            citations: data.citations 
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that request." }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Network error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (index: number, type: 'up' | 'down') => {
    const msg = messages[index];
    if (!msg || msg.role !== 'assistant') return;

    // Optimistic update
    const newMessages = [...messages];
    newMessages[index] = { ...newMessages[index], feedback: type };
    setMessages(newMessages);

    try {
      await fetch(`http://localhost:8000/api/v1/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_content: msg.content,
          rating: type,
          project_id: projectId
        }),
      });
    } catch (error) {
      console.error("Feedback failed", error);
    }
  };

  return (
    <div className="flex flex-col h-[700px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Beacon Sales AI</h3>
            <p className="text-xs text-slate-500">Context: {projectName}</p>
          </div>
        </div>
        <div className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          RAG Enabled
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Bot className="w-12 h-12 opacity-20" />
            <p className="text-sm">Ask me about strategy, competitors, or drafted documents.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`
              max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
              ${msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}
            `}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1 opacity-50 text-xs font-semibold uppercase tracking-wider">
                  <Bot className="w-3 h-3" /> Assistant
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sources Referenced</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map((cite, i) => (
                      <button 
                        key={i} 
                        onClick={() => alert(`Opening document preview for: ${cite}`)}
                        className="flex items-center gap-1.5 text-xs bg-slate-50 text-blue-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all"
                      >
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{cite}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {msg.role === 'assistant' && (
                <div className="mt-3 flex justify-end gap-1">
                   <button 
                    onClick={() => handleFeedback(idx, 'up')}
                    className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${msg.feedback === 'up' ? 'text-green-600' : 'text-slate-400'}`}
                    title="Helpful"
                   >
                     <ThumbsUp className="w-3.5 h-3.5" />
                   </button>
                   <button 
                    onClick={() => handleFeedback(idx, 'down')}
                    className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${msg.feedback === 'down' ? 'text-red-600' : 'text-slate-400'}`}
                    title="Not Helpful"
                   >
                     <ThumbsDown className="w-3.5 h-3.5" />
                   </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
               <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-xs text-slate-500">Thinking...</span>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSendMessage} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about deal strategy..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-800 placeholder:text-slate-400"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
