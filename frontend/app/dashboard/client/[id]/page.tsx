"use client";

import { useState, useRef, useEffect, use } from "react";

// Types
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ClientAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap params using React.use() (Next.js 15+ pattern)
  const { id } = use(params);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Sales & Consulting Assistant. Detailed context for this client has been loaded. How can I help you today?' }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Document State
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<{name: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents on load
  useEffect(() => {
    fetch(`http://localhost:8000/documents?project_id=${id}`)
      .then(res => res.json())
      .then(data => setDocuments(data.documents))
      .catch(err => console.error("Failed to fetch documents", err));
  }, [id]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handler: Send Message
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      // Call our local Python backend
      const res = await fetch(`http://localhost:8000/chat?message=${encodeURIComponent(userMsg)}&project_id=${id}`, {
        method: "POST"
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to backend. Ensure server.py is running." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Upload File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("project_id", id);
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append("files", e.target.files[i]);
    }

    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      console.log("Upload result:", data);
      
      // Update document list from response results
      if (data.results && Array.isArray(data.results)) {
        setDocuments(prev => {
          // Avoid UI duplicates
          const existingNames = new Set(prev.map(d => d.name));
          const newDocs = data.results.filter((d: any) => !existingNames.has(d.name));
          return [...prev, ...newDocs];
        });
      }
      
      alert("Documents uploaded and indexed successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload documents.");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      {/* Left: AI Agent (Chat Implementation) */}
      <div className="flex-1 p-6 border-r border-gray-800 flex flex-col h-screen">
        <h2 className="text-xl font-semibold mb-4">
          AI Agent – {id}
        </h2>

        {/* Chat Area */}
        <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto border border-gray-700">
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-200'
                }`}>
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 rounded-lg px-4 py-2 text-gray-400 text-sm italic">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <input 
            type="text"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
            placeholder="Ask about pricing, security, or draft email..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-medium transition disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      {/* Middle: Controls */}
      <div className="w-64 p-6 border-r border-gray-800 bg-gray-900 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-6">
          Agent Controls
        </h3>

        <div className="space-y-4">
          <div className="p-4 bg-green-900/20 border border-green-900/50 rounded">
            <h4 className="text-green-400 text-sm font-bold mb-1">Status: Active</h4>
            <p className="text-xs text-green-300/70">Connected to Backboard</p>
          </div>

          <div className="pt-6 border-t border-gray-800">
            <h4 className="text-sm font-semibold uppercase tracking-wide mb-3 text-gray-300">
              Quick Actions
            </h4>

            <div className="space-y-2">
              <button onClick={() => setInput("Draft a follow-up email about pricing")} className="w-full py-2 text-sm rounded bg-gray-800 hover:bg-gray-700 text-left px-3 transition">
                📝 Draft Email
              </button>
              <button onClick={() => setInput("What are the key security concerns?")} className="w-full py-2 text-sm rounded bg-gray-800 hover:bg-gray-700 text-left px-3 transition">
                🛡️ Security Check
              </button>
              <button onClick={() => setInput("Identify the key decision makers")} className="w-full py-2 text-sm rounded bg-gray-800 hover:bg-gray-700 text-left px-3 transition">
                👥 Stakeholders
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Documents */}
      <aside className="w-72 p-6 bg-gray-900 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Context
          </h3>
          <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">RAG Active</span>
        </div>

        <div className="mb-6">
            <input 
                type="file" 
                multiple 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileUpload}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 flex items-center justify-center gap-2"
            >
                {uploading ? "Uploading..." : "+ Upload Documents"}
            </button>
        </div>

        <h4 className="text-sm uppercase text-gray-500 font-bold mb-3 text-xs tracking-wider">Indexed Files</h4>
        <ul className="space-y-2">
          {documents.length === 0 ? (
            <li className="text-gray-500 text-sm italic">No documents uploaded yet.</li>
          ) : (
            documents.map((doc, i) => <DocumentRow key={i} name={doc.name} />)
          )}
        </ul>
      </aside>
    </div>
  );
}

/* Document row */
function DocumentRow({ name }: { name: string }) {
  return (
    <li className="px-3 py-2 rounded bg-gray-800/50 hover:bg-gray-800 cursor-pointer text-sm border border-gray-700/50 flex items-center gap-2">
      <span className="text-gray-400">📄</span>
      <span className="truncate">{name}</span>
    </li>
  );
}