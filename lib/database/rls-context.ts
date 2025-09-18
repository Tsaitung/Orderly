/**
 * Row Level Security Context Management
 * Provides utilities to set database session variables for RLS policies
 */

import { PrismaClient } from '@prisma/client'

export interface RLSContext {
  organizationId: string
  userId: string
  isPlatformAdmin?: boolean
}

/**
 * Set RLS context variables in the database session
 * This must be called before any database operations that rely on RLS
 */
export async function setRLSContext(
  prisma: PrismaClient,
  context: RLSContext
): Promise<void> {
  const { organizationId, userId, isPlatformAdmin = false } = context

  // Set session variables that RLS policies will use
  await prisma.$executeRaw`
    SELECT 
      set_config('app.current_organization_id', ${organizationId}, true),
      set_config('app.current_user_id', ${userId}, true),
      set_config('app.is_platform_admin', ${isPlatformAdmin.toString()}, true)
  `
}

/**
 * Clear RLS context variables (useful for testing)
 */
export async function clearRLSContext(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`
    SELECT 
      set_config('app.current_organization_id', '', true),
      set_config('app.current_user_id', '', true),
      set_config('app.is_platform_admin', 'false', true)
  `
}

/**
 * Execute a database operation with specific RLS context
 * Automatically sets and clears context
 */
export async function withRLSContext<T>(
  prisma: PrismaClient,
  context: RLSContext,
  operation: () => Promise<T>
): Promise<T> {
  await setRLSContext(prisma, context)
  try {
    return await operation()
  } finally {
    await clearRLSContext(prisma)
  }
}

/**
 * Create a Prisma client instance with RLS context pre-configured
 * Useful for request-scoped operations
 */
export async function createContextualPrismaClient(
  context: RLSContext
): Promise<PrismaClient> {
  const prisma = new PrismaClient()
  await setRLSContext(prisma, context)
  return prisma
}

/**
 * Middleware to automatically set RLS context from JWT token
 * This should be used in API routes to ensure data isolation
 */
export function createRLSMiddleware(
  extractContext: (request: any) => RLSContext | null
) {
  return async (req: any, res: any, next: any) => {
    const context = extractContext(req)
    
    if (!context) {
      return res.status(401).json({ 
        error: 'Authentication required for data access' 
      })
    }

    // Store context in request for later use
    req.rlsContext = context
    
    // Continue to next middleware
    next()
  }
}

/**
 * Utility to test RLS policies in development
 */
export class RLSTestHelper {
  constructor(private prisma: PrismaClient) {}

  /**
   * Test organization data isolation
   */
  async testOrganizationIsolation(
    org1Context: RLSContext,
    org2Context: RLSContext
  ) {
    console.log('🧪 Testing organization data isolation...')

    // Test as organization 1
    const org1Orders = await withRLSContext(
      this.prisma,
      org1Context,
      () => this.prisma.order.findMany()
    )

    // Test as organization 2
    const org2Orders = await withRLSContext(
      this.prisma,
      org2Context,
      () => this.prisma.order.findMany()
    )

    console.log(`Org 1 can see ${org1Orders.length} orders`)
    console.log(`Org 2 can see ${org2Orders.length} orders`)

    // Verify no overlap in sensitive data
    const org1OrderIds = new Set(org1Orders.map(o => o.id))
    const org2OrderIds = new Set(org2Orders.map(o => o.id))
    const overlap = [...org1OrderIds].filter(id => org2OrderIds.has(id))

    if (overlap.length > 0) {
      console.warn('⚠️  Data isolation violation detected:', overlap)
    } else {
      console.log('✅ Data isolation working correctly')
    }

    return { org1Orders, org2Orders, overlap }
  }

  /**
   * Test platform admin access
   */
  async testPlatformAdminAccess(adminContext: RLSContext) {
    console.log('🧪 Testing platform admin access...')

    const allOrganizations = await withRLSContext(
      this.prisma,
      { ...adminContext, isPlatformAdmin: true },
      () => this.prisma.organization.findMany()
    )

    const allUsers = await withRLSContext(
      this.prisma,
      { ...adminContext, isPlatformAdmin: true },
      () => this.prisma.user.findMany()
    )

    console.log(`Platform admin can see ${allOrganizations.length} organizations`)
    console.log(`Platform admin can see ${allUsers.length} users`)

    return { allOrganizations, allUsers }
  }
}

export default {
  setRLSContext,
  clearRLSContext,
  withRLSContext,
  createContextualPrismaClient,
  createRLSMiddleware,
  RLSTestHelper
}