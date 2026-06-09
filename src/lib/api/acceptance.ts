import { http } from './http'
import type { ListResponse, ItemResponse, AcceptanceDTO } from './types'

export const AcceptanceAPI = {
  list: () => http.get<ListResponse<AcceptanceDTO>>(`/acceptance`),
  get: (id: string) => http.get<ItemResponse<AcceptanceDTO>>(`/acceptance/${id}`),
  create: (payload: Partial<AcceptanceDTO>) =>
    http.post<ItemResponse<AcceptanceDTO>>(`/acceptance`, payload),
  updateStatus: (id: string, status: string) =>
    http.patch<ItemResponse<AcceptanceDTO>>(`/acceptance/${id}/status`, { status }),
}
