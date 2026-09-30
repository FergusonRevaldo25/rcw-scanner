"use client";

import { useEffect, useRef, useState } from "react";

interface UniversalScan {
  text: string;
  format: string;
  time: string;
}

export default function UniversalScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scans, setScans] = useState<UniversalScan[]>([]);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let controls: any;
    let manualStream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        try {
          manualStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              advanced: [{ focusMode: "continuous" } as any],
            },
          });
          streamRef.current = manualStream;
        } catch {
          manualStream = null;
        }

        if (cancelled) return;

        // BrowserMultiFormatReader auto-detects across QR, EAN, UPC,
        // Code128, Code39, PDF417, DataMatrix, and more — no format lock.
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;

        const reader = new BrowserMultiFormatReader();

        const handleResult = (result: any) => {
          if (result) {
            const text = result.getText();
            const format = result.getBarcodeFormat
              ? String(result.getBarcodeFormat())
              : "Unknown";
            setScans((prev) => {
              if (prev.some((s) => s.text === text)) return prev;
              return [
                { text, format, time: new Date().toLocaleTimeString() },
                ...prev,
              ];
            });
          }
        };

        if (manualStream && videoRef.current) {
          videoRef.current.srcObject = manualStream;
          await videoRef.current.play();
          controls = await reader.decodeFromStream(
            manualStream,
            videoRef.current,
            handleResult,
          );
        } else {
          controls = await reader.decodeFromVideoDevice(
            undefined,
            videoRef.current!,
            handleResult,
          );
        }
      } catch (err) {
        setError("Could not access camera. Check browser permissions.");
      }
    })();

    return () => {
      cancelled = true;
      if (controls) controls.stop();
      if (manualStream) {
        manualStream.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
    };
  }, [active]);

  function removeScan(index: number) {
    setScans((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAll() {
    setScans([]);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold rcw-gradient-text text-center">
        Universal Scanner
      </h1>
      <p className="text-gray-400 text-sm text-center">
        Scans any barcode or QR code type automatically.
      </p>

      {!active ? (
        <button
          onClick={() => setActive(true)}
          className="rcw-gradient-bg rcw-glow text-white font-bold px-6 py-3 rounded-full w-full"
          type="button"
        >
          Start Scanning
        </button>
      ) : (
        <button
          onClick={() => setActive(false)}
          className="bg-red-600 text-white font-bold px-6 py-3 rounded-full w-full"
          type="button"
        >
          Stop Scanning
        </button>
      )}

      {active && (
        <div className="w-full max-w-xs mx-auto aspect-[4/3] rounded-xl overflow-hidden border border-gray-800 bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        </div>
      )}

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-white font-semibold">Scanned ({scans.length})</h2>
          {scans.length > 0 && (
            <button
              onClick={clearAll}
              type="button"
              className="text-red-400 text-xs underline"
            >
              Clear All
            </button>
          )}
        </div>

        {scans.length === 0 ? (
          <p className="text-gray-500 text-sm">No scans yet.</p>
        ) : (
          scans.map((s, i) => (
            <div
              key={i}
              className="border border-gray-800 rounded-lg p-3 text-sm space-y-1 relative"
            >
              <button
                onClick={() => removeScan(i)}
                type="button"
                className="absolute top-2 right-2 text-gray-500 hover:text-red-400 text-xs"
              >
                ✕
              </button>
              <p className="text-gray-500 text-xs">
                {s.time} · <span className="rcw-gradient-text">{s.format}</span>
              </p>
              <p className="text-white break-all">{s.text}</p>
              <button
                onClick={() => copyToClipboard(s.text)}
                type="button"
                className="text-gray-400 text-xs underline"
              >
                Copy
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
