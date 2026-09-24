"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { checkInTicketAction } from "@/app/actions/admin";
import Link from "next/link";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  Camera,
  CameraOff,
  SwitchCamera,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsQR from "jsqr";

export default function GateCheckInPage() {
  const [ticketInput, setTicketInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Live Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLockRef = useRef<boolean>(false);

  const allTickets = useQuery(api.tickets.listForAdmin, {});

  // Web Audio Chimes
  const playSound = useCallback((success: boolean) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        // High-pitch dual chime for success
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // Low pitch warning buzz for duplicate / invalid
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio autoplay might be restricted before user interaction
    }
  }, [soundEnabled]);

  // Core Verification Handler
  const verifyTicket = async (ticketData: string, rawToken?: string) => {
    if (!ticketData.trim() || isChecking) return;

    try {
      setIsChecking(true);
      let ticketNum = ticketData.trim();
      let tok = rawToken?.trim() || undefined;

      // Handle raw JSON QR payloads if scanned from camera or 2D barcode scanner
      if (ticketNum.startsWith("{") && ticketNum.endsWith("}")) {
        try {
          const parsed = JSON.parse(ticketNum);
          ticketNum = parsed.tid || ticketNum;
          tok = parsed.tok || tok;
        } catch {
          // Keep raw string
        }
      }

      const res = await checkInTicketAction({
        ticketNumber: ticketNum,
        token: tok,
        checkedInBy: "Gate Staff Scanner",
      });

      setLastResult(res);

      if (res.ok) {
        playSound(true);
        if (navigator.vibrate) navigator.vibrate(120);
        toast.success(res.message);
        setTicketInput("");
        setTokenInput("");
      } else {
        playSound(false);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        if (res.alreadyUsed) {
          toast.error("DUPLICATE ENTRY DETECTED: Ticket already scanned!");
        } else {
          toast.error(res.message);
        }
      }
    } catch (err: any) {
      playSound(false);
      toast.error(err.message || "Failed to process check-in");
    } finally {
      setIsChecking(false);
    }
  };

  // Camera Management
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // Required for iOS Safari
        await videoRef.current.play();
      }

      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : "Unable to access device camera. Please check permissions."
      );
      setIsCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  // Flip Camera
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Restart camera when facingMode changes if already active
  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
  }, [facingMode]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // QR Scanning Loop
  useEffect(() => {
    let animId: number;

    const scanFrame = () => {
      if (
        isCameraActive &&
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
        canvasRef.current &&
        !scanLockRef.current &&
        !isChecking
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            // Lock scanning to avoid multiple triggers on same frame
            scanLockRef.current = true;
            verifyTicket(code.data);

            // Cooldown before scanning next attendee (1.8 seconds)
            setTimeout(() => {
              scanLockRef.current = false;
            }, 1800);
          }
        }
      }

      if (isCameraActive) {
        animId = requestAnimationFrame(scanFrame);
      }
    };

    if (isCameraActive) {
      animId = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isCameraActive, isChecking]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyTicket(ticketInput, tokenInput);
  };

  const checkedInCount = allTickets?.filter((t) => t.status === "USED").length || 0;
  const totalCount = allTickets?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header Stats */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider border border-green-200">
                Gate Entry Control
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                Live Smartphone Camera
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              QR Ticket Scanner & Verifier
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Point your phone camera at attendee QR passes for instant real-time admission.
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-right shrink-0">
            <div className="text-[10px] uppercase font-bold text-green-800">
              Turnout Check-Ins
            </div>
            <div className="text-2xl font-bold text-green-700">
              {checkedInCount} / {totalCount}
            </div>
          </div>
        </div>

        {/* Live Camera Scanner Box */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-gray-900">
                Smartphone Camera Scanner
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                title={soundEnabled ? "Mute audio chimes" : "Enable audio chimes"}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-green-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {isCameraActive && (
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                  title="Switch Front/Rear Camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={isCameraActive ? stopCamera : startCamera}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm ${
                  isCameraActive
                    ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    <span>Stop Camera</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Start Phone Camera</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {cameraError && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {cameraError}
            </div>
          )}

          {isCameraActive && (
            <div className="relative w-full aspect-video sm:aspect-[4/3] max-w-lg mx-auto bg-black rounded-xl overflow-hidden border-2 border-blue-500 shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-white/60 rounded-2xl relative">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />

                  {/* Laser line animation */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_cyan] animate-pulse absolute top-1/2" />
                </div>
              </div>

              <div className="absolute bottom-3 inset-x-0 text-center">
                <span className="px-3 py-1 rounded-full bg-black/70 text-white text-[11px] font-medium backdrop-blur-sm">
                  {isChecking ? "Verifying ticket..." : "Center QR pass within frame"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Verification Result Banner */}
        {lastResult && (
          <div
            className={`p-6 rounded-xl border transition-all duration-300 shadow-md ${
              lastResult.ok
                ? "bg-green-50 border-green-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex items-start gap-4">
              {lastResult.ok ? (
                <CheckCircle2 className="w-9 h-9 text-green-600 shrink-0" />
              ) : (
                <XCircle className="w-9 h-9 text-red-600 shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={`text-xl font-black uppercase tracking-tight ${
                      lastResult.ok ? "text-green-950" : "text-red-950"
                    }`}
                  >
                    {lastResult.ok ? "ENTRY GRANTED" : "ENTRY DENIED"}
                  </h3>
                  {lastResult.alreadyUsed && (
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px] uppercase">
                      Duplicate Pass
                    </span>
                  )}
                </div>

                <p
                  className={`text-sm mt-1 font-semibold ${
                    lastResult.ok ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {lastResult.message}
                </p>

                {lastResult.ticket && (
                  <div className="mt-3 p-3 bg-white/80 rounded-lg border border-gray-200 text-xs space-y-1 text-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Attendee:</span>
                      <strong className="text-gray-900">
                        {lastResult.ticket.attendeeName}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Ticket:</span>
                      <span className="font-mono font-bold">
                        {lastResult.ticket.ticketNumber}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Event:</span>
                      <span className="font-medium">
                        {lastResult.ticket.eventName}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manual Input / Barcode Scanner Gun Fallback */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-sm font-bold text-gray-900">
              Manual Entry or USB/Bluetooth Scanner Gun
            </h2>
            <span className="text-[11px] text-gray-400">
              Auto-focus ready
            </span>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Ticket Number / Raw QR Payload
              </label>
              <div className="relative">
                <QrCode className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  placeholder="e.g. TKT-2026-12345-1 or scan with external scanner"
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-mono text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Optional verification token (auto-extracted from QR payload)"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-xs font-mono text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isChecking}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isChecking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : null}
              <span>Verify & Check-In Attendee</span>
            </button>
          </form>
        </div>

        {/* Live Passes Roster */}
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              Live Gate Log (Last 15 Scans)
            </h2>
            <span className="text-xs text-gray-400">
              Real-time reactive sync
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {allTickets?.slice(0, 15).map((t) => (
              <div
                key={t._id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-gray-900">
                    {t.attendeeName}
                  </div>
                  <div className="text-[11px] font-mono text-gray-400">
                    {t.ticketNumber} • {t.eventName}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === "USED"
                        ? "bg-gray-100 text-gray-700"
                        : t.status === "VALID"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {t.status}
                  </span>
                  {t.checkedInAt && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      {format(new Date(t.checkedInAt), "HH:mm:ss")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
