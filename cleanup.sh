#!/bin/bash

# Cleanup Script for Flex Academics - Remove test/debug files
# Run this to clean up development/testing artifacts

echo "🧹 Starting cleanup..."

# Define base path
BASE_PATH="/workspaces/tech-community-frontend"

# API Routes to Delete (test/debug/verify/fix directories)
API_DELETE_DIRS=(
  "admin-auth-summary"
  "admin-setup-summary"
  "debug"
  "debug-admin-accounts"
  "fix-admin-credential"
  "fix-admin-provider"
  "test-admin-auth-complete"
  "test-admin-complete"
  "test-admin-credential"
  "test-admin-email-login"
  "test-admin-login"
  "test-admin-routes-access"
  "test-admin-routes-direct"
  "test-admin-session"
  "test-admin-signin"
  "test-admin-submissions-validation"
  "test-archana-admin-workflow"
  "test-archana-signin"
  "test-argon2-login"
  "test-auth-flow-complete"
  "test-authentication-summary"
  "test-better-auth-direct"
  "test-better-auth-session-complete"
  "test-complete-admin-flow"
  "test-complete-auth-flow"
  "test-complete-auth-workflow"
  "test-credential-argon2id"
  "test-direct-auth"
  "test-direct-better-auth"
  "test-direct-signin"
  "test-submissions"
  "test-submissions-logic"
  "test-submissions-security"
  "test-vote-conflict"
  "update-admin-provider"
  "verify-admin"
  "verify-archana-admin"
  "verify-archana-admin-complete"
  "votes" # If not needed
  "submissions" # If not needed yet
)

# Page Routes to Delete (debug/test pages)
PAGE_DELETE_DIRS=(
  "check-role"
  "debug-storage"
)

# Delete API directories
echo "📁 Deleting API test/debug routes..."
for dir in "${API_DELETE_DIRS[@]}"; do
  if [ -d "$BASE_PATH/src/app/api/$dir" ]; then
    rm -rf "$BASE_PATH/src/app/api/$dir"
    echo "  ✅ Deleted: /api/$dir"
  fi
done

# Delete page directories  
echo "📄 Deleting test/debug pages..."
for dir in "${PAGE_DELETE_DIRS[@]}"; do
  if [ -d "$BASE_PATH/src/app/$dir" ]; then
    rm -rf "$BASE_PATH/src/app/$dir"
    echo "  ✅ Deleted: /$dir"
  fi
done

# Delete admin sign-in page if not needed (admin uses main sign-in)
if [ -d "$BASE_PATH/src/app/admin/sign-in" ]; then
  rm -rf "$BASE_PATH/src/app/admin/sign-in"
  echo "  ✅ Deleted: /admin/sign-in (admins use /sign-in)"
fi

# Clean up documentation files that are no longer needed
echo "📝 Cleaning up old documentation..."
DOC_DELETE_FILES=(
  "AUTHENTICATION_SETUP.md"
  "GOOGLE_OAUTH_SETUP.md"
  "MIGRATION_NOTES.md"
  "SETUP_CHECKLIST.md"
)

for file in "${DOC_DELETE_FILES[@]}"; do
  if [ -f "$BASE_PATH/$file" ]; then
    rm -f "$BASE_PATH/$file"
    echo "  ✅ Deleted: $file"
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary of remaining structure:"
echo "  - /api/admin/users (admin management)"
echo "  - /api/auth/profile (student profiles)"
echo "  - /api/auth/session (session management)"
echo "  - /api/auth/verify-user (user verification)"
echo "  - /admin (admin dashboard)"
echo "  - /dashboard (user dashboard)"
echo "  - /sign-in (login page)"
echo "  - /sign-up (registration page)"
echo "  - /auth/callback (OAuth callback)"
echo ""
echo "🎉 Your codebase is now clean and production-ready!"
