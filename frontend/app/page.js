
"use client";

import { useState } from "react";
import Navbar from "./components/Navbar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function compareModels(event) {
    event.preventDefault();

    if (!prompt.trim()) {
      setError("Enter a prompt first.");
      return;
    }

    setLoading(true);
    setError("");
    setComparison(null);

    try {
      const response = await fetch(`${API_URL}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "The comparison request failed."
        );
      }

      setComparison(data.comparison);
    } catch (err) {
      setError(
        `${err.message} Check that the FastAPI server is running.`
      );
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    { key: "gemini", title: "Google Gemini", color: "indigo" },
    { key: "groq", title: "Groq", color: "emerald" },
  ];

  return (
    <>
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-600">
            Multi-model playground
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Compare AI Models
          </h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            Send one prompt to two AI providers and compare their answers,
            response times, and availability.
          </p>
        </div>

        <form
          onSubmit={compareModels}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <label
            htmlFor="prompt"
            className="mb-2 block text-sm font-semibold"
          >
            Your prompt
          </label>

          <textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Explain Python in two sentences."
            rows={4}
            maxLength={10000}
            required
            className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-gray-500">
              {prompt.length}/10000 characters
            </span>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Comparing models..." : "Compare Models"}
            </button>
          </div>
        </form>

        {loading && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800"
          >
            Both models are working. Gemini may take longer than Groq.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {comparison && (
          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Comparison results</h2>
              <p className="mt-1 break-words text-sm text-gray-500">
                Prompt: {prompt}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {cards.map((card) => {
                const result = comparison[card.key];
                const failed = Boolean(result?.error);

                return (
                  <article
                    key={card.key}
                    className="flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold">{card.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          failed
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {failed ? "Unavailable" : "Success"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      Model: {result?.model || "Not available"}
                    </p>

                    {failed ? (
                      <p className="mt-5 whitespace-pre-wrap break-words rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {result.error}
                      </p>
                    ) : (
                      <div className="mt-4 flex-1 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                        {result?.response || "The model returned an empty response."}
                      </div>
                    )}

                    {!failed && (
                      <div className="mt-5 border-t border-gray-100 pt-3 text-sm text-gray-500">
                        Response time:{" "}
                        <strong className="text-gray-900">
                          {result.response_time_seconds} seconds
                        </strong>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Results are saved to comparison history when the backend
              database is available.
            </p>
          </section>
        )}

        {!comparison && !loading && (
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-semibold">Google Gemini</h2>
              <p className="mt-2 text-sm text-gray-600">
                Ask questions and inspect the model's response.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-semibold">Groq</h2>
              <p className="mt-2 text-sm text-gray-600">
                Compare a second model using the same prompt.
              </p>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
