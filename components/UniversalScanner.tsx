"use client";

import { useEffect, useRef, useState } from "react";
import { getProductByBarcode } from "@/lib/products";

interface UniversalScan {
  text: string;
  format: string;
  label: string;
  detail: string;
  time: string;
}

function identifyContent(
  text: string,
  format: string,
): { label: string; detail: string } {
  // Licence disc: SA format is % delimited with many fields, always PDF_417
  if (format === "PDF_417" && text.split("%").length > 8) {
    const parts = text.split("%").filter(Boolean);
    const make = parts[8] || "";
    const model = parts[9] || "";
    return {
      label: "Vehicle Licence Disc",
      detail: make || model ? `${make} ${model}`.trim() : "Details unavailable",
    };
  }

  // Retail/product barcode formats — check against known products first
  const productFormats = [
    "EAN_13",
    "EAN_8",
    "UPC_A",
    "UPC_E",
    "CODE_128",
    "CODE_39",
    "ITF",
  ];
  if (productFormats.includes(format)) {
    const product = getProductByBarcode(text);
    if (product) {
      return { label: "Product", detail: product.name };
    }
    return { label: `Barcode (${format})`, detail: "Not in product list" };
  }

  // QR / Data Matrix / Aztec / PDF417 — content-based routing, since these can hold anything
  const contentCarrierFormats = ["QR_CODE", "DATA_MATRIX", "AZTEC", "PDF_417"];
  if (contentCarrierFormats.includes(format)) {
    if (/^BEGIN:VCARD/i.test(text)) {
      return {
        label: "Contact Card",
        detail: "vCard — tap Raw data to view full details",
      };
    }
    if (/^WIFI:/i.test(text)) {
      return {
        label: "Wi-Fi Network",
        detail: "Tap Raw data to view connection details",
      };
    }
    if (/^https?:\/\//i.test(text)) {
      return { label: "Website Link", detail: text };
    }
    if (/^mailto:/i.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return { label: "Email Address", detail: text.replace(/^mailto:/i, "") };
    }
    if (/^tel:/i.test(text)) {
      return { label: "Phone Number", detail: text.replace(/^tel:/i, "") };
    }
    return {
      label: `${format.replace("_", " ")} Content`,
      detail: text.length > 60 ? text.slice(0, 60) + "…" : text,
    };
  }

  // Fallback for any format we haven't explicitly handled
  return { label: format.replace("_", " "), detail: text };
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

        const zxingBrowser = await import("@zxing/browser");
        const zxingLibrary = await import("@zxing/library");
        if (cancelled) return;

        const { BrowserMultiFormatReader } = zxingBrowser;
        const { BarcodeFormat } = zxingLibrary;

        const reader = new BrowserMultiFormatReader();

        const handleResult = (result: any) => {
          if (result) {
            const text = result.getText();
            const formatEnum = result.getBarcodeFormat();
            // Resolve the numeric enum back to its readable name, e.g. "QR_CODE"
            const format = (BarcodeFormat as any)[formatEnum] ?? "UNKNOWN";
            const { label, detail } = identifyContent(text, format);
            setScans((prev) => {
              if (prev.some((s) => s.text === text)) return prev;
              return [
                {
                  text,
                  format,
                  label,
                  detail,
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

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold rcw-gradient-text text-center">
        Universal Scanner
      </h1>
      <p className="text-gray-400 text-sm text-center">
        Scans any barcode or QR code and tells you what it is.
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
              <p className="text-white font-semibold">{s.label}</p>
              <p className="text-gray-300 text-xs break-all">{s.detail}</p>
              <details>
                <summary className="text-gray-500 text-xs cursor-pointer">
                  Raw data
                </summary>
                <p className="text-gray-400 text-xs break-all mt-1">{s.text}</p>
              </details>
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
