# StageAI Setup Guide

This guide will walk you through setting up Supabase and Stripe for the StageAI production flow.

---

## 1. Supabase Setup

### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign in and create a new project
3. Choose a name (e.g., "stageai-production")
4. Wait for the project to finish setting up

### Run the SQL Schema
1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `supabase-schema.sql` from this repo
4. Paste it into the SQL editor
5. Click **"Run"**
   - This creates the `generations` and `images` tables
   - Sets up RLS policies
   - Creates the `stage-images` storage bucket

### Get Your API Keys
1. Go to **Project Settings** → **API** (in left sidebar)
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (click "Reveal" to see it)

### Update `.env`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
```

---

## 2. Stripe Setup

### Create a Stripe Account
1. Go to [stripe.com/register](https://stripe.com/register)
2. Sign up (use test mode for development)

### Get Your API Keys
1. Go to **Developers** → **API keys** in your Stripe dashboard
2. Copy these values:
   - **Publishable key** (starts with `pk_test_`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (starts with `sk_test_`, click "Reveal") → `STRIPE_SECRET_KEY`

### Set Up Webhook (for production)
1. Go to **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`) → `STRIPE_WEBHOOK_SECRET`

### Update `.env`
```bash
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

---

## 3. Final `.env` File

Your complete `.env` should look like:

```bash
GEMINI_API_KEY=AIzaSyBIx3cTTWKo9NQE_1BcpXJU_uqj-1DToIA

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 4. Test the Setup

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Upload a room photo and proceed to checkout
3. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

4. After payment, you should:
   - See the AI generation happen
   - Get a unique shareable link like `/g/abc123...`
   - Be able to view/download the staged images

---

## 5. Production Deployment Checklist

When you're ready to go live:

- [ ] Switch Stripe from **Test mode** to **Live mode** in your Stripe dashboard
- [ ] Update `.env` with **live** Stripe keys (starts with `pk_live_` and `sk_live_`)
- [ ] Set up the webhook endpoint with your production domain
- [ ] Update `STRIPE_WEBHOOK_SECRET` with the production webhook secret
- [ ] Deploy to Vercel/your hosting platform
- [ ] Test end-to-end with a real card (you can refund yourself after testing)

---

## Troubleshooting

**Supabase connection error?**
- Double-check your project URL and keys in `.env`
- Make sure you ran the SQL schema

**Stripe checkout not working?**
- Check browser console for errors
- Verify your publishable key is correct
- Make sure you're using a test card in test mode

**Images not uploading?**
- Verify the `stage-images` bucket was created in Supabase Storage
- Check that RLS policies are set up correctly

Need help? Check the server logs with `tail -f /tmp/nextdev.log`
