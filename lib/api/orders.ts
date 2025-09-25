import { http } from './http'
import type { ListResponse, ItemResponse, OrderDTO } from './types'

export const OrdersAPI = {
  list: () => http.get<ListResponse<OrderDTO>>(`/orders`),
  get: (id: string) => http.get<ItemResponse<OrderDTO>>(`/orders/${id}`),
  create: (payload: Partial<OrderDTO>) => http.post<ItemResponse<OrderDTO>>(`/orders`, payload),
  updateStatus: (id: string, status: string) =>
    http.patch<ItemResponse<OrderDTO>>(`/orders/${id}/status`, { status }),
}
