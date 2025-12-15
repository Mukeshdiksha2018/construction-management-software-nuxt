import { useRouter } from 'vue-router'

export function useEstimatePrint() {
  const router = useRouter()

  const openEstimatePrint = (estimateOrId: { uuid?: string } | string) => {
    const id = typeof estimateOrId === 'string' ? estimateOrId : estimateOrId?.uuid
    if (!id) return

    const targetUrl = `/estimates/print/${id}`
    try {
      const resolved = router.resolve(targetUrl)
      window.open(resolved.href, '_blank')
    } catch {
      window.open(targetUrl, '_blank')
    }
  }

  return { openEstimatePrint }
}


