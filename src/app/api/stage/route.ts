import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
    // Get user from JWT token in request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized - please refresh page" },
        { status: 401 }
      );
    }

    // Create Supabase client with the user's JWT
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please refresh page" },
        { status: 401 }
      );
    }

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

    // TODO: Create generation record in database with user_id
    // const generation = await supabaseAdmin.from('generations').insert({
    //   user_id: user.id,
    //   num_images: images.length,
    //   style_id: styleId,
    //   custom_prompt: customPrompt || null,
    //   status: 'processing',
    //   payment_status: 'promo', // or 'pending' if requires payment
    // }).select().single();

    const results = await Promise.all(
      images.map(async (image) => {
        const uploadPath = await saveUpload(image.base64, image.mimeType);

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
              const resultPath = await saveResult(
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
