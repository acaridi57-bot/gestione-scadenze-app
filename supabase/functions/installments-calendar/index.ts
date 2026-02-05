import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatICSDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function generateUID(id: string): string {
  return `installment-${id}@gestionescadenze.app`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')
    const token = url.searchParams.get('token')
    const planId = url.searchParams.get('plan_id') // Optional: export specific plan

    if (!userId || !token) {
      return new Response('Missing user_id or token', { status: 400 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify the token matches the user (simple token = base64 of user_id)
    const expectedToken = btoa(userId).replace(/=/g, '')
    if (token !== expectedToken) {
      return new Response('Invalid token', { status: 401 })
    }

    // Build query for transactions with plan_id
    let query = supabase
      .from('transactions')
      .select('*, plans!inner(title)')
      .eq('user_id', userId)
      .not('plan_id', 'is', null)
      .order('date', { ascending: true })

    // If specific plan requested, filter by it
    if (planId) {
      query = query.eq('plan_id', planId)
    }

    const { data: installments, error } = await query

    if (error) {
      console.error('Error fetching installments:', error)
      return new Response('Error fetching installments', { status: 500 })
    }

    // Generate ICS content
    const now = new Date()
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gestione Scadenze//Installments Calendar//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Rate Pagamenti',
      'X-WR-TIMEZONE:Europe/Rome',
    ]

    for (const installment of installments || []) {
      // Skip already paid installments
      const isPaid = installment.is_partial === true || 
        (Number(installment.paid_amount) >= Number(installment.amount))
      
      if (isPaid) continue

      const dueDate = new Date(installment.date)
      const dateStr = formatICSDate(dueDate)
      
      const title = installment.description || 
        `Rata ${installment.installment_index}/${installment.installment_total}`
      
      const planTitle = installment.plans?.title || 'Piano Rate'
      
      const event = [
        'BEGIN:VEVENT',
        `UID:${generateUID(installment.id)}`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `DTEND;VALUE=DATE:${dateStr}`,
        `SUMMARY:💳 ${escapeICSText(title)}`,
        `DESCRIPTION:${escapeICSText(`Piano: ${planTitle}\\nImporto: €${Number(installment.amount).toFixed(2)}\\nRata ${installment.installment_index} di ${installment.installment_total}`)}`,
        'CATEGORIES:Rate,Pagamenti',
      ]

      // Add alarm 3 days before
      event.push('BEGIN:VALARM')
      event.push('ACTION:DISPLAY')
      event.push(`DESCRIPTION:Rata in scadenza: ${escapeICSText(title)}`)
      event.push('TRIGGER:-P3D')
      event.push('END:VALARM')

      // Add alarm 1 day before
      event.push('BEGIN:VALARM')
      event.push('ACTION:DISPLAY')
      event.push(`DESCRIPTION:Rata in scadenza domani: ${escapeICSText(title)}`)
      event.push('TRIGGER:-P1D')
      event.push('END:VALARM')

      event.push('END:VEVENT')
      icsContent = icsContent.concat(event)
    }

    icsContent.push('END:VCALENDAR')

    return new Response(icsContent.join('\r\n'), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="rate-pagamenti.ics"',
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})
