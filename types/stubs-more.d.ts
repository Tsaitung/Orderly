declare module '@/lib/utils' {
  export const cn: (...classes: (string | undefined | null | false)[]) => string
  const utilsModule: Record<string, unknown>
  export default utilsModule
}

declare module '@/lib/webhooks/*' {
  const webhooksModule: Record<string, unknown>
  export default webhooksModule
  export = webhooksModule
}

declare module '@/lib/redis' {
  export const CacheService: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown, ttl?: number) => Promise<boolean>
    delete: (key: string) => Promise<boolean>
  }
  const redisModule: Record<string, unknown>
  export default redisModule
}

declare module '@/lib/webhooks/webhook-manager' {
  export const webhookManager: {
    triggerEvent: (eventType: string, data: Record<string, unknown>) => Promise<void>
    register: (eventType: string, handler: (data: Record<string, unknown>) => Promise<void>) => void
  }
  const webhookModule: Record<string, unknown>
  export default webhookModule
}
