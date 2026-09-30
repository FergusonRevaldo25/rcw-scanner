"use client";

import { useEffect, useRef, useState } from "react";

interface ParsedDisc {
  regAuthNo?: string;
  licenceNo?: string;
  vehicleReg?: string;
  vinLicenceNo?: string;
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
  // SA licence disc PDF417 fields are % delimited, roughly in this order.
  // Format can vary slightly, so this is best-effort labeling, not guaranteed field-perfect.
  const parts = raw.split("%").filter(Boolean);
  return {
    regAuthNo: parts[0],
    licenceNo: parts[2],
    vehicleReg: parts[4],
    vinLicenceNo: parts[5],
    bodyType: parts[6],
    make: parts[7],
    model: parts[8],
    vin: parts[9],
    engineNo: parts[10],
    expiryDate: parts[11],
  };
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
          undefined,
          videoRef.current!,
          (result) => {
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

  function removeScan(index: number) {
    setScans((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAll() {
    setScans([]);
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
              <p className="text-gray-500 text-xs mb-2">{s.time}</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <span className="text-gray-500">Reg No:</span>
                <span className="text-white">{s.parsed.vehicleReg || "—"}</span>
                <span className="text-gray-500">Make:</span>
                <span className="text-white">{s.parsed.make || "—"}</span>
                <span className="text-gray-500">Model:</span>
                <span className="text-white">{s.parsed.model || "—"}</span>
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
