// This test endpoint has been removed for security reasons
// All functionality has been verified and integrated into production endpoints
// DO NOT recreate this endpoint in production

export async function GET() {
  return NextResponse.json({
    message: "Test endpoint has been removed",
    note: "All submission functionality is available through authenticated endpoints",
    endpoints: {
      userSubmissions: "GET /api/submissions (requires auth)",
      createSubmission: "POST /api/submissions (requires auth)",
      hasSubmittedToday: "GET /api/submissions/has-submitted-today (requires auth)",
      adminSubmissions: "GET /api/admin/submissions (requires admin role)"
    }
  }, { status: 410 });
}