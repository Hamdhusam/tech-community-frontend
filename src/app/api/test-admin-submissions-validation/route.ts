// This test endpoint has been removed for security reasons
// Date validation functionality has been verified and is integrated in /api/admin/submissions
// DO NOT recreate this endpoint in production

export async function GET() {
  return NextResponse.json({
    message: "Test endpoint has been removed",
    note: "Date validation is integrated in the admin submissions endpoint",
    secureEndpoint: "GET /api/admin/submissions?date=YYYY-MM-DD (requires admin auth)"
  }, { status: 410 });
}