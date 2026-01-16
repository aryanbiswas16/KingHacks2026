"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mic, ArrowLeft, Circle, Clipboard } from "lucide-react";

export default function LiveTranscriptionPage({ params }: { params: { projectId: string } }) {
  const [isLive, setIsLive] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [transcript, setTranscript] = useState("");

  const handleToggle = () => {
    setIsLive((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clipboard className="w-4 h-4" />
          Project ID: {params.projectId}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Mic className="w-5 h-5 text-emerald-600" />
                Live Transcription
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Use this page to capture a Google Meet transcription and provide live context to the agent.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Circle className={`w-2 h-2 ${isLive ? "text-emerald-500" : "text-slate-300"}`} />
                {isLive ? "Live" : "Idle"}
              </div>
              <button
                onClick={handleToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  isLive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isLive ? "Stop" : "Start"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Google Meet Link
                </label>
                <input
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-600">
                  This page is ready for a transcription feed. Connect your capture source and paste live transcript below.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Live Transcript
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste or stream live transcript here..."
                rows={12}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <div className="flex justify-end mt-3">
                <button
                  className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Send Transcript to Agent
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
