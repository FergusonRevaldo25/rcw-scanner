import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-6 text-center">
      <h1 className="text-3xl font-bold rcw-gradient-text">RCW Scanner</h1>
      <p className="text-gray-400 max-w-xs">
        Choose a scan mode to get started.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/dispatch"
          className="rcw-gradient-bg rcw-glow text-white font-bold px-6 py-3 rounded-full"
        >
          Dispatch Scanner
        </Link>
        <Link
          href="/licence"
          className="border border-gray-700 text-white font-bold px-6 py-3 rounded-full"
        >
          Licence Disc Scanner
        </Link>
      </div>
    </main>
  );
}
