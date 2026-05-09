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
import './AnalyticsDashboard.css'

const TABS = ['Wait Times', 'No-Show Rates', 'Custom View']

const HOUR_LABEL = (h) => {
  if (h === 0)  return '12 am'
  if (h < 12)   return `${h} am`
  if (h === 12) return '12 pm'
  return `${h - 12} pm`
}

const STATUS_BADGE = {
  complete:  'ad-badge--completed',
  confirmed: 'ad-badge--confirmed',
  no_show:   'ad-badge--no_show',
  cancelled: 'ad-badge--cancelled',
  booked:    'ad-badge--booked',
}

function Skeleton({ chart = false }) {
  return <div className={chart ? 'ad-skeleton ad-skeleton--chart' : 'ad-skeleton ad-skeleton--row'} />
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="ad-stat-card">
      <p className="ad-stat-label">{label}</p>
      <p className={`ad-stat-value${accent ? ' ad-stat-value--accent' : ''}`}>{value}</p>
      {sub && <p className="ad-stat-sub">{sub}</p>}
    </div>
  )
}

function ExportBar({ onCSV, onPDF, disabled }) {
  return (
    <div className="ad-export-bar">
      <button onClick={onCSV} disabled={disabled} className="ad-btn-csv">
        <DownloadIcon /> CSV
      </button>
      <button onClick={onPDF} disabled={disabled} className="ad-btn-pdf">
        <DownloadIcon /> PDF
      </button>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1v7M3.5 6 6 8.5 8.5 6M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DateRange({ start, end, onStart, onEnd }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <input type="date" value={start} onChange={e => onStart(e.target.value || null)} className="ad-date-input" />
      <span className="ad-date-sep">—</span>
      <input type="date" value={end}   onChange={e => onEnd(e.target.value || null)}   className="ad-date-input" />
    </div>
  )
}

function ChartCard({ title, loading, children }) {
  return (
    <div className="ad-chart-card">
      <h3 className="ad-chart-title">{title}</h3>
      {loading ? <Skeleton chart /> : children}
    </div>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.06)' },
  cursor: { fill: '#f8fafc' },
}

function WaitTimesReport({ facilityId }) {
  const { data, loading } = useWaitTimes({ facilityId })

  const chartData = data.map(d => ({
    hour:         HOUR_LABEL(d.hour_of_day),
    'Avg Wait':   +d.avg_wait_minutes,
    'Min Wait':   +d.min_wait_minutes,
    'Max Wait':   +d.max_wait_minutes,
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
    <div className="ad-section">
      <div className="ad-controls">
        <div />
        <ExportBar
          disabled={loading || !data.length}
          onCSV={() => exportCSV(chartData, 'wait-times')}
          onPDF={() => exportPDF(chartData, { title: 'Average Patient Wait Times by Hour of Day', columns: CSV_COLS, filename: 'wait-times' })}
        />
      </div>

      <div className="ad-stats ad-stats--3">
        <StatCard label="Overall Avg Wait" value={loading ? '…' : `${weightedAvg} min`} />
        <StatCard
          label="Peak Hour"
          value={loading ? '…' : (peakRow ? HOUR_LABEL(peakRow.hour_of_day) : '—')}
          sub={peakRow ? `${peakRow.avg_wait_minutes} min avg` : undefined}
          accent
        />
        <StatCard label="Total Served" value={loading ? '…' : totalServed.toLocaleString()} />
      </div>

      <ChartCard title="Average Wait Time by Hour of Day (minutes)" loading={loading}>
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
    </div>
  )
}

// ── No-Show Rates ─────────────────────────────

function NoShowReport({ facilityId }) {
  const [start, setStart] = useState('')
  const [end,   setEnd]   = useState('')
  const { data, loading } = useNoShowRates({ facilityId, startDate: start || null, endDate: end || null })

  const chartData = [...data].reverse().map(d => ({
    date:             d.date,
    'No-Show Rate %': +d.no_show_rate_pct,
    'No-Shows':       +d.no_shows,
    'Total':          +d.total_appointments,
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
    <div className="ad-section">
      <div className="ad-controls">
        <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
        <ExportBar
          disabled={loading || !data.length}
          onCSV={() => exportCSV(chartData, 'noshows')}
          onPDF={() => exportPDF(chartData, { title: 'Appointment No-Show Rates', columns: CSV_COLS, filename: 'noshows' })}
        />
      </div>

      <div className="ad-stats ad-stats--4">
        <StatCard label="Overall No-Show Rate" value={loading ? '…' : `${overallRate}%`} accent={isHigh} />
        <StatCard label="Total No-Shows"        value={loading ? '…' : totalNoShows.toLocaleString()} accent />
        <StatCard label="Total Appointments"    value={loading ? '…' : totalAppts.toLocaleString()} />
        <StatCard label="Days Analysed"         value={loading ? '…' : data.length} />
      </div>

      {isHigh && !loading && (
        <div className="ad-warning">
          <span>⚠️</span>
          <p style={{ margin: 0 }}>
            No-show rate is above 20%. Consider enabling appointment reminder
            notifications for patients 24 hours before their slot.
          </p>
        </div>
      )}

      <ChartCard title="No-Show Rate Over Time (%)" loading={loading}>
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
    </div>
  )
}

// ── Custom View ───────────────────────────────

const COLUMNS = [
  {
    key: 'booked_at',
    label: 'Booked At',
    render: v => v ? new Date(v).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : '—',
  },
  {
    key: 'patient_name',
    label: 'Patient',
    render: (_v, row) => [row.patient_name, row.patient_surname].filter(Boolean).join(' ') || '—',
    exportValue: (_v, row) => [row.patient_name, row.patient_surname].filter(Boolean).join(' '),
  },
  {
    key: 'patient_contact',
    label: 'Contact',
    render: (_v, row) => row.patient_email ?? row.patient_phone ?? '—',
    exportValue: (_v, row) => row.patient_email || row.patient_phone || '',
  },
  { key: 'appointment_type', label: 'Type',    render: v => v?.replace('_', ' ') ?? '—' },
  {
    key: 'status',
    label: 'Status',
    render: v => (
      <span className={`ad-badge ${STATUS_BADGE[v] ?? 'ad-badge--cancelled'}`}>
        {v?.replace('_', ' ')}
      </span>
    ),
  },
  { key: 'queue_status',    label: 'Queue',   render: v => v ?? '—' },
  { key: 'wait_minutes',    label: 'Wait',    render: v => v != null ? `${v} min` : '—' },
  { key: 'service_minutes', label: 'Service', render: v => v != null ? `${v} min` : '—' },
]

function CustomViewReport({ facilityId }) {
  const [status, setStatus] = useState('')
  const [type,   setType]   = useState('')
  const [start,  setStart]  = useState('')
  const [end,    setEnd]    = useState('')

  const { data, loading } = useCustomView({
    facilityId,
    status:    status || null,
    type:      type   || null,
    startDate: start  || null,
    endDate:   end    || null,
  })

  const flatForExport = data.map(row =>
    Object.fromEntries(COLUMNS.map(c => [c.label, c.exportValue ? c.exportValue(row[c.key], row) : (row[c.key] ?? '')]))
  )
  const PDF_COLS = COLUMNS.map(c => ({ header: c.label, dataKey: c.label }))

  return (
    <div className="ad-section">
      <div className="ad-controls">
        <div className="ad-controls-left">
          <select value={status} onChange={e => setStatus(e.target.value)} className="ad-select">
            <option value="">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="confirmed">Confirmed</option>
            <option value="complete">Completed</option>
            <option value="no_show">No-Show</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={type} onChange={e => setType(e.target.value)} className="ad-select">
            <option value="">All Types</option>
            <option value="scheduled">Scheduled</option>
            <option value="walk_in">Walk-in</option>
          </select>
          <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
        </div>
        <ExportBar
          disabled={loading || !data.length}
          onCSV={() => exportCSV(flatForExport, 'appointments')}
          onPDF={() => exportPDF(flatForExport, { title: 'Custom Appointments View', columns: PDF_COLS, filename: 'appointments' })}
        />
      </div>

      <div className="ad-table-card">
        <div className="ad-table-header">
          <h3 className="ad-table-title">Appointments</h3>
          <span className="ad-table-count">
            {loading ? 'Loading…' : `${data.length.toLocaleString()} records`}
          </span>
        </div>
        <div className="ad-table-scroll">
          {loading ? (
            <div className="ad-skeleton-rows">
              {[...Array(8)].map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : data.length === 0 ? (
            <div className="ad-table-empty">No appointments match your filters.</div>
          ) : (
            <table className="ad-table">
              <thead>
                <tr>{COLUMNS.map(col => <th key={col.key}>{col.label}</th>)}</tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.id ?? i}>
                    {COLUMNS.map(col => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsDashboard() {
  const [activeTab,       setActiveTab]       = useState(0)
  const [facilityId,      setFacilityId]      = useState(null)
  const [facilityName,    setFacilityName]    = useState('')
  const [loadingFacility, setLoadingFacility] = useState(true)
  const [facilityError,   setFacilityError]   = useState('')

  useEffect(() => {
    async function loadFacility() {
      const identity = JSON.parse(localStorage.getItem('userIdentity') || '{}')

      if (!identity.auth_provider || !identity.provider_user_id) {
        setFacilityError('Not logged in. Please sign in again.')
        setLoadingFacility(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_provider', identity.auth_provider)
        .eq('provider_user_id', identity.provider_user_id)
        .maybeSingle()

      if (profileError || !profile) {
        setFacilityError('Could not load your profile.')
        setLoadingFacility(false)
        return
      }

      const { data: assignment, error: assignError } = await supabase
        .from('staff_assignments')
        .select('facility_id, facilities(id, name)')
        .eq('profile_id', profile.id)
        .maybeSingle()

      if (assignError || !assignment?.facility_id) {
        setFacilityError('You are not assigned to a facility yet.')
        setLoadingFacility(false)
        return
      }

      setFacilityId(assignment.facility_id)
      setFacilityName(assignment.facilities?.name || '')
      setLoadingFacility(false)
    }

    loadFacility()
  }, [])

  if (loadingFacility) {
    return (
      <div className="ad-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading facility…</p>
      </div>
    )
  }

  if (facilityError) {
    return (
      <div className="ad-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#f43f5e', fontSize: 14 }}>{facilityError}</p>
      </div>
    )
  }

  return (
    <div className="ad-page">
      <div className="ad-container">
        <div className="ad-header">
          <h1 className="ad-title">Analytics</h1>
          <p className="ad-subtitle">📍 {facilityName}</p>
        </div>

        <div className="ad-tabs">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`ad-tab${activeTab === i ? ' ad-tab--active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && <WaitTimesReport  facilityId={facilityId} />}
        {activeTab === 1 && <NoShowReport     facilityId={facilityId} />}
        {activeTab === 2 && <CustomViewReport facilityId={facilityId} />}
      </div>
    </div>
  )
}