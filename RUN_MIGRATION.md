# Run Supabase Migration - Add User ID Support

## Option 1: Run in Supabase Dashboard (EASIEST)

1. Go to https://supabase.com/dashboard/project/fxddgmktwyasmhrchkom
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase-migration-add-user-id.sql`
5. Click **Run** (or press Ctrl+Enter)

✅ This is the recommended method

---

## Option 2: Use the SQL file directly

The migration file is ready at: `/home/openclaw/dev/stage-ai/supabase-migration-add-user-id.sql`

Just copy-paste its contents into the Supabase SQL Editor.

---

## What the migration does

1. ✅ Adds `user_id UUID` column to `generations` table
2. ✅ Creates index on `user_id` for fast lookups
3. ✅ Updates RLS policies to allow users to read their own generations
4. ✅ Updates RLS policies for public share links
5. ✅ Updates RLS policies for images

---

## After running the migration

### Enable Anonymous Sign-Ins in Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/fxddgmktwyasmhrchkom
2. Click **Authentication** → **Providers**
3. Scroll down to **Anonymous Sign-Ins**
4. Toggle it **ON**
5. (Optional but recommended) Enable CAPTCHA protection

---

## Verify the migration worked

Run this query in SQL Editor:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'generations'
  AND column_name = 'user_id';
```

Expected result:
```
column_name | data_type | is_nullable
user_id     | uuid      | YES
```

---

## Test anonymous auth works

In your browser console on the app:

```javascript
const { data, error } = await supabase.auth.signInAnonymously();
console.log('User:', data.user);
console.log('Is anonymous:', data.user.is_anonymous);
```

Should output:
```
User: { id: '...', is_anonymous: true, ... }
Is anonymous: true
```
