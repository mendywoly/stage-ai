import { createClient } from "@supabase/supabase-js";

// Public client (for reading results)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

// Admin client (for writes, server-side only)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
);

// Types
export interface Generation {
  id: string;
  created_at: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  amount_paid: number | null;
  payment_status: "pending" | "paid" | "failed" | "promo";
  promo_code_used: string | null;
  num_images: number;
  style_id: string;
  custom_prompt: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  completed_at: string | null;
  share_uuid: string;
}

export interface PromoCode {
  id: string;
  created_at: string;
  code: string;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  is_active: boolean;
  free_images: number;
  created_by: string | null;
  notes: string | null;
}

export interface ImageRecord {
  id: string;
  created_at: string;
  generation_id: string;
  type: "upload" | "result";
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  variation_index: number | null;
  original_image_id: string | null;
  upload_order: number | null;
}

// Helper: Create a new generation
export async function createGeneration(data: {
  num_images: number;
  style_id: string;
  custom_prompt: string | null;
  amount_paid: number; // in cents
}) {
  const { data: generation, error } = await supabaseAdmin
    .from("generations")
    .insert({
      num_images: data.num_images,
      style_id: data.style_id,
      custom_prompt: data.custom_prompt,
      amount_paid: data.amount_paid,
      payment_status: "pending",
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return generation as Generation;
}

// Helper: Upload image to Supabase Storage
export async function uploadImage(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const path = `${Date.now()}-${fileName}`;

  const { error } = await supabaseAdmin.storage
    .from("stage-images")
    .upload(path, file, {
      contentType: mimeType,
      cacheControl: "3600",
    });

  if (error) throw error;

  // Return public URL
  const { data } = supabaseAdmin.storage
    .from("stage-images")
    .getPublicUrl(path);

  return data.publicUrl;
}

// Helper: Save image record to DB
export async function saveImageRecord(data: {
  generation_id: string;
  type: "upload" | "result";
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size?: number;
  variation_index?: number;
  original_image_id?: string;
  upload_order?: number;
}) {
  const { data: image, error } = await supabaseAdmin
    .from("images")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return image as ImageRecord;
}

// Helper: Update generation status
export async function updateGenerationStatus(
  id: string,
  status: "processing" | "completed" | "failed",
  errorMessage?: string
) {
  const updateData: any = { status };
  if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
  }
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await supabaseAdmin
    .from("generations")
    .update(updateData)
    .eq("id", id);

  if (error) throw error;
}

// Helper: Update payment status
export async function updatePaymentStatus(
  checkoutSessionId: string,
  paymentIntentId: string,
  status: "paid" | "failed"
) {
  const { error } = await supabaseAdmin
    .from("generations")
    .update({
      stripe_payment_intent_id: paymentIntentId,
      payment_status: status,
    })
    .eq("stripe_checkout_session_id", checkoutSessionId);

  if (error) throw error;
}

// Helper: Get generation by share UUID
export async function getGenerationByShareUUID(shareUuid: string) {
  const { data: generation, error } = await supabase
    .from("generations")
    .select(
      `
      *,
      images (*)
    `
    )
    .eq("share_uuid", shareUuid)
    .single();

  if (error) throw error;
  return generation as Generation & { images: ImageRecord[] };
}

// Helper: Get generation by checkout session ID
export async function getGenerationByCheckoutSession(sessionId: string) {
  const { data: generation, error } = await supabaseAdmin
    .from("generations")
    .select()
    .eq("stripe_checkout_session_id", sessionId)
    .single();

  if (error) throw error;
  return generation as Generation;
}

// ===== PROMO CODE HELPERS =====

// Validate and check if a promo code is valid
export async function validatePromoCode(code: string): Promise<{
  valid: boolean;
  promoCode?: PromoCode;
  error?: string;
}> {
  const { data: promo, error } = await supabase
    .from("promo_codes")
    .select()
    .eq("code", code.toUpperCase())
    .single();

  if (error || !promo) {
    return { valid: false, error: "Invalid promo code" };
  }

  const promoCode = promo as PromoCode;

  // Check if expired
  if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
    return { valid: false, error: "Promo code has expired" };
  }

  // Check if max uses reached
  if (
    promoCode.max_uses !== null &&
    promoCode.times_used >= promoCode.max_uses
  ) {
    return { valid: false, error: "Promo code has been fully redeemed" };
  }

  // Check if active
  if (!promoCode.is_active) {
    return { valid: false, error: "Promo code is no longer active" };
  }

  return { valid: true, promoCode };
}

// Increment promo code usage (call after generation is created)
export async function incrementPromoCodeUsage(code: string) {
  const { error } = await supabaseAdmin.rpc("increment_promo_usage", {
    promo_code: code.toUpperCase(),
  });

  // If the RPC doesn't exist, do it manually
  if (error) {
    const { data: promo } = await supabaseAdmin
      .from("promo_codes")
      .select("times_used")
      .eq("code", code.toUpperCase())
      .single();

    if (promo) {
      await supabaseAdmin
        .from("promo_codes")
        .update({ times_used: (promo.times_used || 0) + 1 })
        .eq("code", code.toUpperCase());
    }
  }
}

// Create generation with promo code
export async function createGenerationWithPromo(data: {
  num_images: number;
  style_id: string;
  custom_prompt: string | null;
  promo_code: string;
}) {
  const { data: generation, error } = await supabaseAdmin
    .from("generations")
    .insert({
      num_images: data.num_images,
      style_id: data.style_id,
      custom_prompt: data.custom_prompt,
      amount_paid: 0,
      payment_status: "promo",
      promo_code_used: data.promo_code.toUpperCase(),
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;

  // Increment usage
  await incrementPromoCodeUsage(data.promo_code);

  return generation as Generation;
}
