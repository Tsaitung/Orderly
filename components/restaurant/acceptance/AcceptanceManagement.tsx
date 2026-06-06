'use client'

/**
 * AcceptanceManagement Component
 * 驗收管理容器組件
 */

import { Card, CardContent } from '@/components/ui/card'
import { useAcceptanceManagement } from './hooks/useAcceptanceManagement'
import { AcceptanceStatsCards } from './components/AcceptanceStatsCards'
import { AcceptanceHeader } from './components/AcceptanceHeader'
import { AcceptanceFilters } from './components/AcceptanceFilters'
import { AcceptanceList } from './components/AcceptanceList'
import { AcceptanceDetail } from './components/AcceptanceDetail'
import { AcceptanceErrorState } from './components/AcceptanceErrorState'
import { NewAcceptanceDialog } from './components/NewAcceptanceDialog'

export function AcceptanceManagement(): React.ReactElement {
  const {
    filteredRecords,
    stats,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedRecord,
    isDetailOpen,
    setIsDetailOpen,
    isNewAcceptanceOpen,
    setIsNewAcceptanceOpen,
    fetchAcceptanceRecords,
    handleViewDetail,
  } = useAcceptanceManagement()

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <AcceptanceStatsCards stats={stats} />

      {/* 操作工具欄 */}
      <Card>
        <AcceptanceHeader
          isLoading={isLoading}
          onRefresh={fetchAcceptanceRecords}
          onNewAcceptance={() => setIsNewAcceptanceOpen(true)}
        />

        <CardContent className="space-y-4">
          {/* 搜尋和篩選 */}
          <AcceptanceFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
          />

          {/* 錯誤狀態 */}
          {error && <AcceptanceErrorState error={error} onRetry={fetchAcceptanceRecords} />}

          {/* 驗收記錄列表 */}
          <AcceptanceList
            records={filteredRecords}
            isLoading={isLoading}
            onViewDetail={handleViewDetail}
          />
        </CardContent>
      </Card>

      {/* 驗收詳情對話框 */}
      <AcceptanceDetail
        record={selectedRecord}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      {/* 新增驗收對話框 */}
      <NewAcceptanceDialog
        isOpen={isNewAcceptanceOpen}
        onClose={() => setIsNewAcceptanceOpen(false)}
      />
    </div>
  )
}

export default AcceptanceManagement
