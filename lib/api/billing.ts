import { http } from './http'
import type { ListResponse, ItemResponse, InvoiceDTO } from './types'

export const BillingAPI = {
  list: () => http.get<ListResponse<InvoiceDTO>>(`/billing/invoices`),
  get: (id: string) => http.get<ItemResponse<InvoiceDTO>>(`/billing/invoices/${id}`),
  create: (payload: any) => http.post<ItemResponse<InvoiceDTO>>(`/billing/invoices`, payload),
  updateStatus: (id: string, status: string) => http.patch<ItemResponse<InvoiceDTO>>(`/billing/invoices/${id}/status`, { status })
}

