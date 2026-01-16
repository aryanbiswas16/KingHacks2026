"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Mic, ArrowLeft, Circle, Clipboard } from "lucide-react";
import { ChatInterface, type Message } from "../../../components/ChatInterface";

export default function LiveTranscriptionPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = typeof params?.projectId === "string" ? params.projectId : params?.projectId?.[0];
  const [isLive, setIsLive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingName, setMeetingName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [shareError, setShareError] = useState("");
  const [sharedStream, setSharedStream] = useState<MediaStream | null>(null);
  const [autoSave, setAutoSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
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

  const deriveMeetingName = () => {
    const trimmed = meetingName.trim();
    if (trimmed) return trimmed;
    const urlValue = meetingUrl.trim();
    if (urlValue) {
      try {
        const parsed = new URL(urlValue);
        const path = parsed.pathname.replace(/\//g, " ").trim();
        if (path) return path;
      } catch {
        return urlValue;
      }
    }
    return "zoom_meeting";
  };

  const uploadTranscript = async () => {
    if (!projectId) {
      setSaveError("Project ID is not available.");
      setSaveSuccess("");
      return;
    }
    const trimmedTranscript = transcript.trim();
    if (!trimmedTranscript) {
      setSaveError("Transcript is empty. Nothing to save.");
      setSaveSuccess("");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const response = await fetch("http://localhost:8000/api/v1/transcript/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          meeting_name: deriveMeetingName(),
          meeting_datetime: new Date().toISOString(),
          transcript: trimmedTranscript,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || "Failed to save transcript.");
      }

      setSaveSuccess("Transcript saved to Backboard RAG.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async () => {
    if (isLive) {
      await stopStreaming();
      stopShare();
      if (autoSave) {
        await uploadTranscript();
      }
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
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
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

      <main className="flex-1 overflow-hidden p-4 h-[calc(100vh-72px)]">
        <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
          <div className="flex flex-col gap-4 h-full">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="relative aspect-video w-full max-w-none rounded-lg border border-slate-200 bg-slate-900/90 overflow-hidden">
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
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-emerald-600" />
                  Live Transcription
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Circle className={`w-2 h-2 ${isLive ? "text-emerald-500" : "text-slate-300"}`} />
                    {isLive ? "Live" : "Idle"}
                  </div>
                  <button
                    onClick={handleToggle}
                    disabled={isStarting || !projectId}
                    className={`px-5 py-2.5 rounded-xl text-base font-semibold text-white transition-colors shadow-sm ${
                      isLive
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {isLive ? "Stop" : isStarting ? "Starting..." : "Start"}
                  </button>
                </div>
              </div>
              {shareError && (
                <p className="text-xs text-red-600 mt-2">{shareError}</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col min-h-[200px] flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Live Transcript
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Meeting Name
                  </label>
                  <input
                    value={meetingName}
                    onChange={(e) => setMeetingName(e.target.value)}
                    placeholder="Customer discovery call"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Meeting Link (Optional)
                  </label>
                  <input
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste or stream live transcript here..."
                className="flex-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="text-xs text-slate-500">
                  {isSaving ? "Saving transcript..." : autoSave ? "Auto-save is on" : "Auto-save is off"}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoSave}
                  onClick={() => setAutoSave((prev) => !prev)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    autoSave
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {autoSave ? "Auto-save On" : "Auto-save Off"}
                </button>
              </div>
              {(saveError || saveSuccess) && (
                <p className={`text-xs mt-2 ${saveError ? "text-red-600" : "text-emerald-600"}`}>
                  {saveError || saveSuccess}
                </p>
              )}
            </div>
          </div>

          <div className="h-full">
            <ChatInterface
              projectId={projectId || ""}
              projectName={projectId || "Live Session"}
              messages={messages}
              setMessages={setMessages}
              containerClassName="h-full"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
