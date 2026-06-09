'use client'

/**
 * useAcceptanceManagement Hook
 * 驗收管理業務邏輯
 */

import * as React from 'react'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import type { AcceptanceRecord, AcceptanceStats } from '../types'
import { mockAcceptanceRecords } from '../mock-data'

interface UseAcceptanceManagementOptions {
  initialSearchTerm?: string
  initialStatusFilter?: string
}

interface UseAcceptanceManagementReturn {
  // 資料狀態
  acceptanceRecords: AcceptanceRecord[]
  filteredRecords: AcceptanceRecord[]
  stats: AcceptanceStats
  isLoading: boolean
  error: string | null

  // 篩選狀態
  searchTerm: string
  setSearchTerm: (term: string) => void
  statusFilter: string
  setStatusFilter: (filter: string) => void

  // 選取狀態
  selectedRecord: AcceptanceRecord | null
  setSelectedRecord: (record: AcceptanceRecord | null) => void
  isDetailOpen: boolean
  setIsDetailOpen: (open: boolean) => void
  isNewAcceptanceOpen: boolean
  setIsNewAcceptanceOpen: (open: boolean) => void

  // 操作
  fetchAcceptanceRecords: () => Promise<void>
  handleViewDetail: (record: AcceptanceRecord) => void
}

export function useAcceptanceManagement(
  options: UseAcceptanceManagementOptions = {}
): UseAcceptanceManagementReturn {
  const { initialSearchTerm = '', initialStatusFilter = 'all' } = options

  // 資料狀態
  const [acceptanceRecords, setAcceptanceRecords] = React.useState<AcceptanceRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // 篩選狀態
  const [searchTerm, setSearchTerm] = React.useState(initialSearchTerm)
  const [statusFilter, setStatusFilter] = React.useState(initialStatusFilter)

  // UI 狀態
  const [selectedRecord, setSelectedRecord] = React.useState<AcceptanceRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isNewAcceptanceOpen, setIsNewAcceptanceOpen] = React.useState(false)

  const { announcePolite } = useScreenReaderAnnouncer()

  // 獲取驗收記錄
  const fetchAcceptanceRecords = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/bff/api/acceptance')
      const data = await response.json()

      if (data.success) {
        const records = data.data.map((record: AcceptanceRecord) => ({
          ...record,
          acceptanceTime: record.acceptanceTime || '',
          deliveryTime: record.deliveryTime || '',
          requestedDeliveryTime: record.requestedDeliveryTime || '',
        }))
        setAcceptanceRecords(records)
        announcePolite(`已載入 ${records.length} 筆驗收記錄`)
      } else {
        throw new Error(data.error || 'Failed to fetch acceptance records')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      announcePolite(`載入失敗：${errorMessage}`)

      // Fallback to mock data
      setAcceptanceRecords(mockAcceptanceRecords)
    } finally {
      setIsLoading(false)
    }
  }, [announcePolite])

  // 初始載入
  React.useEffect(() => {
    fetchAcceptanceRecords()
  }, [fetchAcceptanceRecords])

  // 篩選後的記錄
  const filteredRecords = React.useMemo(() => {
    return acceptanceRecords.filter(record => {
      const matchesSearch =
        searchTerm === '' ||
        record.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.acceptedBy.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || record.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [acceptanceRecords, searchTerm, statusFilter])

  // 統計數據
  const stats = React.useMemo<AcceptanceStats>(() => {
    const inProgress = acceptanceRecords.filter(r => r.status === 'in_progress').length
    const disputed = acceptanceRecords.filter(r => r.status === 'disputed').length
    const completed = acceptanceRecords.filter(r => r.status === 'completed').length
    const avgRating =
      acceptanceRecords.length > 0
        ? acceptanceRecords.reduce((sum, r) => sum + r.overallRating, 0) / acceptanceRecords.length
        : 0

    return { inProgress, disputed, completed, avgRating }
  }, [acceptanceRecords])

  // 查看詳情
  const handleViewDetail = React.useCallback(
    (record: AcceptanceRecord) => {
      setSelectedRecord(record)
      setIsDetailOpen(true)
      announcePolite(`查看驗收記錄 ${record.orderNumber} 詳細資訊`)
    },
    [announcePolite]
  )

  return {
    // 資料狀態
    acceptanceRecords,
    filteredRecords,
    stats,
    isLoading,
    error,

    // 篩選狀態
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,

    // 選取狀態
    selectedRecord,
    setSelectedRecord,
    isDetailOpen,
    setIsDetailOpen,
    isNewAcceptanceOpen,
    setIsNewAcceptanceOpen,

    // 操作
    fetchAcceptanceRecords,
    handleViewDetail,
  }
}
