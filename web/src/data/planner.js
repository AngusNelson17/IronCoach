// Shared planner data + date/event helpers used by both the dashboard UI
// (web/src/dashboard.jsx) and the server-side cron sync
// (web/api/google/cron-sync.js).
//
// Date handling here is intentionally string-based and UTC-anchored. Vercel
// serverless functions run with TZ=UTC, so any `new Date().setHours(7)` on
// the server would land at 07:00 UTC, not 07:00 Melbourne. We avoid that by
// building wall-clock "YYYY-MM-DDTHH:MM:00" + a timeZone field; Google
// Calendar interprets it in the named zone.

export const APP_TIMEZONE = 'Australia/Melbourne'

export const DEFAULT_PLANNER = [
  {day:"Monday", sessions:[
    {id:"mon1", label:"Bike commute → South Yarra",                type:"Bike",  time:"07:00", mins:60},
    {id:"mon2", label:"Gym — Upper A (Anytime Fitness South Yarra)", type:"Gym", time:"08:00", mins:60},
    {id:"mon3", label:"Bike commute → home",                       type:"Bike",  time:"17:00", mins:30},
    {id:"mon4", label:"Swim",                                      type:"Swim",  time:"20:00", mins:60},
  ]},
  {day:"Tuesday", sessions:[
    {id:"tue1", label:"Morning walk",                              type:"Walk",  time:"06:30", mins:30},
    {id:"tue2", label:"Ride to work",                              type:"Bike",  time:"08:15", mins:30},
    {id:"tue3", label:"Ride home",                                 type:"Bike",  time:"17:00", mins:30},
    {id:"tue4", label:"Gym — Lower B (Anytime Fitness Kew)",       type:"Gym",   time:"17:30", mins:60},
  ]},
  {day:"Wednesday", sessions:[
    {id:"wed1", label:"Bike commute → South Yarra",                type:"Bike",  time:"07:00", mins:60},
    {id:"wed2", label:"Gym — Upper B (Anytime Fitness South Yarra)", type:"Gym", time:"08:00", mins:60},
    {id:"wed3", label:"Bike commute → home",                       type:"Bike",  time:"17:00", mins:30},
    {id:"wed4", label:"Swim",                                      type:"Swim",  time:"20:00", mins:60},
  ]},
  {day:"Thursday", sessions:[
    {id:"thu1", label:"Gym — Lower B (Anytime Fitness Kew)",       type:"Gym",   time:"07:00", mins:60},
    {id:"thu2", label:"Ride to work",                              type:"Bike",  time:"08:15", mins:30},
    {id:"thu3", label:"Ride home",                                 type:"Bike",  time:"17:00", mins:30},
    {id:"thu4", label:"Footy training",                            type:"Football", time:"18:00", mins:90, caution:true},
  ]},
  {day:"Friday", sessions:[
    {id:"fri1", label:"2-hour bike session",                       type:"Bike",  time:"06:00", mins:120},
    {id:"fri2", label:"45-min run session",                        type:"Run",   time:"08:15", mins:45, caution:true},
  ]},
  {day:"Saturday", sessions:[
    {id:"sat1", label:"Stretching / Pilates (Week A)",             type:"Mobility", time:"09:00", mins:45},
    {id:"sat2", label:"Bike ride with Dad (Week B)",               type:"Bike",     time:"07:00", mins:120},
  ]},
  {day:"Sunday", sessions:[
    {id:"sun1", label:"Long run",                                  type:"Run",   time:"08:00", mins:120, caution:true},
  ]},
]

const DAY_INDEX = { Monday:0, Tuesday:1, Wednesday:2, Thursday:3, Friday:4, Saturday:5, Sunday:6 }

const pad2 = (n) => String(n).padStart(2, '0')

// Add days to a YYYY-MM-DD string using UTC math (no TZ drift).
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const u = new Date(Date.UTC(y, m - 1, d + days))
  return u.toISOString().split('T')[0]
}

// Monday-anchored week-start for a YYYY-MM-DD date.
export function weekStartOfDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const u = new Date(Date.UTC(y, m - 1, d))
  const day = u.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const offset = day === 0 ? -6 : 1 - day
  u.setUTCDate(u.getUTCDate() + offset)
  return u.toISOString().split('T')[0]
}

// Today's date in a named timezone (defaults to APP_TIMEZONE).
export function todayInTz(timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

// Build Google Calendar events for a week of the planner. Uses wall-clock
// dateTime + timeZone so it's correct regardless of the runtime's TZ.
export function plannerToCalendarEvents(planner, weekStart, timeZone = APP_TIMEZONE) {
  const events = []
  for (const day of planner) {
    const dateStr = addDays(weekStart, DAY_INDEX[day.day] ?? 0)
    for (const s of day.sessions) {
      const [hh, mm] = (s.time || '07:00').split(':').map(Number)
      const dur = s.mins || 60
      const startTotal = hh * 60 + mm
      const endTotal = startTotal + dur

      const startStr = `${dateStr}T${pad2(hh)}:${pad2(mm)}:00`
      const overflow = endTotal >= 24 * 60
      const endDateStr = overflow ? addDays(dateStr, 1) : dateStr
      const eMins = overflow ? endTotal - 24 * 60 : endTotal
      const endStr = `${endDateStr}T${pad2(Math.floor(eMins / 60))}:${pad2(eMins % 60)}:00`

      events.push({
        sessionId: s.id,
        summary: `🏃 ${s.label}`,
        description: `IronCoach planner · ${s.type}${s.caution ? '\n⚠ Wait for physio clearance' : ''}`,
        start: { dateTime: startStr, timeZone },
        end:   { dateTime: endStr,   timeZone },
      })
    }
  }
  return events
}
