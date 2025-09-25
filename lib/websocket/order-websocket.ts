'use client'

import { createOrderStatusNotification } from '@/lib/hooks/useNotifications'

export interface OrderUpdateEvent {
  type: 'order_status_changed' | 'order_created' | 'order_updated' | 'order_deleted'
  order_id: string
  order_number: string
  customer_name: string
  organization_id: string
  timestamp: string
  data: {
    old_status?: string
    new_status?: string
    changes?: Record<string, any>
  }
}

interface OrderWebSocketOptions {
  organizationId: string
  onOrderUpdate?: (event: OrderUpdateEvent) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export class OrderWebSocket {
  private ws: WebSocket | null = null
  private organizationId: string
  private options: OrderWebSocketOptions
  private reconnectAttempts = 0
  private isConnecting = false
  private reconnectTimeout: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private listeners: Set<(event: OrderUpdateEvent) => void> = new Set()

  constructor(options: OrderWebSocketOptions) {
    this.organizationId = options.organizationId
    this.options = {
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...options,
    }
  }

  /**
   * 連接 WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        return
      }

      this.isConnecting = true

      // 在生產環境中，這將是真實的 WebSocket URL
      // const wsUrl = process.env.NODE_ENV === 'production'
      //   ? `wss://api.orderly.tw/ws/orders/${this.organizationId}`
      //   : `ws://localhost:8000/ws/orders/${this.organizationId}`;

      // Mock WebSocket URL for development
      const wsUrl = `ws://localhost:8001/ws/orders/${this.organizationId}`

      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('Order WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.options.onConnect?.()
          resolve()
        }

        this.ws.onmessage = event => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = event => {
          console.log('Order WebSocket disconnected:', event.code, event.reason)
          this.isConnecting = false
          this.stopHeartbeat()
          this.options.onDisconnect?.()

          if (
            this.options.autoReconnect &&
            this.reconnectAttempts < (this.options.maxReconnectAttempts || 10)
          ) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = error => {
          console.error('Order WebSocket error:', error)
          this.isConnecting = false
          this.options.onError?.(error)
          reject(error)
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  /**
   * 斷開 WebSocket 連接
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.listeners.clear()
  }

  /**
   * 添加事件監聽器
   */
  addListener(listener: (event: OrderUpdateEvent) => void): void {
    this.listeners.add(listener)
  }

  /**
   * 移除事件監聽器
   */
  removeListener(listener: (event: OrderUpdateEvent) => void): void {
    this.listeners.delete(listener)
  }

  /**
   * 獲取連接狀態
   */
  getConnectionState(): 'connecting' | 'open' | 'closed' | 'closing' {
    if (!this.ws) return 'closed'

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'open'
      case WebSocket.CLOSING:
        return 'closing'
      case WebSocket.CLOSED:
        return 'closed'
      default:
        return 'closed'
    }
  }

  /**
   * 發送消息到伺服器
   */
  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * 處理接收到的消息
   */
  private handleMessage(data: any): void {
    if (data.type === 'pong') {
      // 心跳回應
      return
    }

    if (data.type === 'order_update' && data.event) {
      const event: OrderUpdateEvent = data.event

      // 通知所有監聽器
      this.listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('Error in WebSocket listener:', error)
        }
      })

      // 調用主要回調
      this.options.onOrderUpdate?.(event)
    }
  }

  /**
   * 排程重新連接
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = Math.min(
      this.options.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1),
      30000 // 最大延遲 30 秒
    )

    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        console.error('WebSocket reconnect failed:', error)
      })
    }, delay)
  }

  /**
   * 開始心跳
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' })
    }, 30000) // 每 30 秒發送一次心跳
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }
}

/**
 * 創建一個單例的 WebSocket 連接管理器
 */
class OrderWebSocketManager {
  private connections: Map<string, OrderWebSocket> = new Map()

  /**
   * 獲取指定組織的 WebSocket 連接
   */
  getConnection(organizationId: string, options?: Partial<OrderWebSocketOptions>): OrderWebSocket {
    if (!this.connections.has(organizationId)) {
      const connection = new OrderWebSocket({
        organizationId,
        ...options,
      })
      this.connections.set(organizationId, connection)
    }

    return this.connections.get(organizationId)!
  }

  /**
   * 斷開指定組織的連接
   */
  disconnect(organizationId: string): void {
    const connection = this.connections.get(organizationId)
    if (connection) {
      connection.disconnect()
      this.connections.delete(organizationId)
    }
  }

  /**
   * 斷開所有連接
   */
  disconnectAll(): void {
    this.connections.forEach(connection => connection.disconnect())
    this.connections.clear()
  }
}

// 導出單例實例
export const orderWebSocketManager = new OrderWebSocketManager()

/**
 * React Hook 來使用 Order WebSocket
 */
export function useOrderWebSocket(
  organizationId: string | undefined,
  options?: {
    onOrderUpdate?: (event: OrderUpdateEvent) => void
    autoConnect?: boolean
  }
) {
  const [connectionState, setConnectionState] = React.useState<
    'connecting' | 'open' | 'closed' | 'closing'
  >('closed')
  const [lastEvent, setLastEvent] = React.useState<OrderUpdateEvent | null>(null)
  const connectionRef = React.useRef<OrderWebSocket | null>(null)
  const autoConnect = options?.autoConnect ?? true
  const onOrderUpdate = options?.onOrderUpdate

  React.useEffect(() => {
    if (!organizationId) return

    const connection = orderWebSocketManager.getConnection(organizationId, {
      onConnect: () => setConnectionState('open'),
      onDisconnect: () => setConnectionState('closed'),
      onOrderUpdate: event => {
        setLastEvent(event)
        onOrderUpdate?.(event)
      },
    })

    connectionRef.current = connection

    // 自動連接
    if (autoConnect) {
      connection.connect().catch(error => {
        console.error('Failed to connect to Order WebSocket:', error)
        setConnectionState('closed')
      })
    }

    return () => {
      // 組件卸載時不立即斷開連接，允許其他組件繼續使用
      connectionRef.current = null
    }
  }, [autoConnect, onOrderUpdate, organizationId])

  // 更新連接狀態
  React.useEffect(() => {
    if (!connectionRef.current) return

    const interval = setInterval(() => {
      const newState = connectionRef.current?.getConnectionState() || 'closed'
      setConnectionState(newState)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const connect = React.useCallback(() => {
    return connectionRef.current?.connect() || Promise.reject(new Error('No connection available'))
  }, [])

  const disconnect = React.useCallback(() => {
    if (organizationId) {
      orderWebSocketManager.disconnect(organizationId)
      setConnectionState('closed')
    }
  }, [organizationId])

  const addListener = React.useCallback((listener: (event: OrderUpdateEvent) => void) => {
    connectionRef.current?.addListener(listener)
  }, [])

  const removeListener = React.useCallback((listener: (event: OrderUpdateEvent) => void) => {
    connectionRef.current?.removeListener(listener)
  }, [])

  return {
    connectionState,
    lastEvent,
    connect,
    disconnect,
    addListener,
    removeListener,
    isConnected: connectionState === 'open',
  }
}

// React import for hooks
import React from 'react'
