export const ERPAdapterFactory = {
  createAdapter: (_config: any) => ({
    createOrder: async (_payload: any) => ({ success: true, data: { externalId: 'stub' } })
  })
}

