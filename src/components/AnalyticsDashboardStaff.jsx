import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import { supabase } from '#lib/supabase'
import {
  useWaitTimes, useNoShowRates, useCustomView,
} from '#hooks/useAnalytics'
import { exportCSV, exportPDF } from '#utils/exportUtils'
import AIAssistant from './AIAssistant'
import './AnalyticsDashboardStaff.css'

const TABS = ['Wait Times', 'No-Show Rates', 'Custom View']

const HOUR_LABEL = (h) => {
  if (h === 0)  return '12 am'
  if (h < 12)   return `${h} am`
  if (h === 12) return '12 pm'
  return `${h - 12} pm`
}

const STATUS_BADGE = {
  complete:  'badge--completed',
  confirmed: 'badge--confirmed',
  no_show:   'badge--no_show',
  cancelled: 'badge--cancelled',
  booked:    'badge--booked',
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <article className="stat-card">
      <h3 className="stat-label">{label}</h3>
      <p className={`stat-value${accent ? ' stat-value--accent' : ''}`}>{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </article>
  )
}

function ExportBar({ onCSV, onPDF, disabled }) {
  return (
    <menu className="export-bar">
      <li>
        <button onClick={onCSV} disabled={disabled} className="btn-export">↓ CSV</button>
      </li>
      <li>
        <button onClick={onPDF} disabled={disabled} className="btn-export btn-export--pdf">↓ PDF</button>
      </li>
    </menu>
  )
}

