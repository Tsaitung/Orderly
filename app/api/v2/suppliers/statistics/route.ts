/**
 * GET /api/v2/suppliers/statistics
 * Get aggregated supplier statistics and metrics for restaurant dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import SupplierService from '@/lib/services/supplier-service'

const prisma = new PrismaClient()
const supplierService = new SupplierService(prisma)

export async function GET(request: NextRequest) {
  try {
    // TODO: Extract from JWT token - for now using mock context
    const mockContext = {
      organizationId: 'cmfowhsq10001tcu5szq9az8s', // Restaurant ID from seed data
      userId: 'user-restaurant-manager',
      isPlatformAdmin: false
    }

    // Get supplier statistics
    const statistics = await supplierService.getSupplierStatistics(mockContext)

    // Add additional computed metrics
    const enrichedStatistics = {
      ...statistics,
      computed: {
        supplierUtilizationRate: statistics.totalSuppliers > 0 
          ? Math.round((statistics.activeSuppliers / statistics.totalSuppliers) * 100) 
          : 0,
        averageProductsPerSupplier: statistics.totalSuppliers > 0
          ? Math.round(statistics.totalProducts / statistics.totalSuppliers)
          : 0,
        averageGMVPerSupplier: statistics.activeSuppliers > 0
          ? Math.round(statistics.monthlyGMV / statistics.activeSuppliers)
          : 0
      },
      trends: {
        // Placeholder for trending data - would come from historical analysis
        supplierGrowth: Math.round((Math.random() - 0.5) * 20), // -10% to +10%
        gmvGrowth: Math.round((Math.random() - 0.3) * 30), // -15% to +15%
        fulfillmentImprovement: Math.round(Math.random() * 10) // 0% to +10%
      },
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        days: 30
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        statistics: enrichedStatistics
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '2.0',
        cacheHint: {
          maxAge: 300, // 5 minutes
          staleWhileRevalidate: 600 // 10 minutes
        }
      }
    })

  } catch (error) {
    console.error('Supplier statistics API error:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SUPPLIER_STATISTICS_ERROR',
        message: 'Failed to fetch supplier statistics',
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
      message: 'POST method not supported for supplier statistics'
    }
  }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'PUT method not supported for supplier statistics'
    }
  }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'DELETE method not supported for supplier statistics'
    }
  }, { status: 405 })
}