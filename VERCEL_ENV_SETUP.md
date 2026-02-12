# Vercel Environment Variables Setup

After deploying to Vercel, add these environment variables in your project settings:

## Go to Vercel Dashboard
1. https://vercel.com/dashboard
2. Select your `stage-ai` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable below

---

## Required Environment Variables

### Gemini API
```
GEMINI_API_KEY=AIzaSyBIx3cTTWKo9NQE_1BcpXJU_uqj-1DToIA
```
- **Environments**: Production, Preview, Development

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://fxddgmktwyasmhrchkom.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZGRnbWt0d3lhc21ocmNoa29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDAxMDQsImV4cCI6MjA4NjQ3NjEwNH0.ZJyeONlhAAkjWeMClILB-XO-487mGvYFecVLPCPrbUQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZGRnbWt0d3lhc21ocmNoa29tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwMDEwNCwiZXhwIjoyMDg2NDc2MTA0fQ.HvZ6js0yBHjxaRQMZPNBUGzZL8ueveQb2NfMczwSUZA
```
- **Environments**: Production, Preview, Development

### Stripe (to be added later)
```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```
- **Environments**: Production, Preview, Development

### Temporary Auth (optional - can be removed later)
```
AUTH_PASSWORD=stageai2026
```
- **Environments**: Production, Preview, Development

---

## Quick Copy-Paste for Vercel CLI

If you have Vercel CLI authenticated, you can run:

```bash
cd /home/openclaw/dev/stage-ai

# Add Gemini API key
vercel env add GEMINI_API_KEY production
# Paste: AIzaSyBIx3cTTWKo9NQE_1BcpXJU_uqj-1DToIA

# Add Supabase URL
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste: https://fxddgmktwyasmhrchkom.supabase.co

# Add Supabase Anon Key
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZGRnbWt0d3lhc21ocmNoa29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDAxMDQsImV4cCI6MjA4NjQ3NjEwNH0.ZJyeONlhAAkjWeMClILB-XO-487mGvYFecVLPCPrbUQ

# Add Supabase Service Role Key
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZGRnbWt0d3lhc21ocmNoa29tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwMDEwNCwiZXhwIjoyMDg2NDc2MTA0fQ.HvZ6js0yBHjxaRQMZPNBUGzZL8ueveQb2NfMczwSUZA

# Add temp auth password
vercel env add AUTH_PASSWORD production
# Paste: stageai2026

# Repeat for preview and development environments if needed
```

---

## After Adding Environment Variables

1. **Redeploy** your app (Vercel will automatically redeploy after adding env vars)
2. Or trigger a new deployment: `vercel --prod`

---

## Verify Environment Variables

Once deployed, you can verify by checking:
- Vercel Dashboard → Project → Settings → Environment Variables
- All variables should show as "Redacted" for security

---

## Security Note

⚠️ **IMPORTANT**: Never commit `.env` file to git. It's already in `.gitignore`.
