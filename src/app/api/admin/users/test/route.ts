import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * TEST ENDPOINT FOR ADMIN USER CREATION API
 * 
 * This endpoint documents and tests the functionality of POST /api/admin/users
 * 
 * AUTHENTICATION REQUIREMENTS:
 * - Valid admin session required (role: "admin")
 * - Authentication via getCurrentUser() from session
 * - Returns 401 if no session, 403 if not admin role
 * 
 * INPUT VALIDATION RULES:
 * - name: Required string, 2-100 characters, trimmed
 * - email: Required string, valid email format, lowercase normalized
 * - password: Required string, minimum 8 characters
 * - role: Optional string, defaults to "user", valid values: "user", "admin", "moderator"
 * - emailVerified: Optional boolean, defaults to false
 * 
 * SUCCESS RESPONSES:
 * - 201: User created successfully with bcrypt-hashed password
 * - Returns user object without sensitive data (no password hash)
 * 
 * ERROR RESPONSES:
 * - 400: Validation errors with specific error codes
 * - 401: Authentication required
 * - 403: Admin access required
 * - 409: Email already exists
 * - 500: Internal server error
 * 
 * DATABASE OPERATIONS:
 * - Creates record in user table with auto-generated ID
 * - Creates record in account table with hashed password
 * - Uses bcrypt with salt rounds 12 for password hashing
 * - Validates email uniqueness before creation
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    const documentation = {
      endpoint: 'POST /api/admin/users',
      description: 'Create new user with admin privileges',
      authentication: {
        required: true,
        type: 'session',
        role: 'admin',
        note: 'Must be authenticated as admin user'
      },
      requestBody: {
        required: ['name', 'email', 'password'],
        optional: ['role', 'emailVerified'],
        schema: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            description: 'User full name, will be trimmed'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Valid email address, will be normalized to lowercase'
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'Plain text password, will be bcrypt hashed with salt rounds 12'
          },
          role: {
            type: 'string',
            enum: ['user', 'admin', 'moderator'],
            default: 'user',
            description: 'User role assignment'
          },
          emailVerified: {
            type: 'boolean',
            default: false,
            description: 'Email verification status'
          }
        }
      },
      responses: {
        success: {
          status: 201,
          description: 'User created successfully',
          example: {
            id: 'usr_abc123def456',
            name: 'John Doe',
            email: 'john.doe@example.com',
            emailVerified: false,
            image: null,
            role: 'user',
            strikes: 0,
            createdAt: '2024-01-15T10:30:00.000Z',
            updatedAt: '2024-01-15T10:30:00.000Z'
          }
        },
        errors: {
          400: {
            description: 'Validation errors',
            codes: [
              'MISSING_NAME',
              'INVALID_NAME_LENGTH',
              'MISSING_EMAIL',
              'INVALID_EMAIL_FORMAT',
              'MISSING_PASSWORD',
              'INVALID_PASSWORD_LENGTH',
              'INVALID_ROLE',
              'INVALID_EMAIL_VERIFIED_TYPE'
            ],
            examples: [
              {
                error: 'Name is required',
                code: 'MISSING_NAME'
              },
              {
                error: 'Name must be between 2 and 100 characters',
                code: 'INVALID_NAME_LENGTH'
              },
              {
                error: 'Invalid email format',
                code: 'INVALID_EMAIL_FORMAT'
              },
              {
                error: 'Password must be at least 8 characters',
                code: 'INVALID_PASSWORD_LENGTH'
              }
            ]
          },
          401: {
            description: 'Authentication required',
            example: {
              error: 'Authentication required'
            }
          },
          403: {
            description: 'Admin access required',
            example: {
              error: 'Admin access required',
              code: 'INSUFFICIENT_PERMISSIONS'
            }
          },
          409: {
            description: 'Email already exists',
            example: {
              error: 'Email already exists',
              code: 'EMAIL_EXISTS'
            }
          },
          500: {
            description: 'Internal server error',
            example: {
              error: 'Internal server error: Database connection failed'
            }
          }
        }
      },
      sampleRequests: {
        basicUser: {
          method: 'POST',
          url: '/api/admin/users',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'session=your_session_token'
          },
          body: {
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            password: 'securePassword123'
          }
        },
        adminUser: {
          method: 'POST',
          url: '/api/admin/users',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'session=your_session_token'
          },
          body: {
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'adminPassword456',
            role: 'admin',
            emailVerified: true
          }
        },
        moderatorUser: {
          method: 'POST',
          url: '/api/admin/users',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'session=your_session_token'
          },
          body: {
            name: 'Moderator User',
            email: 'moderator@example.com',
            password: 'modPassword789',
            role: 'moderator'
          }
        }
      },
      frontendIntegration: {
        react: `
// Frontend integration example
const createUser = async (userData) => {
  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include session cookie
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const newUser = await response.json();
    return newUser;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};

// Usage
const handleSubmit = async (formData) => {
  try {
    const newUser = await createUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role || 'user'
    });
    console.log('User created:', newUser);
  } catch (error) {
    setError(error.message);
  }
};
        `,
        validation: `
// Client-side validation example
const validateUserData = (data) => {
  const errors = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!data.email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) {
    errors.email = 'Valid email is required';
  }

  if (!data.password || data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (data.role && !['user', 'admin', 'moderator'].includes(data.role)) {
    errors.role = 'Invalid role specified';
  }

  return Object.keys(errors).length === 0 ? null : errors;
};
        `
      },
      security: {
        passwordHashing: 'bcrypt with 12 salt rounds',
        emailNormalization: 'Converted to lowercase',
        inputSanitization: 'All strings trimmed',
        roleValidation: 'Restricted to predefined roles',
        adminOnlyAccess: 'Requires admin role in session',
        sessionValidation: 'getCurrentUser() validates active session'
      },
      databaseSchema: {
        userTable: {
          id: 'text PRIMARY KEY (auto-generated)',
          name: 'text NOT NULL',
          email: 'text NOT NULL UNIQUE',
          emailVerified: 'boolean DEFAULT false',
          image: 'text (nullable)',
          role: 'text DEFAULT "user"',
          strikes: 'integer DEFAULT 0',
          createdAt: 'timestamp (auto-generated)',
          updatedAt: 'timestamp (auto-generated)'
        },
        accountTable: {
          id: 'text PRIMARY KEY (auto-generated)',
          accountId: 'text NOT NULL (matches user.email)',
          providerId: 'text NOT NULL ("credential")',
          userId: 'text NOT NULL (references user.id)',
          password: 'text NOT NULL (bcrypt hash)',
          createdAt: 'timestamp (auto-generated)',
          updatedAt: 'timestamp (auto-generated)'
        }
      }
    };

    return NextResponse.json(documentation, { status: 200 });

  } catch (error) {
    console.error('Documentation endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    const requestBody = await request.json();
    const { name, email, password, role = 'user', emailVerified = false } = requestBody;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: 'Name is required',
        code: 'MISSING_NAME' 
      }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required',
        code: 'MISSING_EMAIL' 
      }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ 
        error: 'Password is required',
        code: 'MISSING_PASSWORD' 
      }, { status: 400 });
    }

    // Validate field formats and lengths
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return NextResponse.json({ 
        error: 'Name must be between 2 and 100 characters',
        code: 'INVALID_NAME_LENGTH' 
      }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ 
        error: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT' 
      }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters',
        code: 'INVALID_PASSWORD_LENGTH' 
      }, { status: 400 });
    }

    const validRoles = ['user', 'admin', 'moderator'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be one of: user, admin, moderator',
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    if (typeof emailVerified !== 'boolean') {
      return NextResponse.json({ 
        error: 'emailVerified must be a boolean',
        code: 'INVALID_EMAIL_VERIFIED_TYPE' 
      }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await db.select()
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: 'Email already exists',
        code: 'EMAIL_EXISTS' 
      }, { status: 409 });
    }

    // Generate user ID
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user record
    const newUser = await db.insert(user).values({
      id: userId,
      name: trimmedName,
      email: normalizedEmail,
      emailVerified: emailVerified,
      image: null,
      role: role,
      strikes: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Create account record with hashed password
    const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    await db.insert(account).values({
      id: accountId,
      accountId: normalizedEmail,
      providerId: 'credential',
      userId: userId,
      password: hashedPassword,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Return user without sensitive data
    const createdUser = newUser[0];
    const responseUser = {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      emailVerified: createdUser.emailVerified,
      image: createdUser.image,
      role: createdUser.role,
      strikes: createdUser.strikes,
      createdAt: createdUser.createdAt,
      updatedAt: createdUser.updatedAt
    };

    return NextResponse.json(responseUser, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}