# 🎓 Flex Academics Authentication System

## Overview

This authentication system is designed for the **Flex Academics** self-directed learning program within the Byte Bash Blitz community.

### User Roles
1. **Participant (Flexie)**: Flex Academics student
2. **Class In-charge**: Faculty member responsible for specific year/section classes  
3. **Administrator**: System admin (view all data, manage users)

---

## 🔐 Authentication Methods

### Dual Authentication Support

Users can authenticate using **TWO** methods:

#### 1. Email & Password
- Traditional email/password authentication
- Secure password storage (hashed by Supabase)
- Session management via JWT tokens
- Password reset functionality available

#### 2. Google OAuth
- Sign in with Google account
- Faster authentication flow
- No password management needed
- Automatic profile creation

---

## 📝 User Registration (FR-AUTH-002)

### Required Fields

When participants register, they must provide:

**Personal Information:**
- ✅ Full Name
- ✅ Email Address  
- ✅ Phone Number (for WhatsApp notifications)

**Academic Information:**
- ✅ Student ID
- ✅ Year of Study (1st, 2nd, 3rd, or 4th)
- ✅ Section/Branch
- ✅ Department/Branch (CSE, ECE, IT, etc.)

**Account Security:**
- ✅ Password (minimum 6 characters)
- ✅ Confirm Password

### Registration Flow

```
User visits /sign-up
       ↓
Fills registration form (all required fields)
       ↓
Creates Supabase auth account
       ↓
Creates student_profiles entry in database
       ↓
Redirects to /sign-in
       ↓
User logs in with credentials
       ↓
Access granted to /dashboard
```

---

## 🗄️ Database Schema

### student_profiles Table

```sql
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  
  -- Personal
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  
  -- Academic
  student_id TEXT UNIQUE NOT NULL,
  year_of_study TEXT NOT NULL,
  section TEXT NOT NULL,
  branch TEXT NOT NULL,
  
  -- System
  role TEXT DEFAULT 'participant',
  is_active BOOLEAN DEFAULT true,
  total_strikes INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_submission_date DATE
);
```

### Roles

- `participant`: Regular Flexie student (default)
- `class_incharge`: Faculty member for year/section
- `administrator`: Full system access

---

## 🚀 Setup Instructions

### 1. Run Database Migration

```bash
# In Supabase SQL Editor, run:
/src/db/student_profiles.sql
```

This creates:
- `student_profiles` table
- Row Level Security policies
- Indexes for performance
- Auto-update triggers
- Views for active participants

### 2. Configure Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### 3. Enable Google OAuth (Optional)

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google
3. Add your Google OAuth credentials
4. Set redirect URI: `https://your-project.supabase.co/auth/v1/callback`

### 4. Test Registration

```bash
npm run dev
# Visit http://localhost:3000/sign-up
# Fill in all required fields
# Submit registration
# Log in at http://localhost:3000/sign-in
```

---

## 📋 API Endpoints

### POST /api/auth/profile
**Create student profile during registration**

```typescript
POST /api/auth/profile
Content-Type: application/json

{
  "user_id": "uuid",
  "full_name": "John Doe",
  "email": "john@college.edu",
  "phone_number": "9876543210",
  "student_id": "21BCE1234",
  "year_of_study": "2",
  "section": "A",
  "branch": "CSE"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "profile": { /* profile data */ }
}
```

### GET /api/auth/profile
**Retrieve student profile**

```typescript
GET /api/auth/profile
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "profile": {
    "id": "uuid",
    "full_name": "John Doe",
    "email": "john@college.edu",
    "student_id": "21BCE1234",
    "year_of_study": "2",
    "section": "A",
    "branch": "CSE",
    "role": "participant",
    "total_strikes": 0,
    ...
  }
}
```

### PATCH /api/auth/profile
**Update student profile (limited fields)**

```typescript
PATCH /api/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "phone_number": "9999999999",
  "section": "B"
}
```

---

## 🔒 Security Features

### Row Level Security (RLS) Policies

1. **Users can view their own profile**
   ```sql
   USING (auth.uid() = user_id)
   ```

2. **Users can update their own profile**
   ```sql
   USING (auth.uid() = user_id)
   ```

