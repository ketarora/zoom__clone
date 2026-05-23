"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useJoinMeeting } from "@/lib/hooks";
import { formatMeetingId, compactMeetingId } from "@/lib/utils";
import { Video, VideoOff, Mic, MicOff, Users, Loader2, ArrowLeft } from "lucide-react";

type Phase = "form" | "preview" | "waiting" | "admitted";

const DEFAULT_NAME = "Ketan Arora";
const POLL_MS = 2_000;

export default function JoinPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [meetingInput, setMeetingInput] = useState("");
  const [displayName, setDisplayName] = useState(DEFAULT_NAME);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [resolvedId, setResolvedId] = useState("");

  const joinMeeting = useJoinMeeting();

  // ── Camera/mic preview ──────────────────────────────────────────────────
  const startPreview = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(s);
    } catch {
      // user denied or device unavailable — continue without preview
      setCameraOn(false);
      setMicOn(false);
    }
  }, []);

  useEffect(() => {
    if (phase === "preview") startPreview();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCamera = () => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = !cameraOn));
    setCameraOn((v) => !v);
  };
  const toggleMic = () => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  };

  // ── Waiting room polling ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "waiting") return;
    const key = `zoom_admitted_${resolvedId}`;
    const poll = setInterval(() => {
      if (localStorage.getItem(key) === "true") {
        clearInterval(poll);
        setPhase("admitted");
        setTimeout(() => router.push(`/room/${resolvedId}`), 800);
      }
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [phase, resolvedId, router]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleFormNext = () => {
    const raw = compactMeetingId(meetingInput);
    if (!raw) {
      setError("Please enter a Meeting ID.");
      return;
    }
    setResolvedId(raw);
    setError("");
    setPhase("preview");
  };

  const handleJoin = async () => {
    try {
      await joinMeeting.mutateAsync({ id: resolvedId, displayName });
      // Write waiting room entry for localStorage polling
      localStorage.setItem(`zoom_waiting_${resolvedId}`, displayName);
      setPhase("waiting");
    } catch {
      setError("Meeting not found. Please check the ID and try again.");
      setPhase("form");
    }
  };

  // ── Render: form phase ──────────────────────────────────────────────────
  if (phase === "form") {
    return (
      <AppLayout hideSidebar>
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#ebebeb] shadow-sm p-8">
            <h1 className="text-2xl font-bold text-[#1a1a1a] mb-1">Join a Meeting</h1>
            <p className="text-[14px] text-[#666] mb-6">
              Enter your meeting ID below to join.
            </p>

            <label className="block text-[13px] font-medium text-[#444] mb-1.5">
              Meeting ID
            </label>
            <input
              type="text"
              placeholder="123 456 7890"
              value={meetingInput}
              onChange={(e) =>
                setMeetingInput(
                  e.target.value.replace(/[^\d\s]/g, "").slice(0, 14)
                )
              }
              onKeyDown={(e) => e.key === "Enter" && handleFormNext()}
              className="w-full px-4 py-3 text-[15px] border border-[#ddd] rounded-xl outline-none focus:border-[#0b6bde] transition-colors mb-4 font-mono"
              autoFocus
            />

            <label className="block text-[13px] font-medium text-[#444] mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 text-[15px] border border-[#ddd] rounded-xl outline-none focus:border-[#0b6bde] transition-colors mb-2"
            />

            {error && (
              <p className="text-[13px] text-[#e03e3e] mb-3">{error}</p>
            )}

            <button
              onClick={handleFormNext}
              className="w-full mt-4 py-3 bg-[#0b6bde] text-white font-semibold rounded-xl hover:bg-[#0047cc] transition-colors text-[14px]"
            >
              Next
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full mt-2 py-2.5 text-[14px] text-[#666] hover:text-[#333] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Render: preview phase ───────────────────────────────────────────────
  if (phase === "preview") {
    return (
      <AppLayout hideSidebar>
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <button
              onClick={() => setPhase("form")}
              className="flex items-center gap-1.5 text-[14px] text-[#666] hover:text-[#333] mb-5 transition-colors"
            >
              <ArrowLeft size={15} /> Back
            </button>

            <div className="flex gap-6 flex-col md:flex-row">
              {/* Camera preview */}
              <div className="flex-1 bg-[#1a1a1a] rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative">
                {stream && cameraOn ? (
                  <video
                    ref={(el) => {
                      if (el) el.srcObject = stream;
                    }}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white">
                    <VideoOff size={36} className="text-[#555]" />
                    <span className="text-[13px] text-[#777]">Camera off</span>
                  </div>
                )}
                {/* Controls overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <button
                    onClick={toggleMic}
                    className={[
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      micOn
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-[#e03e3e] text-white",
                    ].join(" ")}
                  >
                    {micOn ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                  <button
                    onClick={toggleCamera}
                    className={[
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      cameraOn
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-[#e03e3e] text-white",
                    ].join(" ")}
                  >
                    {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Right panel */}
              <div className="w-full md:w-64 flex flex-col justify-center">
                <div className="bg-white rounded-2xl border border-[#ebebeb] p-5 shadow-sm">
                  <h2 className="text-[16px] font-bold text-[#1a1a1a] mb-1">
                    Ready to join?
                  </h2>
                  <p className="text-[13px] text-[#888] mb-4">
                    Meeting ID:{" "}
                    <span className="font-mono text-[#444]">
                      {formatMeetingId(resolvedId)}
                    </span>
                  </p>
                  <p className="text-[12px] text-[#888] mb-1">Joining as</p>
                  <p className="text-[14px] font-semibold text-[#1a1a1a] mb-5">
                    {displayName}
                  </p>

                  {error && (
                    <p className="text-[12px] text-[#e03e3e] mb-3">{error}</p>
                  )}

                  <button
                    onClick={handleJoin}
                    disabled={joinMeeting.isPending}
                    className="w-full py-2.5 bg-[#0b6bde] text-white text-[14px] font-semibold rounded-xl hover:bg-[#0047cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {joinMeeting.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : null}
                    Join Meeting
                  </button>
                  <button
                    onClick={() => setPhase("form")}
                    className="w-full mt-2 py-2 text-[13px] text-[#666] hover:text-[#333] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Render: waiting room ────────────────────────────────────────────────
  if (phase === "waiting" || phase === "admitted") {
    return (
      <AppLayout hideSidebar>
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-[#eef5ff] rounded-full flex items-center justify-center mx-auto mb-4">
              {phase === "admitted" ? (
                <Video size={28} className="text-[#0b6bde]" />
              ) : (
                <Users size={28} className="text-[#0b6bde]" />
              )}
            </div>
            <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">
              {phase === "admitted"
                ? "Admitted! Joining…"
                : "Waiting for the host to admit you"}
            </h2>
            <p className="text-[14px] text-[#666] mb-2">
              Meeting:{" "}
              <span className="font-mono text-[#444]">
                {formatMeetingId(resolvedId)}
              </span>
            </p>
            <p className="text-[13px] text-[#888] mb-6">{displayName}</p>
            {phase === "waiting" && (
              <>
                <div className="flex justify-center gap-1.5 mb-6">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-[#0b6bde] rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => router.push("/")}
                  className="text-[13px] text-[#666] hover:text-[#333] transition-colors"
                >
                  Leave waiting room
                </button>
              </>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  return null;
}
