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
  return `${id}@gestionescadenze.app`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')
    const token = url.searchParams.get('token')

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

    // Fetch user's reminders
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching reminders:', error)
      return new Response('Error fetching reminders', { status: 500 })
    }

    // Generate ICS content
    const now = new Date()
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gestione Scadenze//Calendar Feed//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Scadenze',
      'X-WR-TIMEZONE:Europe/Rome',
    ]

    for (const reminder of reminders || []) {
      const dueDate = new Date(reminder.due_date)
      const dateStr = formatICSDate(dueDate)
      
      const event = [
        'BEGIN:VEVENT',
        `UID:${generateUID(reminder.id)}`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `DTEND;VALUE=DATE:${dateStr}`,
        `SUMMARY:${escapeICSText(reminder.title)}`,
      ]

      if (reminder.description) {
        event.push(`DESCRIPTION:${escapeICSText(reminder.description)}`)
      }

      if (reminder.amount) {
        const amountText = `Importo: €${reminder.amount.toFixed(2)}`
        if (reminder.description) {
          event[event.length - 1] = `DESCRIPTION:${escapeICSText(reminder.description + '\\n' + amountText)}`
        } else {
          event.push(`DESCRIPTION:${escapeICSText(amountText)}`)
        }
      }

      // Add alarm if notify_days_before is set
      if (reminder.notify_days_before && reminder.notify_days_before > 0) {
        event.push('BEGIN:VALARM')
        event.push('ACTION:DISPLAY')
        event.push(`DESCRIPTION:Promemoria: ${escapeICSText(reminder.title)}`)
        event.push(`TRIGGER:-P${reminder.notify_days_before}D`)
        event.push('END:VALARM')
      }

      event.push('END:VEVENT')
      icsContent = icsContent.concat(event)
    }

    icsContent.push('END:VCALENDAR')

    return new Response(icsContent.join('\r\n'), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="scadenze.ics"',
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})
