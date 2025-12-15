import { useRouter } from 'vue-router'

export function useChangeOrderPrint() {
  const router = useRouter()

  const openChangeOrderPrint = (changeOrderOrId: { uuid?: string } | string) => {
    const id = typeof changeOrderOrId === 'string' ? changeOrderOrId : changeOrderOrId?.uuid
    if (!id) return

    const targetUrl = `/change-orders/print/${id}`
    try {
      const resolved = router.resolve(targetUrl)
      window.open(resolved.href, '_blank')
    } catch {
      window.open(targetUrl, '_blank')
    }
  }

  return { openChangeOrderPrint }
}
