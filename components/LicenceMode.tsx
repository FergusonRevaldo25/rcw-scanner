"use client";

import { useState } from "react";
import CameraScanner from "./CameraScanner";

interface LicenceScan {
  raw: string;
  time: string;
}

export default function LicenceMode() {
  const [scans, setScans] = useState<LicenceScan[]>([]);

  function handleScan(text: string) {
    setScans((prev) => {
      if (prev.some((s) => s.raw === text)) return prev;
      return [{ raw: text, time: new Date().toLocaleTimeString() }, ...prev];
    });
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold rcw-gradient-text text-center">
        Licence Disc Scanner
      </h1>
      <p className="text-gray-400 text-sm text-center">
        Scans the barcode and shows the raw data. Structured field parsing (reg
        number, VIN, expiry) is a future upgrade.
      </p>

      <CameraScanner onScan={handleScan} formats={["PDF_417"]} />

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
