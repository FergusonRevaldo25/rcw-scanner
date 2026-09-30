"use client";

import { useEffect, useRef, useState } from "react";

interface ParsedDisc {
  regAuthNo?: string;
  discNo?: string;
  licenceNo?: string;
  vehicleReg?: string;
  bodyType?: string;
  make?: string;
  model?: string;
  colour?: string;
  vin?: string;
  engineNo?: string;
  expiryDate?: string;
}

interface LicenceScan {
  raw: string;
  parsed: ParsedDisc;
  time: string;
}

function parseDiscData(raw: string): ParsedDisc {
  // SA licence disc PDF417 fields are % delimited.
  // Indices confirmed against a real scanned sample — may still vary
  // slightly across disc versions, so treat as best-effort.
  const parts = raw.split("%").filter(Boolean);
  return {
    regAuthNo: parts[0],
    discNo: parts[4],
    licenceNo: parts[5],
    vehicleReg: parts[6],
    bodyType: parts[7],
    make: parts[8],
    model: parts[9],
    colour: parts[10],
    vin: parts[11],
    engineNo: parts[12],
    expiryDate: parts[13],
  };
}

export default function LicenceMode() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scans, setScans] = useState<LicenceScan[]>([]);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomCapable, setZoomCapable] = useState(false);

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
              advanced: [
                { focusMode: "continuous" } as any,
                { exposureMode: "manual", exposureCompensation: -1 } as any,
              ],
            },
          });
          streamRef.current = manualStream;

          const track = manualStream.getVideoTracks()[0];
          const capabilities = track.getCapabilities?.() as any;
          if (capabilities?.zoom) {
            setZoomCapable(true);
          }
        } catch {
          manualStream = null;
        }

        if (cancelled) return;

        const { BrowserPDF417Reader } = await import("@zxing/browser");
        if (cancelled) return;

        const reader = new BrowserPDF417Reader();

        const handleResult = (result: any) => {
          if (result) {
            const text = result.getText();
            setScans((prev) => {
              if (prev.some((s) => s.raw === text)) return prev;
              return [
                {
                  raw: text,
                  parsed: parseDiscData(text),
                  time: new Date().toLocaleTimeString(),
                },
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

  function handleZoomChange(value: number) {
    setZoom(value);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && "applyConstraints" in track) {
      track
        .applyConstraints({ advanced: [{ zoom: value } as any] })
        .catch(() => {});
    }
  }

  function handleTapToFocus() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && "applyConstraints" in track) {
      track
        .applyConstraints({ advanced: [{ focusMode: "single-shot" } as any] })
        .catch(() => {});
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold rcw-gradient-text text-center">
        Licence Disc Scanner
      </h1>
      <p className="text-gray-400 text-sm text-center">
        Point your camera at the licence disc barcode.
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
        <div className="space-y-2">
          <div
            className="w-full max-w-xs mx-auto aspect-[4/3] rounded-xl overflow-hidden border border-gray-800 bg-black"
            onClick={handleTapToFocus}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          </div>
          <p className="text-gray-500 text-xs text-center">
            Tap the camera preview to refocus
          </p>
          {zoomCapable && (
            <div className="max-w-xs mx-auto">
              <input
                type="range"
                min={1}
                max={5}
                step={0.1}
                value={zoom}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-gray-500 text-xs text-center">
                Zoom: {zoom.toFixed(1)}x
              </p>
            </div>
          )}
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
              <p className="text-gray-500 text-xs mb-2">{s.time}</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <span className="text-gray-500">Reg No:</span>
                <span className="text-white">{s.parsed.vehicleReg || "—"}</span>
                <span className="text-gray-500">Make:</span>
                <span className="text-white">{s.parsed.make || "—"}</span>
                <span className="text-gray-500">Model:</span>
                <span className="text-white">{s.parsed.model || "—"}</span>
                <span className="text-gray-500">Colour:</span>
                <span className="text-white">{s.parsed.colour || "—"}</span>
                <span className="text-gray-500">VIN:</span>
                <span className="text-white break-all">
                  {s.parsed.vin || "—"}
                </span>
                <span className="text-gray-500">Expiry:</span>
                <span className="text-white">{s.parsed.expiryDate || "—"}</span>
              </div>
              <details className="pt-1">
                <summary className="text-gray-500 text-xs cursor-pointer">
                  Raw data
                </summary>
                <p className="text-gray-400 text-xs break-all mt-1">{s.raw}</p>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
