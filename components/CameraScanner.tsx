"use client";

import { useEffect, useState } from "react";

interface CameraScannerProps {
  onScan: (text: string) => void;
  formats?: string[]; // pass format names to narrow detection
}

export default function CameraScanner({ onScan, formats }: CameraScannerProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let html5QrCode: any;
    let cancelled = false;

    import("html5-qrcode").then(
      ({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
        if (cancelled) return;
        html5QrCode = new Html5Qrcode("scanner-region");

        const formatsToSupport = formats
          ? formats
              .map((f) => (Html5QrcodeSupportedFormats as any)[f])
              .filter((f) => f !== undefined)
          : undefined;

        html5QrCode
          .start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 280, height: 180 },
              ...(formatsToSupport ? { formatsToSupport } : {}),
            },
            (decodedText: string) => {
              onScan(decodedText);
            },
            () => {},
          )
          .catch(() => {
            setError("Could not access camera. Check browser permissions.");
          });
      },
    );

    return () => {
      cancelled = true;
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [active, onScan, formats]);

  return (
    <div className="space-y-3">
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
        <div
          id="scanner-region"
          className="rounded-xl overflow-hidden border border-gray-800"
        />
      )}
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  );
}
