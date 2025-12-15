import { defineEventHandler, getRouterParam } from 'h3'
import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const uuid = getRouterParam(event, 'uuid')
  if (!uuid) return { success: false, error: 'Missing uuid' }

  const { error } = await supabaseServer
    .from('location')
    .delete()
    .eq('uuid', uuid)

  if (error) return { success: false, error: error.message }
  return { success: true }
})


