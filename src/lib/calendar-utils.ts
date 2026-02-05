import { format } from 'date-fns';

export interface CalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  reminder?: number; // minutes before
}

/**
 * Generates an ICS (iCalendar) file content for a single event
 */
export function generateICSEvent(event: CalendarEvent): string {
  const formatICSDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const escapeICS = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const uid = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@gestionescadenze`;
  const start = formatICSDate(event.startDate);
  const end = event.endDate ? formatICSDate(event.endDate) : formatICSDate(new Date(event.startDate.getTime() + 60 * 60 * 1000)); // +1 hour if no end
  const now = formatICSDate(new Date());

  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gestione Scadenze//IT
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${escapeICS(event.title)}`;

  if (event.description) {
    ics += `\nDESCRIPTION:${escapeICS(event.description)}`;
  }

  if (event.location) {
    ics += `\nLOCATION:${escapeICS(event.location)}`;
  }

  // Add alarm/reminder
  if (event.reminder !== undefined) {
    ics += `
BEGIN:VALARM
TRIGGER:-PT${event.reminder}M
ACTION:DISPLAY
DESCRIPTION:${escapeICS(event.title)}
END:VALARM`;
  }

  ics += `
END:VEVENT
END:VCALENDAR`;

  return ics;
}

/**
 * Generates an ICS file content for multiple events
 */
export function generateICSCalendar(events: CalendarEvent[], calendarName: string = 'Gestione Scadenze'): string {
  const formatICSDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const escapeICS = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const now = formatICSDate(new Date());

  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gestione Scadenze//IT
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeICS(calendarName)}`;

  events.forEach((event, index) => {
    const uid = `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 11)}@gestionescadenze`;
    const start = formatICSDate(event.startDate);
    const end = event.endDate ? formatICSDate(event.endDate) : formatICSDate(new Date(event.startDate.getTime() + 60 * 60 * 1000));

    ics += `
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${escapeICS(event.title)}`;

    if (event.description) {
      ics += `\nDESCRIPTION:${escapeICS(event.description)}`;
    }

    if (event.location) {
      ics += `\nLOCATION:${escapeICS(event.location)}`;
    }

    if (event.reminder !== undefined) {
      ics += `
BEGIN:VALARM
TRIGGER:-PT${event.reminder}M
ACTION:DISPLAY
DESCRIPTION:${escapeICS(event.title)}
END:VALARM`;
    }

    ics += `
END:VEVENT`;
  });

  ics += `
END:VCALENDAR`;

  return ics;
}

/**
 * Downloads an ICS file
 */
export function downloadICSFile(content: string, filename: string = 'scadenze.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens the calendar app with the event (data URI approach)
 */
export function openInCalendar(event: CalendarEvent): void {
  const icsContent = generateICSEvent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link and click it
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup after a delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Generates a Google Calendar URL for adding an event
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const formatGoogleDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000))}`,
  });

  if (event.description) {
    params.set('details', event.description);
  }

  if (event.location) {
    params.set('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
