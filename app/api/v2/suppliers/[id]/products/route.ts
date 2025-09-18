/**
 * GET /api/v2/suppliers/[id]/products
 * Get product catalog for a specific supplier
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import SupplierService from '@/lib/services/supplier-service'

const prisma = new PrismaClient()
const supplierService = new SupplierService(prisma)

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: supplierId } = params

    // Validate supplier ID
    if (!supplierId || typeof supplierId !== 'string') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SUPPLIER_ID',
          message: 'Valid supplier ID is required'
        }
      }, { status: 400 })
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const search = searchParams.get('search') || undefined
    const active = searchParams.get('active') !== 'false' // default to true
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // TODO: Extract from JWT token - for now using mock context
    const mockContext = {
      organizationId: 'cmfowhsq10001tcu5szq9az8s', // Restaurant ID from seed data
      userId: 'user-restaurant-manager',
      isPlatformAdmin: false
    }

    // Get supplier products
    const result = await supplierService.getSupplierProducts(
      mockContext,
      supplierId,
      {
        category,
        search,
        active,
        limit,
        offset
      }
    )

    // Calculate pagination metadata
    const { products, total, categories } = result
    const hasNext = offset + limit < total
    const hasPrev = offset > 0
    const totalPages = Math.ceil(total / limit)
    const currentPage = Math.floor(offset / limit) + 1

    return NextResponse.json({
      success: true,
      data: {
        products,
        categories,
        pagination: {
          total,
          limit,
          offset,
          currentPage,
          totalPages,
          hasNext,
          hasPrev
        },
        filters: {
          category,
          search,
          active,
          appliedAt: new Date().toISOString()
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '2.0'
      }
    })

  } catch (error) {
    console.error('Supplier products API error:', error)

    // Handle specific access denied error
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'No relationship with this supplier'
        }
      }, { status: 403 })
    }
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUPPLIER_PRODUCTS_ERROR',
        message: 'Failed to fetch supplier products',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '2.0'
      }
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'POST method not supported for supplier products'
    }
  }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'PUT method not supported for supplier products'
    }
  }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'DELETE method not supported for supplier products'
    }
  }, { status: 405 })
}