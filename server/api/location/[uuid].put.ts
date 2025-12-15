import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const uuid = getRouterParam(event, 'uuid')
  if (!uuid) return { success: false, error: 'Missing uuid' }

  const body = await readBody(event)
  const update: any = {}

  const allowed = [
    'location_name','location_code','description','address_line1','address_line2',
    'city','state','zip','country','phone','email','active'
  ]
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await supabaseServer
    .from('location')
    .update(update)
    .eq('uuid', uuid)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
})


