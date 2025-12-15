import { ref, onUnmounted } from 'vue'

export interface ResizablePanelsOptions {
  minLeftWidth?: number
  minRightWidth?: number
  leftPanelRef: any
  rightPanelRef: any
}

export function useResizablePanels(options: ResizablePanelsOptions) {
  const { minLeftWidth = 300, minRightWidth = 250, leftPanelRef, rightPanelRef } = options
  
  const isResizing = ref(false)

  const startResize = (e: MouseEvent | TouchEvent) => {
    if (isResizing.value) return // Prevent multiple resize operations
    
    isResizing.value = true
    e.preventDefault()
    e.stopPropagation()
    
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const leftWidth = leftPanelRef.value?.getBoundingClientRect().width || 0
    const rightWidth = rightPanelRef.value?.getBoundingClientRect().width || 0
    
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizing.value) return
      
      e.preventDefault()
      e.stopPropagation()
      
      const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const deltaX = currentX - startX
      const newLeftWidth = leftWidth + deltaX
      const newRightWidth = rightWidth - deltaX
      
      // Apply minimum widths
      if (newLeftWidth >= minLeftWidth && newRightWidth >= minRightWidth) {
        if (leftPanelRef.value) {
          leftPanelRef.value.style.width = `${newLeftWidth}px`
          leftPanelRef.value.style.flex = 'none'
        }
        if (rightPanelRef.value) {
          rightPanelRef.value.style.width = `${newRightWidth}px`
          rightPanelRef.value.style.flex = 'none'
        }
      }
    }
    
    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      isResizing.value = false
      
      // Remove all event listeners
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleMouseMove)
      document.removeEventListener('touchend', handleMouseUp)
      
      // Reset cursor
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp, { passive: false })
    document.addEventListener('touchmove', handleMouseMove, { passive: false })
    document.addEventListener('touchend', handleMouseUp, { passive: false })
    
    // Set cursor and prevent text selection
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (isResizing.value) {
      isResizing.value = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  })

  return {
    isResizing,
    startResize
  }
}
