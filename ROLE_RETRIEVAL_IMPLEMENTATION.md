# Role Retrieval Implementation - student_profiles Table

## Overview
This document describes the proper implementation for retrieving user roles from the `student_profiles` table using **Supabase Authentication**.

## Architecture

### Authentication System
The application uses **Supabase Auth** for user authentication and session management.

### Database Schema
The system uses Supabase with the following key tables:
- **`auth.users`** (Supabase Auth) - Stores authentication data (id, email, etc.)
- **`student_profiles`** (public) - Stores role and profile information linked to auth.users.id

### Role Storage
User roles are stored in the `student_profiles` table with the following possible values:
- `participant` (default)
- `class_incharge`
- `administrator`

## Implementation Details

### 1. User Profile API (`/api/user/profile`)
**File:** `/src/app/api/user/profile/route.ts`

This endpoint retrieves the current user's profile and role:

```typescript
// Uses better-auth for session management
const session = await auth.api.getSession({ headers: await headers() });

// Queries student_profiles table
const { data: profile, error } = await supabase
  .from("student_profiles")
  .select("role, full_name, email, student_id")
  .eq("user_id", userId)
  .single();
```

**Response:**
```json
{
  "role": "administrator",
  "full_name": "John Doe",
  "email": "john@example.com",
  "student_id": "21B81A05A1"
}
```

### 2. Admin Users API (`/api/admin/users`)
**File:** `/src/app/api/admin/users/route.ts`

This endpoint is protected and only accessible to administrators.

#### Authentication Flow:
1. **Session Verification** - Uses better-auth to get current session
2. **Role Verification** - Queries `student_profiles` table to check if user has `administrator` role
3. **Access Control** - Returns 403 Forbidden if user is not an administrator

#### Key Functions:

**`verifyAdmin()` Helper:**
```typescript
async function verifyAdmin(request: NextRequest) {
  // 1. Get session from better-auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { isAdmin: false, error: 'No active session', userId: null };
  }

  // 2. Query student_profiles for role
  const { data: profile, error } = await supabase
    .from('student_profiles')
    .select('role, full_name, email')
    .eq('user_id', userId)
    .single();

  // 3. Verify administrator role
  if (profile.role !== 'administrator') {
    return { isAdmin: false, error: 'Insufficient permissions' };
  }

  return { isAdmin: true, userId, userEmail: profile.email };
}
```

#### GET Method (Retrieve All Users):
- Verifies admin access using `verifyAdmin()`
- Fetches all records from `student_profiles` table
- Adds default values for strikes and status
- Logs admin access for audit purposes

#### PATCH Method (Update User):
- Verifies admin access
- Validates input data (status, strikes)
- Updates specific user in `student_profiles` table
- Logs modification for audit trail

### 3. Admin Page (Client Side)
**File:** `/src/app/admin/page.tsx`

The admin page uses React hooks to manage authentication and authorization:

```typescript
// 1. Get session from better-auth
const { data: session, isPending } = useSession();

// 2. Fetch current user's role
useEffect(() => {
  const fetchCurrentUserRole = async () => {
    const response = await fetch('/api/user/profile');
    if (response.ok) {
      const data = await response.json();
      setCurrentUserRole(data.role);
    }
  };
  
  if (session?.user) {
    fetchCurrentUserRole();
  }
}, [session]);

// 3. Fetch users if administrator
useEffect(() => {
  const fetchUsers = async () => {
    const response = await fetch('/api/admin/users');
    if (response.ok) {
      const data = await response.json();
      setUsers(data.users || []);
    }
  };

  if (session?.user && currentUserRole === "administrator") {
    fetchUsers();
  }
}, [session, currentUserRole]);

// 4. Redirect non-admins
useEffect(() => {
  if (!session?.user) {
    router.push("/sign-in");
  } else if (currentUserRole !== null && currentUserRole !== "administrator") {
    router.push("/dashboard");
  }
}, [session, currentUserRole]);
```

## Security Features

### 1. Row Level Security (RLS)
The `student_profiles` table has RLS policies:
- Users can view their own profile
- Administrators can view all profiles
- Class in-charge can view their section

### 2. API Protection
All admin endpoints verify:
- Valid better-auth session
- User exists in `student_profiles`
- User has `administrator` role

### 3. Audit Logging
All admin actions are logged with:
```typescript
console.log('✅ Admin data access', {
  admin_id: authResult.userId,
  admin_email: authResult.userEmail,
  admin_name: authResult.userName,
  action: 'VIEW_ALL_USERS',
  record_count: usersWithDefaults.length,
  timestamp: new Date().toISOString()
});
```

## Data Flow

```
Client Request
    ↓
Better-Auth Session Check
    ↓
Query student_profiles.role
    ↓
Verify role = 'administrator'
    ↓
Grant/Deny Access
    ↓
Return Data (if authorized)
```

## Environment Variables Required

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database Connection
DATABASE_URL=postgresql://user:password@host:port/database
```

## Testing

### Test Admin Access:
1. Sign in with admin account
2. Navigate to `/admin`
3. Should see user list and admin controls

### Test Non-Admin Access:
1. Sign in with regular user account
2. Navigate to `/admin`
3. Should be redirected to `/dashboard`

### Test API Directly:
```bash
# Get user profile (requires valid session cookie)
curl http://localhost:3000/api/user/profile

# Get all users (requires admin role)
curl http://localhost:3000/api/admin/users
```

## Common Issues & Solutions

### Issue: "Unauthorized. Admin access required"
**Cause:** User's role in `student_profiles` is not 'administrator'
**Solution:** Update the role in database:
```sql
UPDATE student_profiles 
SET role = 'administrator' 
WHERE email = 'admin@example.com';
```

### Issue: "Profile not found"
**Cause:** User exists in `user` table but not in `student_profiles`
**Solution:** Create profile entry:
```sql
INSERT INTO student_profiles (
  user_id, full_name, email, student_id, 
  year_of_study, section, branch, phone_number, role
) VALUES (
  'user_id_here', 'Admin Name', 'admin@example.com', 'ADMIN001',
  'IV', 'A', 'CSE', '1234567890', 'administrator'
);
```

### Issue: Session not persisting
**Cause:** Better-auth session cookie issues
**Solution:** 
1. Check better-auth configuration in `/src/lib/auth-client.ts`
2. Verify `DATABASE_URL` is correctly set
3. Clear cookies and sign in again

## Files Modified

1. `/src/app/api/admin/users/route.ts` - Updated to use better-auth and student_profiles
2. `/src/app/api/user/profile/route.ts` - Already implemented correctly
3. `/src/app/admin/page.tsx` - Already using proper role retrieval

## Migration Notes

If migrating from old auth system:
1. Ensure all users have entries in `student_profiles` table
2. Set appropriate roles for administrators
3. Test admin access with multiple user accounts
4. Verify audit logs are working

## Conclusion

The implementation properly retrieves roles from the `student_profiles` table using:
- **better-auth** for session management
- **Supabase** for database queries
- **RLS policies** for data security
- **Audit logging** for tracking admin actions

All admin operations are now secured by verifying the user's role in the `student_profiles` table.
