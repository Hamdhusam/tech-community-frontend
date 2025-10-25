# 🚀 Quick Start - Supabase Authentication

## TL;DR - Get Started in 3 Steps

```bash
# 1. Get Supabase keys from https://supabase.com/dashboard
#    Settings → API → Copy Project URL and anon key

# 2. Add to .env.local:
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# 3. Start dev server
npm run dev
```

Then visit: http://localhost:3000/sign-up

---

## 📦 What's Included

This project uses **Supabase Authentication**:

- ✅ Email/Password authentication
- ✅ Session management (automatic)
- ✅ User management (Supabase handles tables)
- ✅ Client-side hooks (`useSession`)
- ✅ Server-side auth helpers
- ✅ OAuth ready (Google, GitHub, etc.)

---

## ⚡ Quick Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# View auth configuration
cat src/lib/auth-client.ts

# Check Supabase client setup
cat src/db/index.ts
```

---

## 🔑 Environment Variables Needed

```bash
# Required (get from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Optional (for server-side admin operations)
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Optional (for production)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

---

## 🏗️ Auth Architecture

```
┌─────────────────┐
│   Client Side   │
├─────────────────┤
│ auth-client.ts  │ ← useSession() hook, authClient methods
│ (React hooks)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase JS    │
├─────────────────┤
│  Supabase Auth  │ ← Automatic session management
│   API Calls     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Supabase     │
├─────────────────┤
│   PostgreSQL    │ ← Managed auth tables (auth.users, etc.)
│   + Auth API    │
└─────────────────┘
```

---

## 📝 Usage Examples

### Sign Up a User (Client)

```tsx
import { authClient } from '@/lib/auth-client';

const { data, error } = await authClient.signUp.email({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  name: 'John Doe',
});

if (data) {
  console.log('User created!', data);
}
```

### Sign In (Client)

```tsx
const { data, error } = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'SecurePassword123!',
});
```

### Check Session (Client)

```tsx
'use client'
import { useSession } from '@/lib/auth-client';

function Component() {
  const { data: session, isPending } = useSession();
  
  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not logged in</div>;
  
  return <div>Hello, {session.user.email}!</div>;
}
```

### Sign Out (Client)

```tsx
await authClient.signOut();
```

### Protect API Route (Server)

```tsx
import { getCurrentUser } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return Response.json({ user });
}
```

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| `Invalid API key` | Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` |
| `supabaseUrl is required` | Add `NEXT_PUBLIC_SUPABASE_URL` to `.env.local` |
| `User already registered` | Delete user in Supabase Dashboard → Authentication |
| `Email not confirmed` | Disable confirmation or check email for link |

---

## 🎯 Supabase Dashboard Quick Links

After creating your project at https://supabase.com/dashboard:

- **Get API Keys**: Settings → API
- **View Users**: Authentication → Users
- **Email Settings**: Authentication → Email Templates
- **Add OAuth**: Authentication → Providers (see GOOGLE_OAUTH_SETUP.md)
- **Database**: Database → Table Editor
- **SQL Editor**: Database → SQL Editor

---

## 🚀 Next Steps

### 1. Create Custom Profile Table

```sql
-- Run in Supabase SQL Editor
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );
```

### 2. Add OAuth Providers

Go to Authentication → Providers → Enable Google/GitHub

```tsx
// In your app
const { data } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});
```

### 3. Add File Uploads

Use Supabase Storage:

```tsx
const { data } = await supabase.storage
  .from('avatars')
  .upload('public/avatar.png', file);
```

---

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Full Setup Guide](./AUTHENTICATION_SETUP.md)
- [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md)

---

**Ready to go!** Just add your Supabase credentials to `.env.local` and start the dev server.
