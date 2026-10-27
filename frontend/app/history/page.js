
"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/history?limit=100`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not load history.");
      }

      setHistory(data.history || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Comparison History</h1>
            <p className="mt-2 text-gray-600">
              Saved AI model attempts from your local database.
            </p>
          </div>

          <button
            onClick={loadHistory}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Records loaded</p>
          <p className="mt-1 text-2xl font-bold">{history.length}</p>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading history...</p>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <h2 className="font-semibold">No history yet</h2>
            <p className="mt-2 text-sm text-gray-500">
              Submit a prompt on the AI Chatbot page to create your first records.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => {
              const failed = item.status !== "success";

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold">{item.provider}</h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        failed
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    {item.model} · {item.created_at}
                  </p>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Prompt
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                      {item.prompt}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Response / error
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                      {item.response || "No response was recorded."}
                    </p>
                  </div>

                  <p className="mt-4 text-xs text-gray-500">
                    Response time:{" "}
                    {item.response_time_seconds == null
                      ? "Unavailable"
                      : `${item.response_time_seconds} seconds`}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
