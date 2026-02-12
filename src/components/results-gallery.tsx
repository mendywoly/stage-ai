"use client";

import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

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

interface ResultsGalleryProps {
  results: ImageResult[];
  onReset: () => void;
}

export function ResultsGallery({ results, onReset }: ResultsGalleryProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Staged Results ({results.length} photo{results.length > 1 ? "s" : ""})
        </h2>
        <button
          onClick={onReset}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Stage New Photos
        </button>
      </div>

      {results.map((result, i) => (
        <ImageResultCard key={i} result={result} index={i} />
      ))}
    </div>
  );
}

function ImageResultCard({
  result,
  index,
}: {
  result: ImageResult;
  index: number;
}) {
  const [activeVariation, setActiveVariation] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);

  const successfulVariations = result.variations.filter((v) => v.path);
  const currentVariation = successfulVariations[activeVariation];

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b bg-muted/30 px-4 py-3">
        <p className="text-sm font-medium">
          Photo {index + 1}: {result.originalName}
        </p>
      </div>

      <div className="p-4">
        <div className="flex gap-4">
          {/* Original */}
          <div className="w-1/3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Original
            </p>
            <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
              <img
                src={result.originalPath}
                alt="Original"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Staged Result */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Staged — Variation {activeVariation + 1} of{" "}
                {successfulVariations.length}
              </p>
              {currentVariation?.path && (
                <a
                  href={currentVariation.path}
                  download
                  className="flex items-center gap-1.5 rounded-md bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-200"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              )}
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
              {showOriginal ? (
                <img
                  src={result.originalPath}
                  alt="Original"
                  className="h-full w-full object-cover"
                />
              ) : currentVariation?.path ? (
                <img
                  src={currentVariation.path}
                  alt={`Staged variation ${activeVariation + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Generation failed
                </div>
              )}

              {/* Navigation arrows */}
              {successfulVariations.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveVariation(
                        (activeVariation - 1 + successfulVariations.length) %
                          successfulVariations.length
                      )
                    }
                    className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveVariation(
                        (activeVariation + 1) % successfulVariations.length
                      )
                    }
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {/* Compare toggle */}
            <button
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              onTouchStart={() => setShowOriginal(true)}
              onTouchEnd={() => setShowOriginal(false)}
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              Hold to compare with original
            </button>

            {/* Variation dots */}
            {successfulVariations.length > 1 && (
              <div className="flex gap-1.5">
                {successfulVariations.map((_, vi) => (
                  <button
                    key={vi}
                    onClick={() => setActiveVariation(vi)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      vi === activeVariation
                        ? "bg-violet-500"
                        : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}

            {currentVariation?.description && (
              <p className="text-xs text-muted-foreground">
                {currentVariation.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
