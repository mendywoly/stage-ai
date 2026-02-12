import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const BASE_STAGING_PROMPT = `You are a professional real estate photo stager. Your task is to add furniture, decor, and staging elements to this room photo.

CRITICAL RULES — YOU MUST FOLLOW THESE EXACTLY:
- Do NOT alter the room structure: walls, floors, ceilings, windows, doors must remain EXACTLY as they are in the original photo
- Do NOT change lighting conditions, wall colors, or flooring materials
- Do NOT remove any existing permanent fixtures (built-in shelves, countertops, etc.)
- Do NOT change the camera angle, perspective, or field of view
- ONLY ADD furniture, rugs, artwork, plants, decorations, and soft furnishings
- The staging must look photorealistic and professional, as if the furniture is truly in the room
- Maintain the exact same photo quality, resolution, and style
- Ensure furniture is properly scaled to the room dimensions
- Place furniture in realistic positions (not floating, properly grounded)`;

const VARIATION_SUFFIXES = [
  "", // Variation 1: base style
  "\n\nUse a slightly different furniture arrangement and color palette than you normally would. Try an alternative layout.", // Variation 2
  "\n\nTry a bolder, more distinctive design interpretation while staying within this style family. Make it stand out.", // Variation 3
];

export async function stageImage(
  imageBase64: string,
  mimeType: string,
  stylePrompt: string,
  customPrompt: string | null,
  variationIndex: number
): Promise<{ imageBase64: string; mimeType: string; text?: string }> {
  let fullPrompt = `${BASE_STAGING_PROMPT}\n\nStyle: ${stylePrompt}`;
  if (customPrompt) {
    fullPrompt += `\n\nAdditional instructions from user: ${customPrompt}`;
  }
  fullPrompt += VARIATION_SUFFIXES[variationIndex] || "";

  console.log(`[Gemini] Sending request: model=gemini-3-pro-image-preview, imageSize=${imageBase64.length} chars, mimeType=${mimeType}`);

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: fullPrompt },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });
  } catch (apiErr) {
    console.error("[Gemini] API call failed:", apiErr);
    throw apiErr;
  }

  console.log("[Gemini] Response received, candidates:", response.candidates?.length);

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    console.error("[Gemini] No candidates. Full response:", JSON.stringify(response, null, 2).slice(0, 2000));
    throw new Error("No response from Gemini");
  }

  const parts = candidates[0].content?.parts;
  if (!parts) {
    console.error("[Gemini] No parts. Candidate:", JSON.stringify(candidates[0], null, 2).slice(0, 2000));
    throw new Error("No content parts in response");
  }

  let resultImage: { imageBase64: string; mimeType: string } | null = null;
  let resultText: string | undefined;

  for (const part of parts) {
    if (part.text) {
      resultText = part.text;
    } else if (part.inlineData) {
      resultImage = {
        imageBase64: part.inlineData.data!,
        mimeType: part.inlineData.mimeType!,
      };
    }
  }

  if (!resultImage) {
    throw new Error("No image in Gemini response");
  }

  return { ...resultImage, text: resultText };
}
