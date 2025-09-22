declare module '@/lib/erp/*' {
  const erpModule: Record<string, unknown>
  export default erpModule
  export = erpModule
}
