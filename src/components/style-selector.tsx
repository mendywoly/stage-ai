"use client";

import { STAGING_STYLES, type StagingStyle } from "@/lib/styles";
import { Check } from "lucide-react";

interface StyleSelectorProps {
  selectedStyle: StagingStyle | null;
  onStyleSelect: (style: StagingStyle) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
}

export function StyleSelector({
  selectedStyle,
  onStyleSelect,
  customPrompt,
  onCustomPromptChange,
}: StyleSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Choose a Style</h2>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {STAGING_STYLES.map((style) => {
          const isSelected = selectedStyle?.id === style.id;
          return (
            <button
              key={style.id}
              onClick={() => onStyleSelect(style)}
              className={`relative flex flex-col items-start gap-1 rounded-xl border-2 p-3.5 text-left transition-all ${
                isSelected
                  ? "border-violet-500 bg-violet-50 shadow-sm"
                  : "border-transparent bg-muted/50 hover:border-violet-200 hover:bg-violet-50/50"
              }`}
            >
              {isSelected && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <span className="text-lg">{style.emoji}</span>
              <span className="text-sm font-medium">{style.name}</span>
              <span className="text-xs text-muted-foreground leading-tight">
                {style.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="custom-prompt"
          className="text-sm font-medium text-muted-foreground"
        >
          Custom instructions (optional — adds to selected style)
        </label>
        <textarea
          id="custom-prompt"
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="e.g. Add a large sectional sofa facing the window, include a dining table for 6..."
          rows={3}
          className="w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
        />
      </div>
    </div>
  );
}
