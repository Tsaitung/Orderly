import { NextRequest, NextResponse } from 'next/server'

// 代理到 Customer Hierarchy Service 或 BFF
const CUSTOMER_SERVICE_BASE =
  process.env.NEXT_PUBLIC_CUSTOMER_HIERARCHY_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3007/api/v2'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const searchParams = url.searchParams

    // 代理到 hierarchy/tree 端點
    const target = `${CUSTOMER_SERVICE_BASE}/hierarchy/tree?${searchParams.toString()}`

    const response = await fetch(target, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Customer service responded with ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      data: data.data || data,
      message: 'Customer hierarchy loaded successfully',
    })
  } catch (error) {
    console.error('Customer API proxy error:', error)

    // 返回模擬數據以防止頁面崩潰
    const mockData = [
      {
        id: 'mock-group-1',
        name: '示範集團',
        type: 'group',
        isActive: true,
        metadata: {},
        children: [
          {
            id: 'mock-company-1',
            name: '示範公司 A',
            type: 'company',
            isActive: true,
            metadata: {},
            children: [
              {
                id: 'mock-location-1',
                name: '台北門市',
                type: 'location',
                isActive: true,
                metadata: {},
                children: [],
              },
            ],
          },
        ],
      },
    ]

    return NextResponse.json(
      {
        success: false,
        data: mockData,
        message: 'Using mock data due to service unavailability',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 }
    ) // 返回 200 避免前端錯誤
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const target = `${CUSTOMER_SERVICE_BASE}/hierarchy/${body.type}s`

    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Customer service responded with ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Customer API POST error:', error)
    return NextResponse.json({ error: 'Failed to create customer entity' }, { status: 500 })
  }
}
