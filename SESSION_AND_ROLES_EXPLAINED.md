# 🔐 Session Management & Role-Based Access - Explained

## How Session Storage Works

Your app uses a **dual-storage** approach for sessions:

### 1. **Client-Side Storage (Browser)**
**Location:** `localStorage` (managed by Supabase)

**What's Stored:**
```javascript
{
  access_token: "eyJhbGc...",     // JWT token (expires in 1 hour)
  refresh_token: "v1.MX...",      // Refresh token (expires in 7 days)
  user: {
    id: "uuid",
    email: "user@example.com",
    user_metadata: { name: "..." }
  }
}
```

**How It Works:**
- Automatically managed by Supabase client
- Used for client-side React components
- Accessible via `useSession()` hook
- Persists across browser refreshes

### 2. **Server-Side Storage (HTTP-only Cookies)**
**Location:** Browser cookies (HTTP-only, secure)

**What's Stored:**
```
sb-access-token=eyJhbGc...    (HTTP-only, 1 hour)
sb-refresh-token=v1.MX...     (HTTP-only, 7 days)
```

**How It Works:**
- Set by `/api/auth/session` endpoint
- HTTP-only = JavaScript cannot access (XSS protection)
- Used by middleware to protect routes
- Synced automatically after login/signup

---

## 🔄 Session Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Signs In                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Supabase Auth validates credentials                     │
│  2. Returns JWT access_token + refresh_token                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  CLIENT-SIDE (Browser)                                      │
│  • Supabase stores in localStorage automatically            │
│  • Access via: useSession() hook                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SYNC TO COOKIES (for middleware)                           │
│  • Call: /api/auth/session (POST)                           │
│  • Stores tokens in HTTP-only cookies                       │
│  • Cookies: sb-access-token, sb-refresh-token               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  MIDDLEWARE (server-side)                                   │
│  • Reads cookies: sb-access-token                           │
│  • Validates with Supabase                                  │
│  • Gets user data from token                                │
│  • Checks role for admin routes                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 👤 How Roles Are Determined

### **Role Storage Locations:**

Your app checks roles in **TWO places**:

#### 1. **Supabase Auth Metadata** (for basic admin checks)
**Location:** `auth.users` table → `user_metadata` or `app_metadata`

**Example:**
```javascript
// In middleware.ts
const role = user?.app_metadata?.role || user?.user_metadata?.role;

if (role === "admin") {
  // Allow access to /admin routes
}
```

**How to Set:**
```sql
-- In Supabase SQL Editor
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@example.com';
```

#### 2. **student_profiles Table** (for detailed role management)
**Location:** `public.student_profiles` table → `role` column

**Values:**
- `participant` (default) - Regular Flexie student
- `class_incharge` - Faculty for specific year/section
- `administrator` - Full system access

**How to Set:**
```sql
UPDATE student_profiles 
SET role = 'administrator' 
WHERE email = 'admin@example.com';
```

---

## 🔍 Where Roles Are Checked

### **1. Middleware (Route Protection)**
**File:** `/middleware.ts`  
**Checks:** `user.app_metadata.role` or `user.user_metadata.role`

```typescript
// Protect /admin routes
if (pathname.startsWith("/admin")) {
  const role = user?.app_metadata?.role;
  if (role !== "admin") {
    // Redirect to dashboard
  }
}
```

**Protected Routes:**
- `/dashboard` - Requires authentication
- `/visualizations` - Requires authentication
- `/admin` - Requires `role = "admin"` in metadata

### **2. Database RLS Policies**
**File:** `/src/db/student_profiles.sql`  
**Checks:** `role` column in `student_profiles` table

```sql
-- Example: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.student_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_profiles
      WHERE user_id = auth.uid()
      AND role = 'administrator'
    )
  );
```

---

## 📊 Complete Session Lifecycle

### **Sign In:**
```
1. User enters email/password
2. authClient.signIn.email() called
3. Supabase validates → returns session
4. Session stored in localStorage (auto)
5. syncSessionToCookies() called
6. Cookies set: sb-access-token, sb-refresh-token
7. User redirected to /dashboard
```

