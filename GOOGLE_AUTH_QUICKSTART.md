# 🚀 Google OAuth Quick Start Guide

## What Changed?

Your authentication is now **Google OAuth only** with an email whitelist system:
- ❌ No more email/password signup
- ✅ Only authorized Gmail addresses can log in
- ✅ Unauthorized login attempts are automatically rejected and cleaned up

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Run the SQL Migration
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `/src/db/authorized_emails.sql`
4. **IMPORTANT**: Edit line 57 to add YOUR Gmail address:
   ```sql
   VALUES ('your-actual-gmail@gmail.com', 'Initial admin user', true)
   ```
5. Click **Run** to create the table

### Step 2: Enable Google OAuth in Supabase
1. Go to **Authentication** → **Providers** in Supabase
2. Find **Google** and click to enable it
3. You'll need Google OAuth credentials (see below)

### Step 3: Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
5. Configure consent screen if prompted (use your email)
6. For Application type, choose **Web application**
7. Add this to **Authorized redirect URIs**:
   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```
   (Replace YOUR-PROJECT-REF with your actual Supabase project reference)
8. Click **Create**
9. Copy the **Client ID** and **Client Secret**

### Step 4: Add Credentials to Supabase
1. Back in Supabase → **Authentication** → **Providers** → **Google**
2. Paste your **Client ID**
3. Paste your **Client Secret**
4. Click **Save**

### Step 5: Make Yourself an Admin
After your first login:
1. In Supabase, go to **Authentication** → **Users**
2. Find your user (the one you just logged in with)
3. Click on your user
4. Under **User Metadata** or **App Metadata**, add:
   ```json
   {
     "role": "admin"
   }
   ```
5. Save changes

---

## 🧪 Testing

### Test Authorized Access
1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/sign-in`
3. Click "Continue with Google"
4. Sign in with the Gmail you added to authorized_emails
5. ✅ Should redirect to /dashboard successfully

### Test Unauthorized Access
1. Try logging in with a different Gmail (not in authorized_emails)
2. ❌ Should see error: "The email is not authorized..."
3. User should NOT appear in Supabase → Authentication → Users

---

## 👥 Adding More Users

### Option 1: SQL (Quick)
```sql
INSERT INTO public.authorized_emails (email, notes, is_active)
VALUES 
  ('teammate1@gmail.com', 'Team member', true),
  ('teammate2@gmail.com', 'Team member', true);
```

### Option 2: API (If you're an admin)
```javascript
// Use this in your browser console or admin panel
const response = await fetch('/api/auth/authorized-emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newuser@gmail.com',
    notes: 'New team member'
  })
});
```

---

## 📋 Files Changed

### Modified
- ✏️ `/src/app/sign-in/page.tsx` - Now shows only Google sign-in button
- ✏️ `/src/app/sign-up/page.tsx` - Disabled with redirect message
- ✏️ `/src/app/api/auth/verify-user/route.ts` - Checks authorized_emails table
- ✏️ `/AUTHENTICATION_SETUP.md` - Updated documentation

### Created
- ✨ `/src/db/authorized_emails.sql` - Database migration for whitelist
- ✨ `/src/app/api/auth/authorized-emails/route.ts` - Admin API to manage whitelist

---

## 🔐 How It Works

```
User clicks "Sign in with Google"
         ↓
Google OAuth login page
         ↓
User authorizes
         ↓
Redirects to /auth/callback
         ↓
System checks: Is email in authorized_emails?
         ↓
    ├─ YES → Login successful → /dashboard
    └─ NO  → Delete user → Show error
```

---

## 💡 Pro Tips

1. **Add your email first** before testing login
2. **Set yourself as admin** to manage other users
3. **Use the API endpoint** to build an admin panel for managing authorized emails
4. **Backup your authorized_emails** table regularly
5. **Monitor Supabase logs** for unauthorized login attempts

---

## ⚠️ Important Notes

- Only **Gmail addresses** will work (unless you add other OAuth providers)
- Users cannot self-register - you must add them to authorized_emails
- Unauthorized users are **automatically deleted** from Supabase
- The sign-up page is disabled but still exists (shows a message)
- You need the **service_role key** in .env.local for user deletion to work

---

## 🆘 Troubleshooting

**"Google OAuth not enabled"**
→ Go to Supabase → Authentication → Providers and enable Google

**"Not authorized to access this platform"**
→ Add the Gmail to authorized_emails table with is_active=true

**"Redirect URI mismatch"**
→ Make sure the redirect URI in Google Console matches Supabase exactly

**Can't delete unauthorized users**
→ Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local

---

## 📚 Full Documentation

See `AUTHENTICATION_SETUP.md` for complete details.
