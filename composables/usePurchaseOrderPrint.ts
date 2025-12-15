import { useRouter } from 'vue-router'

export function usePurchaseOrderPrint() {
  const router = useRouter()

  const openPurchaseOrderPrint = (purchaseOrderOrId: { uuid?: string } | string) => {
    const id = typeof purchaseOrderOrId === 'string' ? purchaseOrderOrId : purchaseOrderOrId?.uuid
    if (!id) return

    const targetUrl = `/purchase-orders/print/${id}`
    try {
      const resolved = router.resolve(targetUrl)
      window.open(resolved.href, '_blank')
    } catch {
      window.open(targetUrl, '_blank')
    }
  }

  return { openPurchaseOrderPrint }
}

