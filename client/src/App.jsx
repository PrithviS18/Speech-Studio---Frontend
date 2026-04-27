import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "https://speech-studio-backend.onrender.com";

export default function App() {
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const liveRef = useRef(null);
  const finalRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [finalText, setFinalText] = useState("");

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on("connect", () => console.log("Connected:", socket.id));
    // socket.on("transcription_ready", () => startMicStreaming());
    socket.on("transcript", (data) => setLiveText(data.transcript));
    socket.on("transcript_final", (data) => {
      setFinalText((prev) => prev + " " + data.transcript);
      setLiveText("");
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    liveRef.current?.scrollTo(0, liveRef.current.scrollHeight);
  }, [liveText]);

  useEffect(() => {
    finalRef.current?.scrollTo(0, finalRef.current.scrollHeight);
  }, [finalText]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          socketRef.current.emit("audio_chunk", event.data);
        }
      };

      mediaRecorder.start(250);

      socketRef.current.emit("start_transcription");
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert("Mic permission denied or not supported");
    }
  };

  const stopRecording = () => {
    socketRef.current.emit("stop_transcription");

    mediaRecorderRef.current?.stop();

    // stop mic completely (important)
    const tracks = mediaRecorderRef.current?.stream?.getTracks();
    tracks?.forEach((track) => track.stop());

    setIsRecording(false);
  };

  // const startMicStreaming = async () => {
  //   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  //   const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  //   mediaRecorderRef.current = mediaRecorder;
  //   mediaRecorder.ondataavailable = (event) => {
  //     if (event.data.size > 0) socketRef.current.emit("audio_chunk", event.data);
  //   };
  //   mediaRecorder.start(250);
  // };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }}>

      {/* Ambient glow blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)", transform: "translate(-30%, -30%)" }} />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", transform: "translate(30%, 30%)" }} />

      <div className="relative w-full max-w-4xl rounded-3xl p-6 md:p-10"
        style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

        {/* ── HEADER ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-2xl rounded-2xl"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)", boxShadow: "0 8px 24px rgba(139,92,246,0.4)" }}>
              🎤
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Speech Studio</h1>
              <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                Real-time transcription
              </p>
            </div>
          </div>

          {/* Recording badge */}
          {isRecording && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <div className="relative w-3 h-3">
                <div className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: "rgba(239,68,68,0.5)" }} />
                <div className="absolute inset-[3px] rounded-full bg-red-500" />
              </div>
              <span className="text-xs font-bold tracking-widest animate-pulse text-red-300">
                RECORDING
              </span>
            </div>
          )}
        </div>

        {/* ── WAVEFORM (visible while recording) ──────────── */}
        {isRecording && (
          <div className="flex justify-center items-end gap-1 h-10 mb-6">
            {[
              { delay: "0s", color: "from-violet-600 to-purple-400" },
              { delay: "0.15s", color: "from-purple-600 to-violet-400" },
              { delay: "0.3s", color: "from-indigo-600 to-blue-400" },
              { delay: "0.45s", color: "from-pink-600 to-rose-400" },
              { delay: "0.6s", color: "from-violet-600 to-purple-400" },
            ].map((bar, i) => (
              <div key={i} className={`w-1.5 rounded-full bg-gradient-to-t ${bar.color}`}
                style={{ animationName: "waveBar", animationDuration: "1s", animationDelay: bar.delay, animationIterationCount: "infinite", animationTimingFunction: "ease-in-out", minHeight: "8px" }} />
            ))}
          </div>
        )}

        {/* ── BUTTONS ─────────────────────────────────────── */}
        <div className="flex gap-4 mb-10">
          <button
            onClick={startRecording}
            disabled={isRecording}
            className="flex-1 py-4 rounded-2xl font-bold text-sm tracking-wider transition-all duration-300"
            style={isRecording
              ? { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.1)" }
              : { background: "linear-gradient(135deg, #059669, #10b981, #34d399)", color: "#fff", boxShadow: "0 8px 20px rgba(5,150,105,0.35)", cursor: "pointer" }
            }
          >
            ▶ &nbsp;Start Recording
          </button>

          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className="flex-1 py-4 rounded-2xl font-bold text-sm tracking-wider transition-all duration-300"
            style={!isRecording
              ? { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.1)" }
              : { background: "linear-gradient(135deg, #dc2626, #ef4444, #f87171)", color: "#fff", boxShadow: "0 8px 20px rgba(220,38,38,0.35)", cursor: "pointer" }
            }
          >
            ⏹ &nbsp;Stop Recording
          </button>
        </div>

        {/* ── TRANSCRIPT PANELS ───────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-5">

          {/* Live */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.1), transparent)" }} />
            <div ref={liveRef}
              className="relative h-56 overflow-y-auto p-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(234,179,8,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400"
                  style={{ boxShadow: "0 0 8px rgba(250,204,21,0.7)" }} />
                <span className="text-xs font-bold tracking-widest text-yellow-300 uppercase">
                  Live Transcript
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
                {liveText || (
                  <span style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                    Listening for audio...
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Final */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.1), transparent)" }} />
            <div ref={finalRef}
              className="relative h-56 overflow-y-auto p-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400"
                  style={{ boxShadow: "0 0 8px rgba(52,211,153,0.7)" }} />
                <span className="text-xs font-bold tracking-widest text-emerald-300 uppercase">
                  Final Transcript
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "rgba(255,255,255,0.8)" }}>
                {finalText || (
                  <span style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                    Final transcript will appear here...
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────── */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }} />
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.5px" }}>
            Built with Socket.IO &nbsp;·&nbsp; Deepgram @Prithvi
          </p>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }} />
        </div>
      </div>

      {/* Waveform keyframes */}
      <style>{`
        @keyframes waveBar {
          0%, 100% { height: 8px; }
          50% { height: 32px; }
        }
      `}</style>
    </div>
  );
}
