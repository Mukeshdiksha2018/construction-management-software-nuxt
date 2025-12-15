import { defineEventHandler } from 'h3'
import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async () => {
  const { data, error } = await supabaseServer
    .from('location')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
})


