/**
 * Acceptance Management Types
 * 驗收管理相關型別定義
 */

export interface AcceptedItem {
  id: string
  itemCode: string
  itemName: string
  orderedQuantity: number
  receivedQuantity: number
  unit: string
  qualityRating: 1 | 2 | 3 | 4 | 5
  condition: 'excellent' | 'good' | 'acceptable' | 'poor' | 'damaged'
  expiryDate?: string
  temperature?: number
  notes?: string
  photos: string[]
}

export interface AcceptanceDiscrepancy {
  id: string
  type:
    | 'quantity_short'
    | 'quantity_over'
    | 'quality_issue'
    | 'packaging_damage'
    | 'expired'
    | 'wrong_item'
    | 'other'
  severity: 'minor' | 'major' | 'critical'
  itemCode: string
  description: string
  evidencePhotos: string[]
  proposedResolution: string
  financialImpact?: number
}

export interface AcceptanceRecord {
  id: string
  orderId: string
  orderNumber: string
  supplier: {
    name: string
    contact: string
    phone: string
  }
  acceptedBy: string
  acceptanceTime: string
  acceptanceLocation: string
  items: AcceptedItem[]
  overallRating: 1 | 2 | 3 | 4 | 5
  notes?: string
  discrepancies: AcceptanceDiscrepancy[]
  status: 'in_progress' | 'completed' | 'disputed'
  deliveryTime: string
  requestedDeliveryTime: string
}

export type AcceptanceStatus = AcceptanceRecord['status']

export interface AcceptanceStats {
  inProgress: number
  disputed: number
  completed: number
  avgRating: number
}

export interface AcceptanceFilterState {
  searchTerm: string
  statusFilter: string
}

export interface StatusOption {
  value: string
  label: string
}

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: '所有狀態' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '已完成' },
  { value: 'disputed', label: '有爭議' },
]