3. **Administrators can view/update all profiles**
   ```sql
   USING (auth.jwt()->>'role' = 'administrator')
   ```

4. **Class in-charge can view their section**
   ```sql
   WHERE year_of_study = their_year 
   AND section = their_section
   ```

### Password Security
- Passwords hashed using bcrypt (via Supabase)
- Minimum 6 characters required
- Confirmation required during registration

### Session Management
- JWT tokens with expiration
- HTTP-only cookies for middleware
- Auto-refresh tokens
- PKCE flow for OAuth

---

## 📱 WhatsApp Integration

The `phone_number` field is collected specifically for WhatsApp notifications:
- Daily submission reminders
- Strike notifications
- System announcements
- Class updates

**Format:** 10-digit Indian mobile number (no country code in DB)

---

## 🎯 Strike System

The `total_strikes` field tracks penalty points:
- Incremented when daily submission is missed
- Visible to participant and class in-charge
- Used for performance tracking
- Can trigger notifications

---

## 👥 User Management

### Making a User Administrator

```sql
-- In Supabase SQL Editor
UPDATE student_profiles 
SET role = 'administrator' 
WHERE email = 'admin@college.edu';
```

### Making a User Class In-charge

```sql
UPDATE student_profiles 
SET role = 'class_incharge' 
WHERE student_id = '21BCE1234';
```

### Deactivating a User

```sql
UPDATE student_profiles 
SET is_active = false 
WHERE student_id = '21BCE1234';
```

---

## 📊 Views & Queries

### Get All Active Participants

```sql
SELECT * FROM active_participants 
ORDER BY year_of_study, section, full_name;
```

### Get Participants by Year/Section

```sql
SELECT * FROM student_profiles 
WHERE year_of_study = '2' 
AND section = 'A' 
AND is_active = true;
```

### Get High Strike Students

```sql
SELECT full_name, student_id, total_strikes 
FROM student_profiles 
WHERE total_strikes >= 3 
ORDER BY total_strikes DESC;
```

---

## 🔧 Troubleshooting

### "Student ID already registered"
- Each student_id must be unique
- Check if user already exists
- Contact admin to reset if needed

### "Phone number validation failed"
- Must be exactly 10 digits
- No spaces or special characters
- Indian mobile number format

### "Profile not created after registration"
- Check Supabase logs
- Verify service_role_key is set
- Check student_profiles table exists

### Google OAuth not working
- Verify Google credentials in Supabase
- Check redirect URI matches exactly
- Enable Google provider in Supabase

---

## 📚 File Structure

```
/src/app/
  ├── sign-in/page.tsx          # Login page (email + Google)
  ├── sign-up/page.tsx          # Registration page
  └── api/auth/
      ├── profile/route.ts       # Profile CRUD operations
      ├── verify-user/route.ts   # User verification
      └── session/route.ts       # Session management

/src/db/
  └── student_profiles.sql      # Database migration

/src/lib/
  ├── auth.ts                   # Server-side auth helpers
  └── auth-client.ts            # Client-side auth hooks
```

---

## ✅ Acceptance Criteria (FR-AUTH-001)

- [x] Email and password login method
- [x] Google OAuth login method
- [x] Secure password storage (hashed)
- [x] Session management (JWT tokens)
- [x] Password reset functionality (via Supabase)

## ✅ Acceptance Criteria (FR-AUTH-002)

- [x] Full Name field (required)
- [x] Email Address field (required)
- [x] Phone Number field (required, 10 digits)
- [x] Year of Study field (required, dropdown)
- [x] Section/Branch field (required)
- [x] Student ID field (required, unique)
- [x] All fields validated before submission
- [x] Profile data stored in database
- [x] Successful registration redirects to sign-in

---

## 🎓 Next Steps

1. ✅ Set up database (run student_profiles.sql)
2. ✅ Configure Supabase credentials
3. ✅ Test registration flow
4. ✅ Test both login methods
5. ⏳ Implement WhatsApp notification system
6. ⏳ Build admin dashboard for user management
7. ⏳ Implement strike tracking system
8. ⏳ Add daily submission features

---

**Documentation Version:** 1.0  
**Last Updated:** October 25, 2025  
**System:** Flex Academics - Byte Bash Blitz Community