### **Page Load (Protected Route):**
```
1. User visits /dashboard
2. Middleware runs (server-side)
3. Reads sb-access-token from cookies
4. Validates token with Supabase
5. Gets user data from token
6. Checks if user exists
7. If yes → Allow access
8. If no → Redirect to /sign-in
```

### **Admin Route Access:**
```
1. User visits /admin
2. Middleware runs
3. Gets user from token
4. Checks: user.app_metadata.role === "admin"
5. If yes → Allow access
6. If no → Redirect to /dashboard
```

### **Sign Out:**
```
1. authClient.signOut() called
2. Supabase clears localStorage
3. syncSessionToCookies(null) called
4. Cookies deleted
5. User redirected to /sign-in
```

---

## 🔐 Security Features

### **1. HTTP-only Cookies**
```typescript
httpOnly: true,      // JavaScript cannot access
secure: true,        // HTTPS only (production)
sameSite: "lax",     // CSRF protection
```

**Protection:** Prevents XSS attacks from stealing tokens

### **2. Token Expiration**
```
Access Token: 1 hour
Refresh Token: 7 days
```

**Flow:**
- Access token expires → Middleware uses refresh token
- Gets new access token automatically
- User stays logged in seamlessly

### **3. Row Level Security (RLS)**
```sql
-- Users can only see their own profile
USING (auth.uid() = user_id)
```

**Protection:** Database-level access control

---

## 🎯 Making Someone an Admin

### **Method 1: Via Supabase Dashboard** (Easiest)

1. Go to **Authentication → Users**
2. Click on the user
3. Scroll to **User Metadata**
4. Add:
   ```json
   {
     "role": "admin"
   }
   ```
5. Save

### **Method 2: Via SQL**

```sql
-- Set role in auth metadata
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@example.com';

-- Also set in student_profiles
UPDATE student_profiles 
SET role = 'administrator' 
WHERE email = 'admin@example.com';
```

### **Method 3: During First Login**

You can modify the OAuth callback to auto-assign admin to first user:

```typescript
// In /auth/callback/page.tsx
if (user && isFirstUser) {
  // Set as admin
}
```

---

## 📝 Code References

### **Check Session (Client Component):**
```typescript
import { useSession } from '@/lib/auth-client';

function MyComponent() {
  const { data: session, isPending } = useSession();
  
  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not logged in</div>;
  
  return <div>Hello, {session.user.email}!</div>;
}
```

### **Check Role (Client Component):**
```typescript
const { data: session } = useSession();
const isAdmin = session?.user?.app_metadata?.role === 'admin';

if (isAdmin) {
  return <AdminPanel />;
}
```

### **Check Role (Server Component/API):**
```typescript
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  const role = user?.app_metadata?.role;
  
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
}
```

---

## 🔄 Token Refresh Flow

```
Access Token Expires (after 1 hour)
         ↓
Middleware detects expired token
         ↓
Checks for refresh_token cookie
         ↓
Calls Supabase: refreshSession()
         ↓
Gets new access_token
         ↓
Updates cookies
         ↓
User stays logged in
```

**User Experience:** Seamless, no logout needed

---

## 💡 Key Takeaways

1. **Sessions stored in 2 places:**
   - localStorage (client-side, for React)
   - HTTP-only cookies (server-side, for middleware)

2. **Roles stored in 2 places:**
   - `auth.users.app_metadata` (for route protection)
   - `student_profiles.role` (for database queries)

3. **Cookies are synced automatically** after:
   - Sign in
   - Sign up
   - OAuth callback
   - Sign out (cleared)

4. **Middleware checks cookies** to protect routes before page loads

5. **Make someone admin** by setting `role: "admin"` in user metadata

---

**Files to Study:**
- `/src/lib/auth-client.ts` - Session sync logic
- `/middleware.ts` - Cookie-based route protection
- `/src/app/api/auth/session/route.ts` - Cookie management
- `/src/db/student_profiles.sql` - RLS policies

**Admin access requires setting the role in BOTH places for full functionality!**
