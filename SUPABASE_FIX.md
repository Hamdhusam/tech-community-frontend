# 🔧 Supabase Configuration Fix

## Issue: User Registration Not Working

If you see the signup request go through but user doesn't appear in Supabase, it's because **email confirmation is enabled by default**.

---

## ✅ Quick Fix (RECOMMENDED for Development)

### Disable Email Confirmation in Supabase

1. Open **Supabase Dashboard**
2. Go to **Authentication** → **Providers** → **Email**
3. Find **"Confirm email"** toggle
4. **Turn it OFF** (disable)
5. Click **Save**

![Supabase Email Settings](https://supabase.com/docs/img/auth-providers/email-provider.png)

Now users can register without email confirmation!

---

## 🧪 Test Registration Again

```bash
npm run dev
# Visit: http://localhost:3002/sign-up
```

Try registering with:
- Email: `test@college.edu`
- Password: `test123`
- Fill all other fields

✅ User should now appear in **Authentication → Users**

---

## 📧 Alternative: Configure Email Provider (Production)

If you want email confirmation for production:

### Option 1: Use Supabase Built-in SMTP (Easy)

1. Go to **Project Settings** → **Authentication**
2. Find **SMTP Settings**
3. Use Supabase's built-in email service (limited)
4. Customize email templates in **Authentication** → **Email Templates**

### Option 2: Use Custom SMTP (Recommended)

**Popular providers:**
- Gmail SMTP
- SendGrid
- Amazon SES
- Mailgun
- Resend

**Setup in Supabase:**
1. Go to **Project Settings** → **Authentication**
2. Scroll to **SMTP Settings**
3. Enter your SMTP credentials:
   - Host
   - Port
   - Username
   - Password
   - Sender email

**Example (Gmail):**
```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: your-app-password (not regular password!)
Sender: your-email@gmail.com
```

### Option 3: Disable Email Confirmation (Dev Only)

See "Quick Fix" above.

---

## 🔍 Debugging Registration Issues

### Check Browser Console

```javascript
// Open DevTools → Console
// Look for errors like:
- "Email confirmation required"
- "Email provider not configured"
- "User already registered"
```

### Check Network Tab

```
1. Open DevTools → Network
2. Try registration
3. Look for request to:
   - /auth/v1/signup
4. Check response:
   - Status 200 = Success
   - Status 400 = Validation error
   - Status 422 = Email already exists
```

### Check Supabase Logs

```
1. Go to Supabase Dashboard
2. Logs → Auth Logs
3. Look for signup events
4. Check error messages
```

---

## ⚠️ Common Issues

### Issue 1: "Email already registered"
**Solution:** Email is already in use. Try different email or delete user from Supabase.

### Issue 2: "Email confirmation required"
**Solution:** Disable email confirmation OR configure SMTP.

### Issue 3: "Email provider not configured"
**Solution:** Either disable confirmation or set up SMTP.

### Issue 4: User created but can't login
**Solution:** 
1. Check if email is confirmed (if confirmation enabled)
2. Check password is correct
3. Look for user in Authentication → Users

### Issue 5: Profile not created
**Solution:**
1. Check `student_profiles` table exists
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check Supabase logs for RLS policy errors

---

## 📋 Verification Checklist

After changing settings:

- [ ] Email confirmation disabled (for dev)
- [ ] Test registration with new email
- [ ] User appears in Authentication → Users
- [ ] User has `confirmed_at` timestamp
- [ ] Profile created in `student_profiles` table
- [ ] Can login with email/password
- [ ] Redirects to dashboard

---

## 🎯 Settings Summary

### Development (Recommended)
```
Email Confirmation: OFF
SMTP: Not needed
Auto-confirm: ON
```

### Production
```
Email Confirmation: ON
SMTP: Configured (SendGrid/Gmail/etc)
Auto-confirm: OFF
Email templates: Customized
```

---

## 📞 Still Having Issues?

### Check Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### Test Supabase Connection

```javascript
// In browser console on your site
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
// Should show your URL
```

### Manual User Creation Test

```sql
-- Run in Supabase SQL Editor
-- This tests if auth is working at all
SELECT auth.uid();
-- Should return null if not logged in
```

---

## ✅ Quick Summary

**Problem:** User registration request sent but user not created  
**Cause:** Email confirmation required + no email provider  
**Solution:** Disable email confirmation in Supabase settings  

**Steps:**
1. Supabase → Authentication → Providers → Email
2. Toggle OFF "Confirm email"
3. Save
4. Test registration again

---

**File:** `SUPABASE_FIX.md`  
**Last Updated:** October 25, 2025
