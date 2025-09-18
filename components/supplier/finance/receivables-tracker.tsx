'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function ReceivablesTracker({ searchParams }: any) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">應收帳款追蹤</h2>
      <div className="text-center py-12 text-gray-500">
        應收帳款追蹤功能開發中...
      </div>
    </Card>
  )
}