/**
 * GET /api/v2/suppliers
 * List suppliers for the current restaurant with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import SupplierService from '@/lib/services/supplier-service'

const prisma = new PrismaClient()
const supplierService = new SupplierService(prisma)

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const isActive = searchParams.get('active') !== 'false' // default to true
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // TODO: Extract from JWT token - for now using mock context
    const mockContext = {
      organizationId: 'cmfowhsq10001tcu5szq9az8s', // Restaurant ID from seed data
      userId: 'user-restaurant-manager',
      isPlatformAdmin: false
    }

    // Get suppliers with filters
    const { suppliers, total } = await supplierService.getSuppliersForRestaurant(
      mockContext,
      {
        search,
        isActive,
        limit,
        offset
      }
    )

    // Calculate pagination metadata
    const hasNext = offset + limit < total
    const hasPrev = offset > 0
    const totalPages = Math.ceil(total / limit)
    const currentPage = Math.floor(offset / limit) + 1

    return NextResponse.json({
      success: true,
      data: {
        suppliers,
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
          search,
          isActive,
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
    console.error('Suppliers API error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUPPLIERS_FETCH_ERROR',
        message: 'Failed to fetch suppliers',
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
      message: 'POST method not supported for suppliers listing'
    }
  }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED', 
      message: 'PUT method not supported for suppliers listing'
    }
  }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'DELETE method not supported for suppliers listing'
    }
  }, { status: 405 })
}