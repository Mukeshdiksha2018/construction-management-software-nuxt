import { defineEventHandler, readBody } from 'h3'
import { supabaseServer } from '@/utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const {
    location_name,
    location_code,
    description,
    address_line1,
    address_line2,
    city,
    state,
    zip,
    country,
    phone,
    email,
    active = true
  } = body || {}

  if (!location_name || !address_line1 || !city || !state || !zip || !country) {
    return { success: false, error: 'Missing required fields' }
  }

  const { data, error } = await supabaseServer
    .from('location')
    .insert({
      location_name: String(location_name).trim(),
      location_code: location_code ? String(location_code).trim() : null,
      description: description ?? null,
      address_line1: String(address_line1).trim(),
      address_line2: address_line2 ? String(address_line2).trim() : null,
      city: String(city).trim(),
      state: String(state).trim(),
      zip: String(zip).trim(),
      country: String(country).trim(),
      phone: phone ? String(phone).trim() : null,
      email: email ? String(email).trim() : null,
      active: Boolean(active)
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
})


