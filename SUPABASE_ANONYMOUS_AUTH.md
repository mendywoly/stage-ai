# Stage AI - Supabase Anonymous Auth Implementation

## Overview
Use **Supabase's built-in anonymous authentication** instead of custom session tokens. This provides:
- Automatic user tracking (anonymous or authenticated)
- JWT tokens with `is_anonymous` claim
- Easy conversion to full accounts later
- Built-in RLS (Row Level Security) support

---

## Architecture

### Phase 1: Anonymous Users (MVP)

**User Flow:**
```
User visits site
  → Call supabase.auth.signInAnonymously()
  → User gets anonymous user_id in auth.users
  → JWT stored automatically in localStorage
  → All API calls authenticated via JWT
  → Generations linked to user_id
```

**Converting to Full Account:**
```
User clicks "Sign Up"
  → Call supabase.auth.updateUser({ email, password })
  → Same user_id preserved
  → is_anonymous flag removed
  → All previous generations still linked
```

---

## Database Schema Changes

### 1. Add user_id to generations table

```sql
-- Add user_id column (references Supabase Auth)
ALTER TABLE generations
ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE INDEX idx_generations_user_id ON generations(user_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Public read access via share_uuid" ON generations;

-- Anyone can read via share_uuid (public links)
CREATE POLICY "Public read via share_uuid" ON generations
  FOR SELECT
  USING (share_uuid IS NOT NULL);

-- Users can read their own generations
CREATE POLICY "Users read own generations" ON generations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update
CREATE POLICY "Service role insert" ON generations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role update" ON generations
  FOR UPDATE
  USING (true);
```

### 2. Enable Anonymous Sign-Ins in Supabase Dashboard

**Steps:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable **Anonymous Sign-Ins**
3. (Optional but recommended) Enable CAPTCHA to prevent abuse

---

## Frontend Implementation

### 1. Create Auth Helper (`src/lib/auth.ts`)

```typescript
import { supabase } from "./supabase";

/**
 * Ensure user is signed in (anonymously if needed)
 * Call this on app initialization
 */
export async function ensureAuthenticated() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // No session exists, sign in anonymously
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("Failed to sign in anonymously:", error);
      throw error;
    }
    return data.user;
  }

  return session.user;
}

/**
 * Get current user ID (works for anonymous and authenticated)
 */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * Check if current user is anonymous
 */
export async function isAnonymousUser(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.is_anonymous || false;
}

/**
 * Convert anonymous user to full account
 */
export async function convertToFullAccount(
  email: string,
  password: string
): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    email,
    password,
  });

  if (error) throw error;
}
```

### 2. Initialize Auth on App Load (`src/app/layout.tsx`)

```typescript
"use client";

import { useEffect } from "react";
import { ensureAuthenticated } from "@/lib/auth";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Ensure user is authenticated (anonymously if needed)
    ensureAuthenticated().catch(console.error);
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 3. Update API Routes to Use User ID

**File: `src/app/api/stage/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stageImage } from "@/lib/gemini";
import { saveUpload, saveResult } from "@/lib/storage";
import { getStyleById } from "@/lib/styles";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    // Get user from JWT token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization") || "",
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - please refresh page" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { images, styleId, customPrompt } = body;

    // ... rest of staging logic ...

    // When creating generation, include user_id
    // await supabaseAdmin.from('generations').insert({
    //   user_id: user.id, // <-- Add this
    //   ...
    // });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Stage API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## Updated User Flows

### Flow 1: First-Time Visitor

```
1. User lands on homepage
   → Frontend calls ensureAuthenticated()
   → supabase.auth.signInAnonymously()
   → User gets anonymous user_id

2. User uploads 3 images + selects style
   → Frontend sends JWT in Authorization header
   → Backend extracts user_id from JWT
   → Creates generation with user_id

3. Processing completes
   → Redirect to /g/[share_uuid]
   → User can see their result

4. User visits /dashboard
   → Fetch all generations WHERE user_id = current_user
   → Shows history (persists until they clear browser data)
```

### Flow 2: Returning Visitor (Same Device)

```
1. User returns to site
   → JWT still in localStorage
   → supabase.auth.getSession() returns existing session
   → No new user created

2. User visits /dashboard
   → Sees all previous generations
```

### Flow 3: Converting to Full Account

```
1. User clicks "Sign Up" or "Upgrade Account"
   → Show email/password form

2. User submits form
   → Call convertToFullAccount(email, password)
   → supabase.auth.updateUser({ email, password })
   → Same user_id preserved
   → is_anonymous = false

3. All previous generations still linked
   → User can now sign in from other devices
   → Email notifications enabled
```

---

## Pricing & Payment Integration

### Stripe Checkout with User ID

**File: `src/app/api/checkout/create/route.ts`**

