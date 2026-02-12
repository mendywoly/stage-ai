import { NextRequest, NextResponse } from "next/server";
import { stageImage } from "@/lib/gemini";
import { saveUpload, saveResult } from "@/lib/storage";
import { getStyleById } from "@/lib/styles";

export const maxDuration = 120;

interface UploadedImage {
  base64: string;
  mimeType: string;
  name: string;
}

interface StageRequest {
  images: UploadedImage[];
  styleId: string;
  customPrompt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: StageRequest = await req.json();
    const { images, styleId, customPrompt } = body;

    if (!images || images.length === 0 || images.length > 5) {
      return NextResponse.json(
        { error: "Please provide between 1 and 5 images" },
        { status: 400 }
      );
    }

    const style = getStyleById(styleId);
    if (!style && !customPrompt) {
      return NextResponse.json(
        { error: "Please select a style or provide a custom prompt" },
        { status: 400 }
      );
    }

    const stylePrompt =
      style?.prompt ||
      "Stage this room with tasteful, modern furniture and decor.";

    const results = await Promise.all(
      images.map(async (image) => {
        const uploadPath = saveUpload(image.base64, image.mimeType);

        // Generate 1 variation for testing (change back to [0, 1, 2] for 3)
        const variations = await Promise.all(
          [0].map(async (variationIndex) => {
            try {
              const result = await stageImage(
                image.base64,
                image.mimeType,
                stylePrompt,
                customPrompt || null,
                variationIndex
              );
              const resultPath = saveResult(
                result.imageBase64,
                result.mimeType
              );
              return {
                path: resultPath,
                variationIndex,
                description: result.text,
              };
            } catch (err) {
              console.error(
                `Variation ${variationIndex} failed for ${image.name}:`,
                err
              );
              return {
                path: null,
                variationIndex,
                error:
                  err instanceof Error ? err.message : "Generation failed",
              };
            }
          })
        );

        return {
          originalName: image.name,
          originalPath: uploadPath,
          variations,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Stage API error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