function DateRange({ start, end, onStart, onEnd }) {
  return (
    <fieldset className="date-range" style={{ border: 0, padding: 0, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <legend className="sr-only">Date range</legend>
      <label htmlFor="date-start" className="sr-only">Start date</label>
      <input id="date-start" type="date" value={start} onChange={e => onStart(e.target.value || null)} />
      <section aria-hidden="true" style={{ color: '#94a3b8' }}>—</section>
      <label htmlFor="date-end" className="sr-only">End date</label>
      <input id="date-end" type="date" value={end} onChange={e => onEnd(e.target.value || null)} />
    </fieldset>
  )
}

function ChartCard({ title, children }) {
  return (
    <section className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {children}
    </section>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.06)' },
  cursor: { fill: '#f8fafc' },
}

function WaitTimesReport({ facilityId }) {
  const { data, loading } = useWaitTimes({ facilityId })
  const chartData = data.map(d => ({
    hour: HOUR_LABEL(d.hour_of_day),
    'Avg Wait': +d.avg_wait_minutes,
    'Min Wait': +d.min_wait_minutes,
    'Max Wait': +d.max_wait_minutes,
    total_served: d.total_served,
  }))
  const totalServed = data.reduce((s, d) => s + Number(d.total_served), 0)
  const weightedAvg = totalServed
    ? (data.reduce((s, d) => s + d.avg_wait_minutes * d.total_served, 0) / totalServed).toFixed(1)
    : '—'
  const peakRow = data.reduce((m, d) => (!m || d.avg_wait_minutes > m.avg_wait_minutes ? d : m), null)
  const CSV_COLS = [
    { header: 'Hour of Day',    dataKey: 'hour' },
    { header: 'Avg Wait (min)', dataKey: 'Avg Wait' },
    { header: 'Min Wait (min)', dataKey: 'Min Wait' },
    { header: 'Max Wait (min)', dataKey: 'Max Wait' },
  ]
  return (
    <section className="tab-section">
      <header className="controls">
        <section />
        <ExportBar
          disabled={loading || !data.length}
          onCSV={() => exportCSV(chartData, 'wait-times')}
          onPDF={() => exportPDF(chartData, { title: 'Average Patient Wait Times by Hour of Day', columns: CSV_COLS, filename: 'wait-times' })}
        />
      </header>
      <ul className="stats-grid stats-grid--3">
        <li><StatCard label="Overall Avg Wait" value={loading ? '…' : `${weightedAvg} min`} /></li>
        <li><StatCard label="Peak Hour" value={loading ? '…' : (peakRow ? HOUR_LABEL(peakRow.hour_of_day) : '—')} sub={peakRow ? `${peakRow.avg_wait_minutes} min avg` : undefined} accent /></li>
        <li><StatCard label="Total Served" value={loading ? '…' : totalServed.toLocaleString()} /></li>
      </ul>
      <ChartCard title="Average Wait Time by Hour of Day (minutes)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" m" />
            <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v} min`]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Min Wait" fill="#99f6e4" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Avg Wait" fill="#14b8a6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Max Wait" fill="#0f766e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  )
}

function NoShowReport({ facilityId }) {
  const [start, setStart] = useState('')
  const [end,   setEnd]   = useState('')
  const { data, loading } = useNoShowRates({ facilityId, startDate: start || null, endDate: end || null })
  const chartData = [...data].reverse().map(d => ({
    date: d.date,
    'No-Show Rate %': +d.no_show_rate_pct,
    'No-Shows': +d.no_shows,
    'Total': +d.total_appointments,
  }))
  const totalAppts   = data.reduce((s, d) => s + Number(d.total_appointments), 0)
  const totalNoShows = data.reduce((s, d) => s + Number(d.no_shows), 0)
  const overallRate  = totalAppts ? ((totalNoShows / totalAppts) * 100).toFixed(1) : '—'
  const isHigh       = Number(overallRate) >= 20
  const CSV_COLS = [
    { header: 'Date',                dataKey: 'date' },
    { header: 'No-Show Rate (%)',    dataKey: 'No-Show Rate %' },
    { header: 'No-Shows',           dataKey: 'No-Shows' },
    { header: 'Total Appointments', dataKey: 'Total' },
  ]
  return (
    <section className="tab-section">
      <header className="controls">
        <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
        <ExportBar
          disabled={loading || !data.length}
          onCSV={() => exportCSV(chartData, 'noshows')}
          onPDF={() => exportPDF(chartData, { title: 'Appointment No-Show Rates', columns: CSV_COLS, filename: 'noshows' })}
        />
      </header>
      <ul className="stats-grid stats-grid--4">
        <li><StatCard label="Overall No-Show Rate" value={loading ? '…' : `${overallRate}%`} accent={isHigh} /></li>
        <li><StatCard label="Total No-Shows"        value={loading ? '…' : totalNoShows.toLocaleString()} accent /></li>
        <li><StatCard label="Total Appointments"    value={loading ? '…' : totalAppts.toLocaleString()} /></li>
        <li><StatCard label="Days Analysed"         value={loading ? '…' : data.length} /></li>
      </ul>
      {isHigh && !loading && (
        <aside role="alert" className="warning-banner">
          ⚠️ No-show rate is above 20%. Consider enabling appointment reminders 24 hours before each slot.
        </aside>
      )}
      <ChartCard title="No-Show Rate Over Time (%)">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" domain={[0, 100]} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v, name) => name === 'No-Show Rate %' ? [`${v}%`, 'No-Show Rate'] : [v, name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="No-Show Rate %" stroke="#f43f5e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="Total" stroke="#cbd5e1" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  )
}

const COLUMNS = [
  { key: 'booked_at', label: 'Booked At', render: v => v ? new Date(v).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : '—' },
  { key: 'patient_name', label: 'Patient', render: (_v, row) => [row.patient_name, row.patient_surname].filter(Boolean).join(' ') || '—', exportValue: (_v, row) => [row.patient_name, row.patient_surname].filter(Boolean).join(' ') },
  { key: 'patient_contact', label: 'Contact', render: (_v, row) => row.patient_email ?? row.patient_phone ?? '—', exportValue: (_v, row) => row.patient_email || row.patient_phone || '' },
  { key: 'appointment_type', label: 'Type', render: v => v?.replace('_', ' ') ?? '—' },
  { key: 'status', label: 'Status', render: v => <mark className={`badge ${STATUS_BADGE[v] ?? 'badge--cancelled'}`}>{v?.replace('_', ' ')}</mark> },
  { key: 'queue_status',    label: 'Queue',   render: v => v ?? '—' },
  { key: 'wait_minutes',    label: 'Wait',    render: v => v != null ? `${v} min` : '—' },
  { key: 'service_minutes', label: 'Service', render: v => v != null ? `${v} min` : '—' },
]

function CustomViewReport({ facilityId }) {
  const [status, setStatus] = useState('')
  const [type,   setType]   = useState('')
  const [start,  setStart]  = useState('')
  const [end,    setEnd]    = useState('')
  const { data, loading } = useCustomView({ facilityId, status: status || null, type: type || null, startDate: start || null, endDate: end || null })
  const flatForExport = data.map(row => Object.fromEntries(COLUMNS.map(c => [c.label, c.exportValue ? c.exportValue(row[c.key], row) : (row[c.key] ?? '')])))
  const PDF_COLS = COLUMNS.map(c => ({ header: c.label, dataKey: c.label }))
  return (
    <section className="tab-section">
      <header className="controls">
        <fieldset className="controls-left" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sr-only">Filter appointments</legend>
          <label htmlFor="filter-status" className="sr-only">Status</label>
          <select id="filter-status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="confirmed">Confirmed</option>
            <option value="complete">Completed</option>
            <option value="no_show">No-Show</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <label htmlFor="filter-type" className="sr-only">Appointment type</label>
          <select id="filter-type" value={type} onChange={e => setType(e.target.value)}>
            <option value="">All Types</option>
            <option value="scheduled">Scheduled</option>
            <option value="walk_in">Walk-in</option>
          </select>
          <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
        </fieldset>
        <ExportBar disabled={loading || !data.length} onCSV={() => exportCSV(flatForExport, 'appointments')} onPDF={() => exportPDF(flatForExport, { title: 'Custom Appointments View', columns: PDF_COLS, filename: 'appointments' })} />
      </header>
      <section className="table-card">
        <header className="table-header">
          <h3>Appointments</h3>
          <output className="table-count">{loading ? 'Loading…' : `${data.length.toLocaleString()} records`}</output>
        </header>
        <section className="table-scroll">
          {loading ? (
            <p className="table-empty">Loading…</p>
          ) : data.length === 0 ? (
            <p className="table-empty">No appointments match your filters.</p>
          ) : (
            <table>
              <thead>
                <tr>{COLUMNS.map(col => <th key={col.key} scope="col">{col.label}</th>)}</tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.id ?? i}>
                    {COLUMNS.map(col => <td key={col.key}>{col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </section>
    </section>
  )
}

export default function AnalyticsDashboardStaff() {
  const [activeTab,       setActiveTab]       = useState(0)
  const [facilityId,      setFacilityId]      = useState(null)
  const [facilityName,    setFacilityName]    = useState('')
  const [loadingFacility, setLoadingFacility] = useState(true)
  const [facilityError,   setFacilityError]   = useState('')

  useEffect(() => {
    async function loadFacility() {
      const identity = JSON.parse(localStorage.getItem('userIdentity') || '{}')
      if (!identity.auth_provider || !identity.provider_user_id) { setFacilityError('Not logged in.'); setLoadingFacility(false); return }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('id').eq('auth_provider', identity.auth_provider).eq('provider_user_id', identity.provider_user_id).maybeSingle()
      if (profileError || !profile) { setFacilityError('Could not load your profile.'); setLoadingFacility(false); return }
      const { data: assignment, error: assignError } = await supabase.from('staff_assignments').select('facility_id, facilities(id, name)').eq('profile_id', profile.id).maybeSingle()
      if (assignError || !assignment?.facility_id) { setFacilityError('You are not assigned to a facility yet.'); setLoadingFacility(false); return }
      setFacilityId(assignment.facility_id)
      setFacilityName(assignment.facilities?.name || '')
      setLoadingFacility(false)
    }
    loadFacility()
  }, [])

  if (loadingFacility) return <main className="analytics-page loading"><p>Loading facility…</p></main>
  if (facilityError)   return <main className="analytics-page loading"><p style={{ color: '#f43f5e' }}>{facilityError}</p></main>

  return (
    <section className="analytics-page">
      <main className="analytics-inner">
        <header className="page-header">
          <h1>Analytics</h1>
          <p>📍 {facilityName}</p>
        </header>
        <nav aria-label="Analytics sections">
          <ul role="tablist" className="tab-bar">
            {TABS.map((tab, i) => (
              <li key={tab} role="presentation">
                <button
                  role="tab"
                  aria-selected={activeTab === i}
                  aria-controls={`tabpanel-${i}`}
                  id={`tab-${i}`}
                  onClick={() => setActiveTab(i)}
                  className={activeTab === i ? 'tab-btn tab-btn--active' : 'tab-btn'}
                >
                  {tab}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <section id="tabpanel-0" role="tabpanel" aria-labelledby="tab-0" hidden={activeTab !== 0}>
          <WaitTimesReport facilityId={facilityId} />
        </section>
        <section id="tabpanel-1" role="tabpanel" aria-labelledby="tab-1" hidden={activeTab !== 1}>
          <NoShowReport facilityId={facilityId} />
        </section>
        <section id="tabpanel-2" role="tabpanel" aria-labelledby="tab-2" hidden={activeTab !== 2}>
          <CustomViewReport facilityId={facilityId} />
        </section>
      </main>
      <AIAssistant context={{ role: 'staff', facilityId, facilityName, pageContext: 'analytics - ' + TABS[activeTab] }} />
    </section>
  )
}