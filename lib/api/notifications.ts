import { http } from './http'
import type { ListResponse, ItemResponse, NotificationDTO } from './types'

export const NotificationsAPI = {
  list: () => http.get<ListResponse<NotificationDTO>>(`/notifications`),
  create: (payload: any) => http.post<ItemResponse<NotificationDTO>>(`/notifications`, payload),
  markRead: (id: string) => http.patch<ItemResponse<NotificationDTO>>(`/notifications/${id}/read`, {})
}

