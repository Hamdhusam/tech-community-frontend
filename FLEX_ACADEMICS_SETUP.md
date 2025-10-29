# 🚀 Quick Setup Guide - Flex Academics Authentication

## ✅ What's Implemented

Your authentication system now supports:
- ✅ **Email & Password** login
- ✅ **Google OAuth** login  
- ✅ **Comprehensive registration** form with student details
- ✅ **Student profiles** database
- ✅ **Role-based access** (Participant, Class In-charge, Administrator)

---

## ⚡ 3-Minute Setup

### Step 1: Run Database Migration (1 min)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste contents of:
   ```
   /src/db/student_profiles.sql
   ```
3. Click **RUN** to create the student_profiles table
4. ✅ You should see "Success. No rows returned"

### Step 2: Start Development Server (30 sec)

```bash
npm run dev
```

Visit: `http://localhost:3000`

### Step 3: Test Registration (1 min)

1. Go to `http://localhost:3000/sign-up`
2. Fill in ALL required fields:
   - Full Name: `Test Student`
   - Email: `test@college.edu`
   - Phone: `9876543210`
   - Student ID: `21BCE1234`
   - Year: `2nd Year`
   - Section: `A`
   - Branch: `Computer Science Engineering`
   - Password: `test123` (min 6 chars)
   - Confirm Password: `test123`
3. Click "Create Flexie Account"
4. Should redirect to sign-in page

### Step 4: Test Login (30 sec)

1. At `/sign-in`, enter:
   - Email: `test@college.edu`
   - Password: `test123`
2. Click "Sign in with Email"
3. ✅ Should redirect to `/dashboard`

---

## 🎯 Testing Checklist

### Email/Password Login
- [ ] Can register new account with all fields
- [ ] Registration validates 10-digit phone number
- [ ] Registration checks password match
- [ ] Student ID must be unique
- [ ] Can log in with email/password
- [ ] Redirects to /dashboard after login

### Google OAuth Login
- [ ] "Continue with Google" button visible
- [ ] Clicking redirects to Google (if configured)
- [ ] After Google auth, creates profile
- [ ] Redirects to /dashboard

### Profile Data
- [ ] All fields saved in student_profiles table
- [ ] Can view profile in Supabase dashboard
- [ ] Default role is 'participant'
- [ ] total_strikes starts at 0

---

## 📋 Registration Form Fields

### Personal Information
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Full Name | Text | Any string | ✅ |
| Email | Email | Valid email format | ✅ |
| Phone Number | Tel | Exactly 10 digits | ✅ |

### Academic Information
| Field | Type | Options | Required |
|-------|------|---------|----------|
| Student ID | Text | Unique | ✅ |
| Year of Study | Select | 1st, 2nd, 3rd, 4th | ✅ |
| Section | Text | 1-2 chars (auto uppercase) | ✅ |
| Branch | Select | CSE, ECE, IT, AI-ML, etc. | ✅ |

### Account Security
| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Password | Password | Min 6 characters | ✅ |
| Confirm Password | Password | Must match password | ✅ |

---

## 🗄️ Database Verification

After registration, check Supabase:

### 1. Check auth.users table
```
Authentication → Users
```
Should see new user with email

### 2. Check student_profiles table
```
Table Editor → student_profiles
```
Should see row with all student data:
- user_id (matches auth.users)
- full_name, email, phone_number
- student_id, year_of_study, section, branch
- role = 'participant'
- total_strikes = 0

---

## 👥 Make Yourself Administrator

After registering and logging in once:

```sql
-- Run in Supabase SQL Editor
UPDATE student_profiles 
SET role = 'administrator' 
WHERE email = 'your-email@college.edu';
```

Then in `auth.users` metadata:
```json
{
  "role": "administrator"
}
```

---

## 🎨 UI Changes Summary

### Sign-In Page (`/sign-in`)
**Before:** Google OAuth only  
**After:** Email/Password form + Google OAuth button

### Sign-Up Page (`/sign-up`)
**Before:** Disabled with redirect  
**After:** Full registration form with:
- 3 sections (Personal, Academic, Security)
- 10 required fields
- Validation & error messages
- Dropdown selectors for year/branch

---

## 📂 New Files Created

1. **`/src/db/student_profiles.sql`**
   - Database migration for student profiles
   - RLS policies for security
   - Indexes and triggers

2. **`/src/app/api/auth/profile/route.ts`**
   - POST: Create profile (called during registration)
   - GET: Fetch user profile
   - PATCH: Update profile fields

3. **`/FLEX_ACADEMICS_AUTH.md`**
   - Complete documentation
   - API reference
   - Security details

4. **`/FLEX_ACADEMICS_SETUP.md`** (this file)
   - Quick setup guide
   - Testing checklist

---

## 📂 Modified Files

1. **`/src/app/sign-in/page.tsx`**
   - Added email/password form
   - Kept Google OAuth button
   - Updated UI text

2. **`/src/app/sign-up/page.tsx`**
   - Complete rewrite with full form
   - All 10 required fields
   - Field validation
   - Profile creation

3. **`/src/app/api/auth/verify-user/route.ts`**
   - Removed whitelist check
   - Allows all authenticated users
   - No user deletion

---

## 🔧 Environment Variables Required

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # Required for profile creation
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Student ID already registered"
**Solution:** Each student_id must be unique. Use different ID or delete old record.

### Issue: "Failed to save profile data"
**Solution:** 
- Check SUPABASE_SERVICE_ROLE_KEY is set
- Verify student_profiles table exists
- Check Supabase logs for errors

### Issue: "Phone number validation failed"
**Solution:** Must be exactly 10 digits, numbers only (e.g., `9876543210`)

### Issue: "Passwords do not match"
**Solution:** Confirm password field must match password exactly

### Issue: Can't select year/branch
**Solution:** Click the dropdown, don't type. Select from the list.

---

## 🎯 Next Steps

### Immediate
- [x] Run student_profiles.sql migration
- [x] Test registration flow
- [x] Test login (both methods)
- [x] Verify profile data in Supabase

### Soon
- [ ] Make yourself administrator
- [ ] Add more students via registration
- [ ] Test RLS policies
- [ ] Build admin dashboard

### Future
- [ ] Implement WhatsApp notifications
- [ ] Build strike tracking system
- [ ] Create daily submission features
- [ ] Add class in-charge dashboard
- [ ] Build analytics/reporting

---

## 📞 Support

- **Full Documentation:** `/FLEX_ACADEMICS_AUTH.md`
- **Database Schema:** `/src/db/student_profiles.sql`
- **API Endpoints:** `/src/app/api/auth/profile/route.ts`

---

**Status:** ✅ Ready for Testing  
**Setup Time:** ~3 minutes  
**System:** Flex Academics - Byte Bash Blitz Community
