import { ScanLogEntry } from "@/types/scanner";

const LOG_KEY = "rcw_dispatch_log";

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function loadLog(): ScanLogEntry[] {
  const raw = safeGet(LOG_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addLogEntry(entry: ScanLogEntry) {
  const log = loadLog();
  log.unshift(entry);
  safeSet(LOG_KEY, JSON.stringify(log));
  return log;
}

export function clearLog() {
  safeSet(LOG_KEY, JSON.stringify([]));
}
