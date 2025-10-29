# Fix: 500 Internal Server Error on /api/user/profile

## Problem
The `/api/user/profile` endpoint was returning 500 Internal Server Error due to improper better-auth initialization.

## Root Cause
Multiple instances of `betterAuth()` were being created in different API routes:
- `/src/app/api/user/profile/route.ts` 
- `/src/app/api/admin/users/route.ts`

Creating multiple instances of better-auth can cause:
- Database connection issues
- Session management conflicts
- Memory leaks
- Initialization errors

## Solution

### 1. Created Centralized Auth Instance
**File:** `/src/lib/better-auth.ts`

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    provider: "postgres",
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || "fallback-secret-please-change-in-production",
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
});
```

### 2. Updated API Routes to Use Shared Instance

**Before:**
```typescript
import { betterAuth } from "better-auth";

const auth = betterAuth({
  database: {
    provider: "postgres",
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
  },
});
```

**After:**
```typescript
import { auth } from "@/lib/better-auth";
```

### 3. Files Modified
1. ✅ `/src/lib/better-auth.ts` - Created (centralized auth instance)
2. ✅ `/src/app/api/user/profile/route.ts` - Updated to use shared auth
3. ✅ `/src/app/api/admin/users/route.ts` - Updated to use shared auth

## Benefits

### Single Source of Truth
- One auth instance shared across all API routes
- Consistent configuration
- Easier to maintain and update

### Better Performance
- Reduced memory footprint
- Fewer database connections
- Faster initialization

### Improved Reliability
- No conflicts between instances
- Proper session management
- More stable authentication

## Testing

### Test the fix:
1. Navigate to the admin page or any page that calls `/api/user/profile`
2. The endpoint should now return proper data instead of 500 error
3. Check browser console - no more 500 errors
4. Check server logs - no initialization errors

### Expected Response:
```json
{
  "role": "administrator",
  "full_name": "John Doe",
  "email": "john@example.com",
  "student_id": "21B81A05A1"
}
```

## Environment Variables

The following variables are used by better-auth:

```env
# Required
DATABASE_URL=postgresql://user:password@host:port/database

# Optional (uses fallback if not set)
BETTER_AUTH_SECRET=your-secret-key-here
# OR
AUTH_SECRET=your-secret-key-here

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Best Practices for better-auth

### ✅ DO:
- Create a single auth instance in a shared module
- Import and reuse that instance across all API routes
- Configure once, use everywhere

### ❌ DON'T:
- Create multiple `betterAuth()` instances
- Initialize auth in each route file
- Duplicate configuration

## Additional Notes

### Why Use Centralized Auth?
1. **Performance**: Creating auth instances is expensive
2. **Consistency**: All routes use the same configuration
3. **Maintainability**: Update config in one place
4. **Reliability**: Prevents initialization race conditions

### Similar Pattern in Other Libraries
This pattern is common in:
- Prisma Client (`import { prisma } from '@/lib/prisma'`)
- Drizzle ORM (`import { db } from '@/db'`)
- Supabase Client (`import { supabase } from '@/lib/supabase'`)

## Verification Steps

1. ✅ No TypeScript errors
2. ✅ Server restarts successfully  
3. ✅ `/api/user/profile` returns 200 OK
4. ✅ Admin page loads correctly
5. ✅ User roles are retrieved properly

## Related Documentation

- [better-auth Documentation](https://better-auth.com)
- [ROLE_RETRIEVAL_IMPLEMENTATION.md](./ROLE_RETRIEVAL_IMPLEMENTATION.md) - Overall role retrieval architecture

## Status

🟢 **FIXED** - All API routes now use centralized auth instance from `/src/lib/better-auth.ts`
