/**
 * GET /api/v2/suppliers/[id]
 * Get detailed information about a specific supplier
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

    // TODO: Extract from JWT token - for now using mock context
    const mockContext = {
      organizationId: 'cmfowhsq10001tcu5szq9az8s', // Restaurant ID from seed data
      userId: 'user-restaurant-manager',
      isPlatformAdmin: false
    }

    // Get supplier details
    const supplier = await supplierService.getSupplierDetail(mockContext, supplierId)

    if (!supplier) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SUPPLIER_NOT_FOUND',
          message: 'Supplier not found or access denied'
        }
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        supplier
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '2.0'
      }
    })

  } catch (error) {
    console.error('Supplier detail API error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUPPLIER_DETAIL_ERROR',
        message: 'Failed to fetch supplier details',
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
      message: 'POST method not supported for supplier details'
    }
  }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'PUT method not supported for supplier details'
    }
  }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'DELETE method not supported for supplier details'
    }
  }, { status: 405 })
}