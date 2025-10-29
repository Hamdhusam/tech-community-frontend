# ✅ Registration Success - Profile Creation Fix

## Good News!

**User account created successfully!** ✅

The user is now in Supabase → Authentication → Users

---

## Issue: Profile Creation Failed

Error: `Invalid API key`

This happens because the profile creation needs proper database permissions.

---

## 🔧 Quick Fix (Run This SQL)

### Step 1: Add INSERT Policy

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Run this SQL:

```sql
-- Add INSERT policy for student_profiles table
CREATE POLICY "Users can insert own profile"
  ON public.student_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

This allows users to create their own profile during registration.

---

## 🎯 Alternative: Check Your Environment Variables

The error might also be because `SUPABASE_SERVICE_ROLE_KEY` is missing or invalid.

### Check .env.local

Make sure you have:
```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # <- This one!
```

### Where to Find Service Role Key

1. Supabase Dashboard → **Settings** → **API**
2. Find **Project API keys** section
3. Copy **service_role** key (it's secret, starts with `eyJ...`)
4. Add to `.env.local`
5. **Restart dev server** (`npm run dev`)

---

## ✅ I've Updated the Code

The profile creation endpoint now:
1. ✅ **Falls back to anon key** if service key missing
2. ✅ **Better error logging** to help debug
3. ✅ **Shows which key is being used**

---

## 🧪 Test Again

### Option 1: Add INSERT Policy (Recommended)
```sql
-- Run in Supabase SQL Editor
CREATE POLICY "Users can insert own profile"
  ON public.student_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Option 2: Add Service Role Key
```bash
# Add to .env.local
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
# Restart: npm run dev
```

Then try registration again!

---

## 📊 What Happens Now

### After Adding INSERT Policy:

1. User registers
2. ✅ User created in auth.users
3. ✅ Profile created in student_profiles
4. ✅ Success message shown
5. ✅ User can log in immediately

---

## 🔍 Verify It Works

### Check User in Supabase

1. **Authentication → Users**
   - Should see: `anjai.cs23@stellamaryscoe.edu.in`
   - Status: Confirmed ✅

2. **Table Editor → student_profiles**
   - Should see profile with all data:
     - full_name: "test" or your actual name
     - email: anjai.cs23@stellamaryscoe.edu.in
     - phone_number: your number
     - student_id: your ID
     - year_of_study, section, branch
     - role: "participant"
     - total_strikes: 0

---

## 📝 Summary

| Step | Status |
|------|--------|
| User registration | ✅ Working |
| Auth account created | ✅ Done |
| Profile creation | ⚠️ Needs fix |

**Fix:** Add INSERT policy or service_role key

---

## 🚀 Next Steps

1. **Run the SQL** to add INSERT policy
2. **Try logging in** with the account you just created
3. **Or register again** (with a different email) to test the full flow

---

**Files Created:**
- `/src/db/add_insert_policy.sql` - Quick fix SQL
- Updated `/src/db/student_profiles.sql` - Now includes INSERT policy

**Run the SQL fix and you're good to go!** 🎉
