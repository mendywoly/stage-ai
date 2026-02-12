"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { ImageUploader, type UploadedFile } from "@/components/image-uploader";
import { StyleSelector } from "@/components/style-selector";
import { ResultsGallery } from "@/components/results-gallery";
import { authenticatedFetch } from "@/lib/api";
import type { StagingStyle } from "@/lib/styles";
import { Sparkles, Loader2 } from "lucide-react";

interface Variation {
  path: string | null;
  variationIndex: number;
  description?: string;
  error?: string;
}

interface ImageResult {
  originalName: string;
  originalPath: string;
  variations: Variation[];
}

type AppStep = "upload" | "loading" | "results";

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<StagingStyle | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [step, setStep] = useState<AppStep>("upload");
  const [results, setResults] = useState<ImageResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const canGenerate =
    files.length > 0 && (selectedStyle !== null || customPrompt.trim() !== "");

  async function handleGenerate() {
    if (!canGenerate) return;

    setStep("loading");
    setError(null);
    setProgress(
      `Staging ${files.length} photo${files.length > 1 ? "s" : ""} with 3 variations each...`
    );

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min timeout

      const response = await authenticatedFetch("/api/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: files.map((f) => ({
            base64: f.base64,
            mimeType: f.mimeType,
            name: f.file.name,
          })),
          styleId: selectedStyle?.id || "modern-minimalist",
          customPrompt: customPrompt.trim() || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to stage photos");
      }

      const data = await response.json();
      setResults(data.results);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("upload");
    }
  }

  function handleReset() {
    setFiles([]);
    setSelectedStyle(null);
    setCustomPrompt("");
    setResults([]);
    setStep("upload");
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {step === "upload" && (
          <div className="space-y-8">
            {/* Step 1: Upload */}
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <ImageUploader files={files} onFilesChange={setFiles} />
            </section>

            {/* Step 2: Style Selection */}
            {files.length > 0 && (
              <section className="rounded-xl border bg-white p-6 shadow-sm">
                <StyleSelector
                  selectedStyle={selectedStyle}
                  onStyleSelect={setSelectedStyle}
                  customPrompt={customPrompt}
                  onCustomPromptChange={setCustomPrompt}
                />
              </section>
            )}

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Generate Button */}
            {files.length > 0 && (
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                <Sparkles className="h-5 w-5" />
                Stage {files.length} Photo{files.length > 1 ? "s" : ""} (3
                variations each)
              </button>
            )}
          </div>
        )}

        {step === "loading" && (
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-violet-100" />
              <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-violet-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Staging your photos...</p>
              <p className="mt-1 text-sm text-muted-foreground">{progress}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                This may take up to 2 minutes — AI is generating your staged photos
              </p>
            </div>
          </div>
        )}

        {step === "results" && (
          <ResultsGallery results={results} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
