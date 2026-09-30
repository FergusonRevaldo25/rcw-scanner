"use client";

import { useEffect, useRef, useState } from "react";

interface LicenceScan {
  raw: string;
  time: string;
}

export default function LicenceMode() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scans, setScans] = useState<LicenceScan[]>([]);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let controls: any;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserPDF417Reader } = await import("@zxing/browser");
        if (cancelled) return;

        const reader = new BrowserPDF417Reader();
        controls = await reader.decodeFromVideoDevice(
          undefined, // let browser pick back camera
          videoRef.current!,
          (result) => {
            if (result) {
              const text = result.getText();
              setScans((prev) => {
                if (prev.some((s) => s.raw === text)) return prev;
                return [
                  { raw: text, time: new Date().toLocaleTimeString() },
                  ...prev,
                ];
              });
            }
          },
        );
      } catch (err) {
        setError("Could not access camera. Check browser permissions.");
      }
    })();

    return () => {
      cancelled = true;
      if (controls) controls.stop();
    };
  }, [active]);

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold rcw-gradient-text text-center">
        Licence Disc Scanner
      </h1>
      <p className="text-gray-400 text-sm text-center">
        Scans the barcode and shows the raw data. Structured field parsing (reg
        number, VIN, expiry) is a future upgrade.
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
        <video
          ref={videoRef}
          className="w-full rounded-xl border border-gray-800"
          muted
          playsInline
        />
      )}

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <div className="space-y-2">
        <h2 className="text-white font-semibold">Scanned ({scans.length})</h2>
        {scans.length === 0 ? (
          <p className="text-gray-500 text-sm">No scans yet.</p>
        ) : (
          scans.map((s, i) => (
            <div
              key={i}
              className="border border-gray-800 rounded p-2 text-sm space-y-1"
            >
              <p className="text-white break-all">{s.raw}</p>
              <p className="text-gray-500 text-xs">{s.time}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