```typescript
export async function POST(req: NextRequest) {
  // Get authenticated user
  const supabase = createClient(...);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { numImages, styleId, customPrompt, promoCode } = await req.json();

  // Calculate price
  let freeImages = 0;
  if (promoCode) {
    const validation = await validatePromoCode(promoCode);
    if (validation.valid) {
      freeImages = validation.promoCode!.free_images;
    }
  }

  const billableImages = Math.max(0, numImages - freeImages);
  const amountInCents = billableImages * 500; // $5 per image

  if (amountInCents === 0) {
    // Free via promo code - process immediately
    const generation = await createGenerationWithPromo({
      num_images: numImages,
      style_id: styleId,
      custom_prompt: customPrompt,
      promo_code: promoCode,
      user_id: user.id, // <-- Link to user
    });

    // Start processing in background
    await triggerGeneration(generation.id);

    return NextResponse.json({
      success: true,
      share_uuid: generation.share_uuid,
    });
  }

  // Create Stripe Checkout Session
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "AI Room Staging",
            description: `${numImages} images, 3 variations each`,
          },
          unit_amount: 500, // $5 per image
        },
        quantity: billableImages,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    metadata: {
      user_id: user.id, // <-- Store user_id in metadata
      num_images: numImages,
      style_id: styleId,
      custom_prompt: customPrompt || "",
      promo_code: promoCode || "",
      free_images: freeImages,
    },
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
```

### Stripe Webhook Handler

**File: `src/app/api/webhooks/stripe/route.ts`**

```typescript
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata!;

    // Create generation with user_id from metadata
    const generation = await supabaseAdmin.from("generations").insert({
      user_id: metadata.user_id, // <-- From Stripe metadata
      num_images: parseInt(metadata.num_images),
      style_id: metadata.style_id,
      custom_prompt: metadata.custom_prompt || null,
      amount_paid: session.amount_total,
      payment_status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      promo_code_used: metadata.promo_code || null,
      status: "pending",
    });

    // Start processing
    await triggerGeneration(generation.data.id);
  }

  return NextResponse.json({ received: true });
}
```

---

## Dashboard Implementation

**File: `src/app/dashboard/page.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/auth";

export default function DashboardPage() {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGenerations() {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error("Not authenticated");
        return;
      }

      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load generations:", error);
      } else {
        setGenerations(data);
      }

      setLoading(false);
    }

    loadGenerations();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">My Generations</h1>

      {generations.length === 0 ? (
        <p>No generations yet. Upload some photos to get started!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generations.map((gen) => (
            <a
              key={gen.id}
              href={`/g/${gen.share_uuid}`}
              className="border rounded-lg p-4 hover:shadow-lg"
            >
              <div className="text-sm text-gray-500">
                {new Date(gen.created_at).toLocaleDateString()}
              </div>
              <div className="font-bold">{gen.num_images} images</div>
              <div className="text-sm">Style: {gen.style_id}</div>
              <div className="text-sm">Status: {gen.status}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Security Best Practices

### 1. Enable CAPTCHA for Anonymous Sign-Ins

To prevent abuse, enable invisible CAPTCHA in Supabase Dashboard:
- Settings → Authentication → CAPTCHA Protection
- Choose reCAPTCHA or Cloudflare Turnstile

### 2. Rate Limiting

Add rate limiting to prevent spam:
```typescript
// In API routes
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"), // 5 requests per hour
});

const identifier = user.id;
const { success } = await ratelimit.limit(identifier);

if (!success) {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

### 3. RLS Policies

Ensure users can only access their own data:
```sql
-- Users can only read their own generations (unless public via share_uuid)
CREATE POLICY "Users read own" ON generations
  FOR SELECT
  USING (auth.uid() = user_id OR share_uuid IS NOT NULL);

-- Users can only read their own images
CREATE POLICY "Users read own images" ON images
  FOR SELECT
  USING (
    generation_id IN (
      SELECT id FROM generations WHERE user_id = auth.uid()
    )
  );
```

---

## Migration Path: Anonymous → Full Account

### Option 1: Email/Password Sign-Up

```typescript
// User clicks "Create Account"
const { error } = await supabase.auth.updateUser({
  email: "user@example.com",
  password: "secure_password",
});

// Supabase sends confirmation email
// User confirms email → is_anonymous removed
// All generations preserved with same user_id
```

### Option 2: OAuth Sign-In

```typescript
// User clicks "Sign in with Google"
const { error } = await supabase.auth.linkIdentity({
  provider: "google",
});

// Links OAuth identity to existing anonymous user
// All generations preserved
```

---

## Next Steps

1. ✅ Enable Anonymous Sign-Ins in Supabase Dashboard
2. ✅ Run database migration (add user_id column)
3. ✅ Create auth.ts helper functions
4. ✅ Update layout.tsx to initialize auth
5. ✅ Update API routes to extract user_id from JWT
6. ✅ Build /dashboard page
7. ✅ Update Stripe integration to include user_id
8. ⏳ Test anonymous user flow
9. ⏳ Test account conversion flow

---

## Resources

- [Supabase Anonymous Sign-Ins Documentation](https://supabase.com/docs/guides/auth/auth-anonymous)
- [JavaScript API Reference - signInAnonymously](https://supabase.com/docs/reference/javascript/auth-signinanonymously)
- [Supabase Auth Blog Post](https://supabase.com/blog/anonymous-sign-ins)
