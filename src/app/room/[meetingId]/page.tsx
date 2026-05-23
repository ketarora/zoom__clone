"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type RefCallback,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useEndMeeting, useMeetingParticipants } from "@/lib/hooks";
import { formatMeetingId, formatElapsed } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  MessageCircle,
  Smile,
  Monitor,
  MoreHorizontal,
  ShieldCheck,
  ChevronUp,
  X,
  Send,
  Maximize2,
  LayoutGrid,
  Hand,
  Shield,
} from "lucide-react";

const HOST_NAME = "Ketan Arora";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  ts: Date;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "🎉", "👏"];

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
}

type Panel = "none" | "participants" | "chat" | "security";

/* ── Utility: attach a MediaStream to a <video> via ref callback ────────── */
function useVideoRef(stream: MediaStream | null): RefCallback<HTMLVideoElement> {
  return useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && stream) el.srcObject = stream;
    },
    [stream]
  );
}

export default function MeetingRoomPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const router = useRouter();

  /* ── State ──────────────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<"joining" | "active" | "ended">("joining");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const { data: waitingParticipants = [] } = useMeetingParticipants(
    meetingId,
    phase === "active"
  );
  const endMeeting = useEndMeeting();

  const videoRef = useVideoRef(cameraStream);
  const screenRef = useVideoRef(screenStream);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  /* ── Initialization ─────────────────────────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => setPhase("active"), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "active") return;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(setCameraStream)
      .catch(() => setCameraOn(false));
  }, [phase]);

  /* ── Cleanup streams on unmount ─────────────────────────────────────── */
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream, screenStream]);

  /* ── Elapsed timer ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  /* ── Waiting-room host admission ────────────────────────────────────── */
  useEffect(() => {
    if (phase !== "active") return;
    waitingParticipants.forEach((p) => {
      if (!p.isAdmitted) {
        localStorage.setItem(`zoom_admitted_${meetingId}`, "true");
      }
    });
  }, [waitingParticipants, meetingId, phase]);

  /* ── Auto-scroll chat ───────────────────────────────────────────────── */
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── Media controls ─────────────────────────────────────────────────── */
  const toggleMic = () => {
    cameraStream?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  };

  const toggleCamera = () => {
    cameraStream?.getVideoTracks().forEach((t) => (t.enabled = !cameraOn));
    setCameraOn((v) => !v);
  };

  const toggleScreen = async () => {
    if (screenSharing) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setScreenSharing(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(s);
      setScreenSharing(true);
      s.getVideoTracks()[0].addEventListener("ended", () => {
        setScreenStream(null);
        setScreenSharing(false);
      });
    } catch {
      // user cancelled
    }
  };

  /* ── Reactions ──────────────────────────────────────────────────────── */
  const fireReaction = (emoji: string) => {
    const id = Math.random().toString(36).slice(2);
    const x = 20 + Math.random() * 60;
    setFloatingReactions((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
    setShowReactionPicker(false);
  };

  /* ── Chat ───────────────────────────────────────────────────────────── */
  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), sender: HOST_NAME, text, ts: new Date() },
    ]);
    setChatInput("");
  };

  /* ── End meeting ────────────────────────────────────────────────────── */
  const handleEnd = async () => {
    await endMeeting.mutateAsync(meetingId);
    setShowEndDialog(false);
    setPhase("ended");
    setShowFeedback(true);
    cameraStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
  };

  /* ─────────────────────────────────────────────────────────────────────
     RENDER: Joining spinner
  ───────────────────────────────────────────────────────────────────── */
  if (phase === "joining") {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#3d3d3d] border-t-[#0b6bde] rounded-full animate-spin mb-5" />
        <p className="text-white text-[16px] font-semibold">Joining Meeting…</p>
        <p className="text-[#666] text-[13px] mt-2 font-mono">
          {formatMeetingId(meetingId)}
        </p>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
     RENDER: Feedback / ended screen
  ───────────────────────────────────────────────────────────────────── */
  if (showFeedback) {
    return (
      <div className="fixed inset-0 bg-[#f7f9fa] flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-[#ebebeb] shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-[#eef5ff] rounded-full flex items-center justify-center mx-auto mb-4">
            <Video size={26} className="text-[#0b6bde]" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-1">Meeting Ended</h2>
          <p className="text-[14px] text-[#666] mb-1">
            {formatMeetingId(meetingId)}
          </p>
          <p className="text-[13px] text-[#888] mb-6">
            Duration: {formatElapsed(elapsed)}
          </p>

          <p className="text-[14px] font-semibold text-[#1a1a1a] mb-3">
            How was your meeting?
          </p>
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setFeedbackRating(n)}
                className="text-2xl hover:scale-110 transition-transform"
              >
                {n <= feedbackRating ? "⭐" : "☆"}
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-[#0b6bde] text-white font-semibold rounded-xl hover:bg-[#0047cc] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────
     RENDER: Active meeting room
  ───────────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-[#161616] flex flex-col overflow-hidden select-none font-sans">
      {/* ── Floating reactions ──────────────────────────────────────────── */}
      {floatingReactions.map((r) => (
        <div
          key={r.id}
          className="fixed bottom-24 text-4xl pointer-events-none z-50 animate-bounce"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
        </div>
      ))}

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="h-10 px-4 flex items-center justify-between text-white bg-black/50 backdrop-blur-sm shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-bold text-[#0b6bde]">zoom</span>
          <span className="text-[13px] text-[#666]">Workplace</span>
        </div>
        <div className="flex items-center gap-4">
          <ShieldCheck size={16} className="text-[#23d85d]" />
          <span className="text-[13px] font-mono text-[#666]">
            {formatElapsed(elapsed)}
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-white/10 rounded cursor-pointer">
            <LayoutGrid size={15} />
            <span className="text-[12px]">View</span>
          </div>
          <Maximize2 size={14} className="cursor-pointer hover:text-[#0b6bde]" />
        </div>
      </div>

      {/* ── Main viewport ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative bg-[#1c1c1c] flex items-center justify-center">
          {screenSharing && screenStream ? (
            <video
              ref={screenRef}
              autoPlay
              className="max-h-full max-w-full object-contain"
            />
          ) : cameraOn && cameraStream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-white">
              <div className="w-20 h-20 rounded-full bg-[#E05B2B] flex items-center justify-center text-3xl font-bold">
                K
              </div>
              <span className="text-[14px] text-[#666] mt-2">{HOST_NAME}</span>
            </div>
          )}

          {/* Name label */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
            {micOn ? (
              <Mic size={13} className="text-white" />
            ) : (
              <MicOff size={13} className="text-[#ff3b30]" />
            )}
            <span className="text-[12px] font-medium text-white">{HOST_NAME}</span>
            {handRaised && <span className="text-sm">✋</span>}
          </div>

          {/* Meeting ID overlay */}
          <div className="absolute top-4 left-4 bg-black/40 px-3 py-1.5 rounded-lg">
            <span className="text-[11px] text-white/60 font-mono">
              {formatMeetingId(meetingId)}
            </span>
          </div>
        </div>

        {/* ── Side panel ───────────────────────────────────────────────── */}
        {panel !== "none" && (
          <div className="w-72 bg-[#1e1e1e] border-l border-white/10 flex flex-col shrink-0">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-[14px] font-semibold text-white capitalize">
                {panel === "participants"
                  ? `Participants (${waitingParticipants.length + 1})`
                  : panel === "chat"
                  ? "In-Meeting Chat"
                  : "Security"}
              </span>
              <button
                onClick={() => setPanel("none")}
                className="text-[#777] hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto">
              {panel === "participants" && (
                <div className="p-3 space-y-1">
                  {/* Host */}
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-[#E05B2B] flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                      K
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">
                        {HOST_NAME}
                        <span className="ml-1.5 text-[10px] text-[#0b6bde] bg-[#0b6bde]/20 px-1.5 py-0.5 rounded-full">
                          Host
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {micOn ? (
                        <Mic size={13} className="text-[#666]" />
                      ) : (
                        <MicOff size={13} className="text-[#ff3b30]" />
                      )}
                      {cameraOn ? (
                        <Video size={13} className="text-[#666]" />
                      ) : (
                        <VideoOff size={13} className="text-[#ff3b30]" />
                      )}
                    </div>
                  </div>

                  {/* Waiting room section */}
                  {waitingParticipants.filter((p) => !p.isAdmitted).length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-medium text-[#666] uppercase tracking-wide px-3 mb-1">
                        Waiting Room
                      </p>
                      {waitingParticipants
                        .filter((p) => !p.isAdmitted)
                        .map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#444] flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                              {p.displayName[0]?.toUpperCase()}
                            </div>
                            <p className="text-[13px] text-[#ccc] flex-1 truncate">
                              {p.displayName}
                            </p>
                            <button
                              onClick={() =>
                                localStorage.setItem(
                                  `zoom_admitted_${meetingId}`,
                                  "true"
                                )
                              }
                              className="text-[12px] text-[#0b6bde] font-medium hover:underline"
                            >
                              Admit
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {panel === "chat" && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {chatMessages.length === 0 && (
                      <p className="text-center text-[13px] text-[#555] mt-6">
                        No messages yet. Say hello!
                      </p>
                    )}
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#E05B2B] flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
                          K
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-[12px] font-semibold text-white">
                              {msg.sender}
                            </span>
                            <span className="text-[10px] text-[#555]">
                              {msg.ts.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-[13px] text-[#ccc] mt-0.5 leading-snug">
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>
                </div>
              )}

              {panel === "security" && (
                <div className="p-4 space-y-3">
                  {[
                    "Lock Meeting",
                    "Enable Waiting Room",
                    "Allow participants to share screen",
                    "Allow participants to chat",
                    "Allow participants to rename themselves",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between py-2 border-b border-white/5"
                    >
                      <span className="text-[13px] text-[#ccc]">{item}</span>
                      <div className="w-8 h-4 bg-[#0b6bde] rounded-full relative cursor-pointer">
                        <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat input */}
            {panel === "chat" && (
              <div className="p-3 border-t border-white/10">
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Type a message…"
                    className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder-[#555]"
                  />
                  <button
                    onClick={sendChat}
                    className="text-[#0b6bde] hover:text-[#5b9eff] transition-colors"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom control bar ───────────────────────────────────────────── */}
      <div className="h-[72px] bg-black text-white flex items-center justify-between px-6 border-t border-white/10 shrink-0 z-30 relative">
        {/* Left controls */}
        <div className="flex items-center gap-1">
          <ControlBtn
            icon={micOn ? <Mic size={20} /> : <MicOff size={20} className="text-[#ff3b30]" />}
            label={micOn ? "Mute" : "Unmute"}
            onClick={toggleMic}
          />
          <ControlBtn
            icon={cameraOn ? <Video size={20} /> : <VideoOff size={20} className="text-[#ff3b30]" />}
            label={cameraOn ? "Stop Video" : "Start Video"}
            onClick={toggleCamera}
          />
        </div>

        {/* Center controls */}
        <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <ControlBtn
            icon={<Shield size={20} />}
            label="Security"
            onClick={() => setPanel(panel === "security" ? "none" : "security")}
            active={panel === "security"}
          />
          <ControlBtn
            icon={<Users size={20} />}
            label="Participants"
            onClick={() => setPanel(panel === "participants" ? "none" : "participants")}
            active={panel === "participants"}
          />
          <ControlBtn
            icon={<MessageCircle size={20} />}
            label="Chat"
            onClick={() => setPanel(panel === "chat" ? "none" : "chat")}
            active={panel === "chat"}
          />
          <div className="relative">
            <ControlBtn
              icon={<Smile size={20} />}
              label="Reactions"
              onClick={() => setShowReactionPicker((v) => !v)}
              active={showReactionPicker}
            />
            {showReactionPicker && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#2d2d2d] border border-white/10 rounded-2xl p-3 flex gap-2 shadow-2xl z-50">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => fireReaction(emoji)}
                    className="text-2xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ControlBtn
            icon={<Monitor size={20} className={screenSharing ? "text-[#23d85d]" : ""} />}
            label={screenSharing ? "Stop Share" : "Share Screen"}
            onClick={toggleScreen}
            active={screenSharing}
          />
          <ControlBtn
            icon={<Hand size={20} className={handRaised ? "text-[#fe7521]" : ""} />}
            label={handRaised ? "Lower Hand" : "Raise Hand"}
            onClick={() => setHandRaised((v) => !v)}
            active={handRaised}
          />
          <ControlBtn
            icon={<MoreHorizontal size={20} />}
            label="More"
            onClick={() => {}}
          />
        </div>

        {/* Right: end call */}
        <button
          onClick={() => setShowEndDialog(true)}
          className="flex items-center gap-2 px-5 py-2 bg-[#e03e3e] hover:bg-[#c0392b] rounded-xl transition-colors font-semibold text-[14px]"
        >
          <PhoneOff size={18} />
          End
        </button>
      </div>

      {/* ── End meeting dialog ───────────────────────────────────────────── */}
      {showEndDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-end p-8">
          <div className="bg-[#2d2d2d] rounded-2xl border border-white/10 shadow-2xl p-6 w-80">
            <h3 className="text-[16px] font-bold text-white mb-1">
              End Meeting?
            </h3>
            <p className="text-[13px] text-[#888] mb-5">
              You can leave the meeting or end it for everyone.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleEnd}
                className="w-full py-3 bg-[#e03e3e] hover:bg-[#c0392b] text-white font-semibold rounded-xl transition-colors text-[14px]"
              >
                End Meeting for All
              </button>
              <button
                onClick={() => {
                  setShowEndDialog(false);
                  setPhase("ended");
                  setShowFeedback(true);
                }}
                className="w-full py-3 border border-white/20 text-white font-medium rounded-xl hover:bg-white/10 transition-colors text-[14px]"
              >
                Leave Meeting
              </button>
              <button
                onClick={() => setShowEndDialog(false)}
                className="w-full py-2 text-[#888] hover:text-white transition-colors text-[13px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-component: ControlBtn ──────────────────────────────────────────── */
function ControlBtn({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors group",
        active ? "bg-white/15" : "hover:bg-white/10",
      ].join(" ")}
    >
      <span className="relative">
        {icon}
        <ChevronUp
          size={9}
          className="absolute -right-2 top-1 text-white/40 group-hover:text-white/70"
        />
      </span>
      <span className="text-[10px] font-medium text-white/70 group-hover:text-white whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}
