"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Mic, ArrowLeft, Circle, Clipboard } from "lucide-react";

export default function LiveTranscriptionPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = typeof params?.projectId === "string" ? params.projectId : params?.projectId?.[0];
  const [isLive, setIsLive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [shareError, setShareError] = useState("");
  const [sharedStream, setSharedStream] = useState<MediaStream | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopShare = (options?: { skipStateUpdate?: boolean }) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setSharedStream(null);
    if (!options?.skipStateUpdate) {
      setIsLive(false);
    }
  };

  const stopStreaming = async () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setIsLive(false);
    if (!projectId) return;
    try {
      await fetch("http://localhost:8000/api/v1/transcript/stop", { method: "POST" });
    } catch (err) {
      // Ignore stop errors
    }
  };

  const startShare = async () => {
    if (isStarting) return false;
    setIsStarting(true);
    setShareError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      if (!stream.getVideoTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("No video track detected. Please share the Meet tab.");
      }
      streamRef.current = stream;
      setSharedStream(stream);
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopShare();
          stopStreaming();
        };
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start screen share.";
      setShareError(message);
      stopShare({ skipStateUpdate: true });
      return false;
    } finally {
      setIsStarting(false);
    }
  };

  const handleToggle = async () => {
    if (isLive) {
      await stopStreaming();
      stopShare();
      return;
    }

    if (!projectId) {
      setShareError("Project ID is not ready yet. Please refresh the page.");
      return;
    }

    try {
      const shareOk = await startShare();
      if (!shareOk) return;

      await fetch("http://localhost:8000/api/v1/transcript/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, meeting_url: meetingUrl })
      });

      const source = new EventSource(`http://localhost:8000/api/v1/transcript/stream?project_id=${projectId}`);
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const line = `[${payload.timestamp}] ${payload.speaker}: ${payload.text}`;
          setTranscript((prev) => (prev ? `${prev}\n${line}` : line));
        } catch (err) {
          // Ignore bad chunks
        }
      };
      source.onerror = () => {
        source.close();
        eventSourceRef.current = null;
        setIsLive(false);
      };

      eventSourceRef.current = source;
      setIsLive(true);
    } catch (err) {
      setIsLive(false);
    }
  };

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      stopShare({ skipStateUpdate: true });
    };
  }, []);

  useEffect(() => {
    if (!sharedStream || !videoRef.current) return;
    videoRef.current.srcObject = sharedStream;
    videoRef.current.play().catch(() => {});
  }, [sharedStream]);

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
          Project ID: {projectId}
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
                disabled={isStarting || !projectId}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  isLive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isLive ? "Stop" : isStarting ? "Starting..." : "Start"}
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
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shared Video</p>
                  <span className={`text-xs font-medium ${isLive ? "text-emerald-600" : "text-slate-400"}`}>
                    {isLive ? "Streaming" : "Not shared"}
                  </span>
                </div>
                <div className="relative aspect-video rounded-lg border border-slate-200 bg-slate-900/90 overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    muted
                    playsInline
                    autoPlay
                  />
                  {!isLive && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-300 px-4 text-center">
                      Click Start and select the Google Meet tab to share video here.
                    </div>
                  )}
                </div>
                {shareError && (
                  <p className="text-xs text-red-600 mt-2">{shareError}</p>
                )}
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
