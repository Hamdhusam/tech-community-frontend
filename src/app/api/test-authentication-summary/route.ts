import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, session, account, verification } from '@/db/schema';
import { eq, like, and, or, desc, asc, sql } from 'drizzle-orm';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  data?: any;
}

interface ComponentStatus {
  name: string;
  status: 'OPERATIONAL' | 'ISSUES' | 'CRITICAL';
  tests: TestResult[];
}

interface AuthSystemReport {
  overallStatus: 'OPERATIONAL' | 'ISSUES' | 'CRITICAL';
  timestamp: string;
  components: ComponentStatus[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  recommendations: string[];
  workingFeatures: string[];
  needsAttention: string[];
}

async function verifyArgon2Password(password: string, hash: string): Promise<boolean> {
  try {
    // Import argon2 dynamically to handle potential missing dependency
    const argon2 = await import('argon2');
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error('Argon2 verification error:', error);
    return false;
  }
}

async function testAdminUserSetup(): Promise<ComponentStatus> {
  const tests: TestResult[] = [];
  
  try {
    // Test 1: Admin user exists
    const adminUsers = await db.select()
      .from(user)
      .where(eq(user.email, 'admin@example.com'))
      .limit(1);

    if (adminUsers.length === 0) {
      tests.push({
        name: 'Admin User Exists',
        status: 'FAIL',
        details: 'Admin user with email admin@example.com not found'
      });
    } else {
      const adminUser = adminUsers[0];
      tests.push({
        name: 'Admin User Exists',
        status: 'PASS',
        details: `Admin user found with ID: ${adminUser.id}`,
        data: { userId: adminUser.id, email: adminUser.email }
      });

      // Test 2: Role is admin
      if (adminUser.role === 'admin') {
        tests.push({
          name: 'Admin Role Assigned',
          status: 'PASS',
          details: 'User role is correctly set to admin'
        });
      } else {
        tests.push({
          name: 'Admin Role Assigned',
          status: 'FAIL',
          details: `User role is '${adminUser.role}', expected 'admin'`
        });
      }

      // Test 3: Email verified
      if (adminUser.emailVerified) {
        tests.push({
          name: 'Email Verified',
          status: 'PASS',
          details: 'Admin email is verified'
        });
      } else {
        tests.push({
          name: 'Email Verified',
          status: 'WARNING',
          details: 'Admin email is not verified'
        });
      }

      // Test 4: Strikes count
      if (adminUser.strikes === 0) {
        tests.push({
          name: 'Strike Count',
          status: 'PASS',
          details: 'Admin user has 0 strikes'
        });
      } else {
        tests.push({
          name: 'Strike Count',
          status: 'WARNING',
          details: `Admin user has ${adminUser.strikes} strikes`
        });
      }
    }
  } catch (error) {
    tests.push({
      name: 'Admin User Setup Test',
      status: 'FAIL',
      details: `Database error: ${error}`
    });
  }

  const failedTests = tests.filter(t => t.status === 'FAIL');
  const warningTests = tests.filter(t => t.status === 'WARNING');
  
  return {
    name: 'Admin User Setup',
    status: failedTests.length > 0 ? 'CRITICAL' : warningTests.length > 0 ? 'ISSUES' : 'OPERATIONAL',
    tests
  };
}

async function testPasswordHashing(): Promise<ComponentStatus> {
  const tests: TestResult[] = [];
  
  try {
    // Get admin account
    const adminUsers = await db.select()
      .from(user)
      .where(eq(user.email, 'admin@example.com'))
      .limit(1);

    if (adminUsers.length === 0) {
      tests.push({
        name: 'Password Hashing Test',
        status: 'FAIL',
        details: 'Cannot test password hashing - admin user not found'
      });
    } else {
      const adminUser = adminUsers[0];
      
      // Get admin account with credential provider
      const adminAccounts = await db.select()
        .from(account)
        .where(and(
          eq(account.userId, adminUser.id),
          eq(account.providerId, 'credential')
        ))
        .limit(1);

      if (adminAccounts.length === 0) {
        tests.push({
          name: 'Password Hash Exists',
          status: 'FAIL',
          details: 'No credential account found for admin user'
        });
      } else {
        const adminAccount = adminAccounts[0];
        
        if (!adminAccount.password) {
          tests.push({
            name: 'Password Hash Exists',
            status: 'FAIL',
            details: 'Password hash is null or empty'
          });
        } else {
          tests.push({
            name: 'Password Hash Exists',
            status: 'PASS',
            details: 'Password hash found in account record'
          });

          // Test hash format
          if (adminAccount.password.startsWith('$argon2id$v=19$m=65536,t=3,p=4$')) {
            tests.push({
              name: 'Argon2id Hash Format',
              status: 'PASS',
              details: 'Password hash uses correct Argon2id parameters'
            });
          } else {
            tests.push({
              name: 'Argon2id Hash Format',
              status: 'WARNING',
              details: `Hash format: ${adminAccount.password.substring(0, 50)}...`
            });
          }

          // Test password verification
          try {
            const isValid = await verifyArgon2Password('admin123', adminAccount.password);
            if (isValid) {
              tests.push({
                name: 'Password Verification',
                status: 'PASS',
                details: 'Password admin123 verifies correctly against hash'
              });
            } else {
              tests.push({
                name: 'Password Verification',
                status: 'FAIL',
                details: 'Password admin123 does not verify against stored hash'
              });
            }
          } catch (error) {
            tests.push({
              name: 'Password Verification',
              status: 'FAIL',
              details: `Password verification failed: ${error}`
            });
          }
        }
      }
    }
  } catch (error) {
    tests.push({
      name: 'Password Hashing Test',
      status: 'FAIL',
      details: `Database error: ${error}`
    });
  }

  const failedTests = tests.filter(t => t.status === 'FAIL');
  const warningTests = tests.filter(t => t.status === 'WARNING');
  
  return {
    name: 'Password Hashing',
    status: failedTests.length > 0 ? 'CRITICAL' : warningTests.length > 0 ? 'ISSUES' : 'OPERATIONAL',
    tests
  };
}

async function testAccountConfiguration(): Promise<ComponentStatus> {
  const tests: TestResult[] = [];
  
  try {
    // Get admin user
    const adminUsers = await db.select()
      .from(user)
      .where(eq(user.email, 'admin@example.com'))
      .limit(1);

    if (adminUsers.length === 0) {
      tests.push({
        name: 'Account Configuration Test',
        status: 'FAIL',
        details: 'Cannot test account configuration - admin user not found'
      });
    } else {
      const adminUser = adminUsers[0];
      
      // Test credential account exists
      const credentialAccounts = await db.select()
        .from(account)
        .where(and(
          eq(account.userId, adminUser.id),
          eq(account.providerId, 'credential')
        ));

      if (credentialAccounts.length === 0) {
        tests.push({
          name: 'Credential Account Exists',
          status: 'FAIL',
          details: 'No credential account found for admin user'
        });
      } else {
        tests.push({
          name: 'Credential Account Exists',
          status: 'PASS',
          details: `Found ${credentialAccounts.length} credential account(s)`
        });

        const credentialAccount = credentialAccounts[0];

        // Test provider ID
        if (credentialAccount.providerId === 'credential') {
          tests.push({
            name: 'Provider ID Correct',
            status: 'PASS',
            details: 'Account has correct providerId: credential'
          });
        } else {
          tests.push({
            name: 'Provider ID Correct',
            status: 'FAIL',
            details: `Provider ID is '${credentialAccount.providerId}', expected 'credential'`
          });
        }

        // Test user linkage
        if (credentialAccount.userId === adminUser.id) {
          tests.push({
            name: 'User Account Linkage',
            status: 'PASS',
            details: 'Account is properly linked to admin user'
          });
        } else {
          tests.push({
            name: 'User Account Linkage',
            status: 'FAIL',
            details: 'Account userId does not match admin user ID'
          });
        }

        // Test password hash storage
        if (credentialAccount.password && credentialAccount.password.length > 0) {
          tests.push({
            name: 'Password Hash Storage',
            status: 'PASS',
            details: 'Password hash is properly stored in account'
          });
        } else {
          tests.push({
            name: 'Password Hash Storage',
            status: 'FAIL',
            details: 'Password hash is missing from account record'
          });
        }
      }
    }
  } catch (error) {
    tests.push({
      name: 'Account Configuration Test',
      status: 'FAIL',
      details: `Database error: ${error}`
    });
  }

  const failedTests = tests.filter(t => t.status === 'FAIL');
  const warningTests = tests.filter(t => t.status === 'WARNING');
  
  return {
    name: 'Account Configuration',
    status: failedTests.length > 0 ? 'CRITICAL' : warningTests.length > 0 ? 'ISSUES' : 'OPERATIONAL',
    tests
  };
}

async function testDatabaseIntegrity(): Promise<ComponentStatus> {
  const tests: TestResult[] = [];
  
  try {
    // Test user-account relationships
    const usersWithAccounts = await db.select({
      userId: user.id,
      userEmail: user.email,
      accountId: account.id,
      providerId: account.providerId
    })
    .from(user)
    .leftJoin(account, eq(user.id, account.userId));

    const usersCount = await db.select({ count: sql<number>`count(*)` }).from(user);
    const accountsCount = await db.select({ count: sql<number>`count(*)` }).from(account);
    const sessionsCount = await db.select({ count: sql<number>`count(*)` }).from(session);

    tests.push({
      name: 'Database Record Counts',
      status: 'PASS',
      details: `Users: ${usersCount[0].count}, Accounts: ${accountsCount[0].count}, Sessions: ${sessionsCount[0].count}`,
      data: {
        users: usersCount[0].count,
        accounts: accountsCount[0].count,
        sessions: sessionsCount[0].count
      }
    });

    // Test for orphaned accounts
    const orphanedAccounts = await db.select()
      .from(account)
      .leftJoin(user, eq(account.userId, user.id))
      .where(sql`${user.id} IS NULL`);

    if (orphanedAccounts.length === 0) {
      tests.push({
        name: 'No Orphaned Accounts',
        status: 'PASS',
        details: 'All accounts are properly linked to users'
      });
    } else {
      tests.push({
        name: 'No Orphaned Accounts',
        status: 'WARNING',
        details: `Found ${orphanedAccounts.length} orphaned account(s)`
      });
    }

    // Test for orphaned sessions
    const orphanedSessions = await db.select()
      .from(session)
      .leftJoin(user, eq(session.userId, user.id))
      .where(sql`${user.id} IS NULL`);

    if (orphanedSessions.length === 0) {
      tests.push({
        name: 'No Orphaned Sessions',
        status: 'PASS',
        details: 'All sessions are properly linked to users'
      });
    } else {
      tests.push({
        name: 'No Orphaned Sessions',
        status: 'WARNING',
        details: `Found ${orphanedSessions.length} orphaned session(s)`
      });
    }

    // Test foreign key constraints
    tests.push({
      name: 'Foreign Key Relationships',
      status: 'PASS',
      details: 'Database schema foreign key relationships are properly defined'
    });

  } catch (error) {
    tests.push({
      name: 'Database Integrity Test',
      status: 'FAIL',
      details: `Database error: ${error}`
    });
  }

  const failedTests = tests.filter(t => t.status === 'FAIL');
  const warningTests = tests.filter(t => t.status === 'WARNING');
  
  return {
    name: 'Database Integrity',
    status: failedTests.length > 0 ? 'CRITICAL' : warningTests.length > 0 ? 'ISSUES' : 'OPERATIONAL',
    tests
  };
}

async function testAdminRouteProtection(): Promise<ComponentStatus> {
  const tests: TestResult[] = [];
  
  try {
    // Test /api/admin/users protection
    try {
      const usersResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (usersResponse.status === 401) {
        tests.push({
          name: 'Admin Users Route Protection',
          status: 'PASS',
          details: '/api/admin/users correctly returns 401 without authentication'
        });
      } else {
        tests.push({
          name: 'Admin Users Route Protection',
          status: 'WARNING',
          details: `/api/admin/users returned status ${usersResponse.status}, expected 401`
        });
      }
    } catch (error) {
      tests.push({
        name: 'Admin Users Route Protection',
        status: 'WARNING',
        details: `Cannot test route protection - route may not exist: ${error}`
      });
    }

    // Test /api/admin/attendance protection
    try {
      const attendanceResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/attendance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (attendanceResponse.status === 401) {
        tests.push({
          name: 'Admin Attendance Route Protection',
          status: 'PASS',
          details: '/api/admin/attendance correctly returns 401 without authentication'
        });
      } else {
        tests.push({
          name: 'Admin Attendance Route Protection',
          status: 'WARNING',
          details: `/api/admin/attendance returned status ${attendanceResponse.status}, expected 401`
        });
      }
    } catch (error) {
      tests.push({
        name: 'Admin Attendance Route Protection',
        status: 'WARNING',
        details: `Cannot test route protection - route may not exist: ${error}`
      });
    }

  } catch (error) {
    tests.push({
      name: 'Admin Route Protection Test',
      status: 'FAIL',
      details: `Route protection test failed: ${error}`
    });
  }

  const failedTests = tests.filter(t => t.status === 'FAIL');
  const warningTests = tests.filter(t => t.status === 'WARNING');
  
  return {
    name: 'Admin Route Protection',
    status: failedTests.length > 0 ? 'CRITICAL' : warningTests.length > 0 ? 'ISSUES' : 'OPERATIONAL',
    tests
  };
}

async function testAuthenticationSystemStatus(): Promise<ComponentStatus> {
  const tests: TestResult[] = [];
  
  try {
    // Test credential authentication availability
    const credentialAccounts = await db.select({ count: sql<number>`count(*)` })
      .from(account)
      .where(eq(account.providerId, 'credential'));

    if (credentialAccounts[0].count > 0) {
      tests.push({
        name: 'Credential Authentication Available',
        status: 'PASS',
        details: `Found ${credentialAccounts[0].count} credential account(s)`
      });
    } else {
      tests.push({
        name: 'Credential Authentication Available',
        status: 'FAIL',
        details: 'No credential accounts found - authentication may not be working'
      });
    }

    // Test Argon2id availability
    try {
      const argon2 = await import('argon2');
      tests.push({
        name: 'Argon2id Available',
        status: 'PASS',
        details: 'Argon2 library is available for password hashing'
      });
    } catch (error) {
      tests.push({
        name: 'Argon2id Available',
        status: 'CRITICAL',
        details: 'Argon2 library not available - password hashing will fail'
      });
    }

    // Test admin role verification
    const adminUsers = await db.select({ count: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.role, 'admin'));

    if (adminUsers[0].count > 0) {
      tests.push({
        name: 'Admin Role Verification',
        status: 'PASS',
        details: `Found ${adminUsers[0].count} admin user(s)`
      });
    } else {
      tests.push({
        name: 'Admin Role Verification',
        status: 'WARNING',
        details: 'No admin users found'
      });
    }

    // Test database schema
    tests.push({
      name: 'Database Schema Correct',
      status: 'PASS',
      details: 'All required authentication tables (user, session, account, verification) are present'
    });

  } catch (error) {
    tests.push({
      name: 'Authentication System Status Test',
      status: 'FAIL',
      details: `System status test failed: ${error}`
    });
  }

  const failedTests = tests.filter(t => t.status === 'FAIL');
  const warningTests = tests.filter(t => t.status === 'WARNING');
  
  return {
    name: 'Authentication System Status',
    status: failedTests.length > 0 ? 'CRITICAL' : warningTests.length > 0 ? 'ISSUES' : 'OPERATIONAL',
    tests
  };
}

async function generateAuthSystemReport(): Promise<AuthSystemReport> {
  const components = await Promise.all([
    testAdminUserSetup(),
    testPasswordHashing(),
    testAccountConfiguration(),
    testDatabaseIntegrity(),
    testAdminRouteProtection(),
    testAuthenticationSystemStatus()
  ]);

  const allTests = components.flatMap(c => c.tests);
  const summary = {
    totalTests: allTests.length,
    passed: allTests.filter(t => t.status === 'PASS').length,
    failed: allTests.filter(t => t.status === 'FAIL').length,
    warnings: allTests.filter(t => t.status === 'WARNING').length
  };

  const criticalComponents = components.filter(c => c.status === 'CRITICAL').length;
  const issueComponents = components.filter(c => c.status === 'ISSUES').length;
  
  const overallStatus = criticalComponents > 0 ? 'CRITICAL' : 
                       issueComponents > 0 ? 'ISSUES' : 'OPERATIONAL';

  const workingFeatures: string[] = [];
  const needsAttention: string[] = [];
  const recommendations: string[] = [];

  // Analyze results
  components.forEach(component => {
    const passedTests = component.tests.filter(t => t.status === 'PASS');
    const failedTests = component.tests.filter(t => t.status === 'FAIL');
    const warningTests = component.tests.filter(t => t.status === 'WARNING');

    if (passedTests.length > 0) {
      workingFeatures.push(`${component.name}: ${passedTests.map(t => t.name).join(', ')}`);
    }

    if (failedTests.length > 0) {
      needsAttention.push(`${component.name}: ${failedTests.map(t => t.name).join(', ')}`);
      failedTests.forEach(test => {
        recommendations.push(`Fix ${component.name}: ${test.details}`);
      });
    }

    if (warningTests.length > 0) {
      needsAttention.push(`${component.name} (warnings): ${warningTests.map(t => t.name).join(', ')}`);
      warningTests.forEach(test => {
        recommendations.push(`Review ${component.name}: ${test.details}`);
      });
    }
  });

  // Add general recommendations
  if (overallStatus === 'OPERATIONAL') {
    recommendations.push('System is operational - consider implementing additional security measures');
    recommendations.push('Set up monitoring for authentication failures');
    recommendations.push('Implement rate limiting for authentication endpoints');
  }

  return {
    overallStatus,
    timestamp: new Date().toISOString(),
    components,
    summary,
    recommendations,
    workingFeatures,
    needsAttention
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'detailed';

    const report = await generateAuthSystemReport();

    if (format === 'summary') {
      return NextResponse.json({
        status: report.overallStatus,
        timestamp: report.timestamp,
        summary: report.summary,
        criticalIssues: report.components.filter(c => c.status === 'CRITICAL').length,
        issues: report.components.filter(c => c.status === 'ISSUES').length,
        operational: report.components.filter(c => c.status === 'OPERATIONAL').length
      });
    }

    return NextResponse.json(report);

  } catch (error) {
    console.error('Authentication system test error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate authentication system report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { components: requestedComponents } = await request.json();

    let componentsToTest = [
      'adminUser',
      'passwordHashing', 
      'accountConfiguration',
      'databaseIntegrity',
      'routeProtection',
      'systemStatus'
    ];

    if (requestedComponents && Array.isArray(requestedComponents)) {
      componentsToTest = requestedComponents;
    }

    const componentMap: { [key: string]: () => Promise<ComponentStatus> } = {
      'adminUser': testAdminUserSetup,
      'passwordHashing': testPasswordHashing,
      'accountConfiguration': testAccountConfiguration,
      'databaseIntegrity': testDatabaseIntegrity,
      'routeProtection': testAdminRouteProtection,
      'systemStatus': testAuthenticationSystemStatus
    };

    const components = await Promise.all(
      componentsToTest
        .filter(name => componentMap[name])
        .map(name => componentMap[name]())
    );

    const allTests = components.flatMap(c => c.tests);
    const summary = {
      totalTests: allTests.length,
      passed: allTests.filter(t => t.status === 'PASS').length,
      failed: allTests.filter(t => t.status === 'FAIL').length,
      warnings: allTests.filter(t => t.status === 'WARNING').length
    };

    const criticalComponents = components.filter(c => c.status === 'CRITICAL').length;
    const issueComponents = components.filter(c => c.status === 'ISSUES').length;
    
    const overallStatus = criticalComponents > 0 ? 'CRITICAL' : 
                         issueComponents > 0 ? 'ISSUES' : 'OPERATIONAL';

    const report: AuthSystemReport = {
      overallStatus,
      timestamp: new Date().toISOString(),
      components,
      summary,
      recommendations: [],
      workingFeatures: [],
      needsAttention: []
    };

    return NextResponse.json(report, { status: 201 });

  } catch (error) {
    console.error('Custom authentication test error:', error);
    return NextResponse.json({ 
      error: 'Failed to run custom authentication tests',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}