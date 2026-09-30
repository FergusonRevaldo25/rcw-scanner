"use client";

import { useEffect, useState, useCallback } from "react";
import CameraScanner from "./CameraScanner";
import { getProductByBarcode } from "@/lib/products";
import { loadLog, addLogEntry } from "@/lib/dispatchStorage";
import { ScanLogEntry } from "@/types/scanner";

export default function DispatchMode() {
  const [log, setLog] = useState<ScanLogEntry[]>([]);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    setLog(loadLog());
  }, []);

  const handleScan = useCallback(
    (text: string) => {
      const product = getProductByBarcode(text);
      if (log.some((entry) => entry.raw === text)) {
        setLastMessage(`Already scanned: ${product?.name || text}`);
        return;
      }
      const entry: ScanLogEntry = {
        raw: text,
        time: new Date().toLocaleTimeString(),
        matched: product,
      };
      const updated = addLogEntry(entry);
      setLog(updated);
      setLastMessage(
        product ? `Packed: ${product.name}` : `Unknown barcode: ${text}`,
      );
    },
    [log],
  );

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold rcw-gradient-text text-center">
        Dispatch Scanner
      </h1>
      <p className="text-gray-400 text-sm text-center">
        Scan a product barcode to mark it as packed and ready.
      </p>

      <CameraScanner onScan={handleScan} />

      {lastMessage && (
        <p className="text-center text-sm text-white">{lastMessage}</p>
      )}

      <div className="space-y-2">
        <h2 className="text-white font-semibold">Scanned ({log.length})</h2>
        {log.length === 0 ? (
          <p className="text-gray-500 text-sm">No items scanned yet.</p>
        ) : (
          log.map((entry, i) => (
            <div
              key={i}
              className="flex justify-between items-center border border-gray-800 rounded p-2 text-sm"
            >
              <span className={entry.matched ? "text-white" : "text-red-400"}>
                {entry.matched ? entry.matched.name : `Unknown (${entry.raw})`}
              </span>
              <span className="text-gray-500 text-xs">{entry.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
