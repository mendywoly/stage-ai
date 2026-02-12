# Stage AI - User Flow & Session Architecture

## Overview
A system that works **without accounts initially** but can **migrate to accounts later**. Uses device fingerprinting + localStorage to track anonymous users, then connects their history when they sign up.

---

## Phase 1: Anonymous Users (Current MVP)

### User Identification Strategy

**Client-Side Session Token (Device Fingerprint)**
- Generate a unique `session_token` (UUID) on first visit
- Store in `localStorage` as `stageai_session_token`
- Send this token with every API request (via header or cookie)
- Acts as anonymous user identity

**Database Schema Addition**
```sql
-- Add session tracking to generations table
ALTER TABLE generations
ADD COLUMN session_token TEXT, -- Anonymous user identifier
ADD COLUMN user_id UUID REFERENCES auth.users(id), -- For future auth
ADD COLUMN device_fingerprint JSONB; -- Optional: browser/device info

CREATE INDEX idx_generations_session_token ON generations(session_token);
CREATE INDEX idx_generations_user_id ON generations(user_id);
```

---

## User Flow - Anonymous (Phase 1)

### 1. Landing Page Visit
```
User visits site
  → Check localStorage for stageai_session_token
  → If missing: Generate new UUID, store in localStorage
  → Set cookie for server-side tracking
```

### 2. Upload & Payment Flow
```
User uploads 1-5 images + selects style
  → Frontend shows: $5 × num_images = total
  → User can apply promo code (e.g., WELCOME for 1 free image)

Option A: Promo Code Applied
  → Validate promo code
  → Create generation with payment_status='promo'
  → Attach session_token to generation
  → Start processing immediately
  → Redirect to results page: /g/[share_uuid]

Option B: Stripe Payment Required
  → Create Stripe Checkout Session
  → Create generation with payment_status='pending'
  → Attach session_token to generation
  → Store checkout_session_id in generation
  → Redirect to Stripe
  → After payment: Stripe webhook updates payment_status='paid'
  → Start processing
  → Redirect to results page: /g/[share_uuid]
```

### 3. Results Page (`/g/[share_uuid]`)
```
User lands on /g/abc123def456
  → Fetch generation by share_uuid (public access)
  → Show:
    - Original uploaded images
    - 3 staged variations per image
    - Download buttons
    - Share button (copy link)

  → If session_token matches owner:
    - Show "Your Generation" badge
    - Add to "My Generations" list
```

### 4. Dashboard (`/dashboard`)
```
User visits /dashboard (no login required)
  → Read session_token from localStorage
  → Fetch all generations WHERE session_token = current_token
  → Display:
    - All previous generations
    - Payment history
    - Total spent
    - Quick access to each /g/[share_uuid] link
```

---

## Phase 2: Optional User Accounts

### Why Add Accounts?
- Sync generations across devices
- Email notifications when processing completes
- Saved payment methods
- Promo code creation (for business users)

### Migration Strategy

**Database Schema**
```sql
-- Supabase Auth is already built-in
-- Just need to link generations to auth.users

-- Function to migrate anonymous sessions to user account
CREATE OR REPLACE FUNCTION migrate_session_to_user(
  p_session_token TEXT,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE generations
  SET
    user_id = p_user_id,
    session_token = NULL -- Clear session token after migration
  WHERE session_token = p_session_token
    AND user_id IS NULL; -- Only migrate unclaimed generations

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**User Flow with Accounts**
```
Anonymous user clicks "Sign Up" or "Sign In"
  → Supabase Auth (email/password or OAuth)
  → On successful login:
    - Read session_token from localStorage
    - Call API: /api/user/migrate-sessions
    - Backend runs: migrate_session_to_user(session_token, user_id)
    - All previous generations now tied to user account
    - Clear session_token from localStorage
  → Now /dashboard shows generations across all devices
```

---

## Implementation Plan

### Step 1: Add Session Token to Frontend (Next.js)
**File: `src/lib/sessionToken.ts`**
```typescript
export function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') return '';

  const existing = localStorage.getItem('stageai_session_token');
  if (existing) return existing;

  const newToken = crypto.randomUUID();
  localStorage.setItem('stageai_session_token', newToken);
  return newToken;
}

export function clearSessionToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('stageai_session_token');
  }
}
```

### Step 2: Update Database Schema
Run SQL migration to add `session_token` and `user_id` columns to `generations` table.

### Step 3: Update API Routes
**File: `src/app/api/stage/route.ts`**
- Accept `session_token` from request headers or body
- Attach to generation record when creating

**File: `src/app/api/checkout/route.ts`** (Stripe integration)
- Accept `session_token` and attach to generation
- Store in Stripe metadata for webhook handling

### Step 4: Build Dashboard
**File: `src/app/dashboard/page.tsx`**
- Read `session_token` from localStorage
- Fetch all generations for this session
- Display as grid/list with links to `/g/[uuid]`

### Step 5: Update Results Page
**File: `src/app/g/[uuid]/page.tsx`**
- Check if current `session_token` matches generation owner
- Show special UI for owner (edit, delete, etc.)

---

## Pricing & Payment Logic

### Pricing Rules
- **$5 per image uploaded**
- Example: Upload 3 images → $15 total → Get 9 results (3 variations × 3 images)

### Promo Code Logic
- `free_images: 1` means **1 uploaded image is free** (not 1 result)
- User uploads 3 images + applies WELCOME code:
  - 1 image free (promo)
  - 2 images × $5 = $10 to pay
  - Total: $10 via Stripe

### Implementation in API
```typescript
// Pseudo-code for /api/checkout/create
const numImages = uploadedImages.length;
const promoCode = await validatePromoCode(promoCodeInput);

let freeImages = 0;
if (promoCode.valid) {
  freeImages = Math.min(promoCode.free_images, numImages);
}

const billableImages = numImages - freeImages;
const amountInCents = billableImages * 500; // $5 = 500 cents

if (amountInCents === 0) {
  // Fully covered by promo - skip Stripe, process immediately
  await createGenerationWithPromo({ ... });
  await triggerGeneration(generationId);
} else {
  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'AI Room Staging' },
        unit_amount: 500,
      },
      quantity: billableImages,
    }],
    metadata: {
      session_token: sessionToken,
      promo_code: promoCode.code,
      num_images: numImages,
      free_images: freeImages,
    },
  });
}
```

---

## Database Schema Updates Needed

```sql
-- Add session tracking columns
ALTER TABLE generations
ADD COLUMN IF NOT EXISTS session_token TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS device_fingerprint JSONB;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_generations_session_token ON generations(session_token);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);

-- Migration function
CREATE OR REPLACE FUNCTION migrate_session_to_user(
  p_session_token TEXT,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE generations
  SET
    user_id = p_user_id,
    session_token = NULL
  WHERE session_token = p_session_token
    AND user_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Privacy & Security Considerations

### Session Token Security
- Use `httpOnly` cookie for server-side tracking (prevents XSS)
- Store in localStorage for client-side (can be stolen, but only loses anonymous history)
- Regenerate token on suspicious activity

### Data Ownership
- Generation `share_uuid` is public (anyone with link can view)
- Only owner (via session_token or user_id) can delete/edit
- After 30 days, anonymous sessions can be purged (GDPR compliance)

### GDPR Compliance
- Anonymous users: No PII collected (just UUID token)
- If user signs up: Follow standard auth data policies
- Allow users to request data deletion

---

## Next Steps

1. **Add session_token column to database** ✅ (SQL migration)
2. **Implement sessionToken.ts helper** ✅ (Client-side)
3. **Update /api/stage to accept session_token** ✅ (Backend)
4. **Build /dashboard page** (Show user's generations)
5. **Implement Stripe Checkout** (Payment flow)
6. **Build /api/webhooks/stripe** (Handle payment completion)
7. **Update /g/[uuid] page** (Check if user is owner)
8. **[Future] Add Supabase Auth** (Optional accounts)
9. **[Future] Build /api/user/migrate-sessions** (Link anonymous history)

---

## Questions to Resolve

1. **Should we use httpOnly cookie OR localStorage for session_token?**
   - Cookie: More secure (XSS-resistant), works server-side
   - localStorage: Easier for SPA, but vulnerable to XSS
   - **Recommendation: Use BOTH** - Cookie for server auth, localStorage as backup

2. **When to start processing?**
   - Option A: After payment confirmed (webhook)
   - Option B: Immediately after Checkout Session created (optimistic)
   - **Recommendation: After webhook** - Don't process unpaid jobs

3. **How to handle partial promo codes?**
   - User uploads 5 images, promo covers 1 → Pay for 4
   - **Current approach: Works as designed** ✅

4. **Device fingerprinting - do we need it?**
   - Could use browser fingerprint library (FingerprintJS)
   - Helps detect same user across cleared localStorage
   - **Recommendation: Skip for MVP, add later if needed**

---

## File Structure

```
src/
├── lib/
│   ├── sessionToken.ts          # NEW: Client-side session management
│   ├── supabase.ts              # Existing: DB helpers
│   └── stripe.ts                # NEW: Stripe client
├── app/
│   ├── api/
│   │   ├── stage/route.ts       # UPDATE: Accept session_token
│   │   ├── checkout/
│   │   │   └── route.ts         # NEW: Create Stripe Checkout
│   │   ├── webhooks/
│   │   │   └── stripe/route.ts  # NEW: Handle payment events
│   │   └── user/
│   │       └── migrate-sessions/route.ts  # FUTURE: Link sessions to account
│   ├── dashboard/
│   │   └── page.tsx             # NEW: Show user's generations
│   └── g/
│       └── [uuid]/
│           └── page.tsx         # UPDATE: Check if owner
```
