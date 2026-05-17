import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'

import {
  useWaitTimes, useNoShowRates, useCustomView, useFacilities,
} from '#hooks/useAnalytics'
import { exportCSV, exportPDF } from '#utils/exportUtils'
import AIAssistant from './AIAssistant'
import "./AnalyticsDashboard.css";

const TABS = ['Wait Times', 'No-Show Rates', 'Custom View']

const HOUR_LABEL = (h) => {
  if (h === 0)  return '12 am'
  if (h < 12)   return `${h} am`
  if (h === 12) return '12 pm'
  return `${h - 12} pm`
}

const STATUS_STYLES = {
  complete:  'bg-teal-50  text-teal-700',
  confirmed: 'bg-blue-50  text-blue-700',
  no_show:   'bg-rose-50  text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500',
  booked:    'bg-amber-50 text-amber-700',
}

function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <article className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
        {label}
      </h3>
      <p className={`text-2xl font-bold font-mono tabular-nums ${accent ? 'text-rose-500' : 'text-teal-600'}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </article>
  )
}

function ExportBar({ onCSV, onPDF, disabled }) {
  return (
    <menu className="flex items-center gap-2 list-none p-0 m-0">
      <li>
        <button
          onClick={onCSV}
          disabled={disabled}
          className="flex items-center gap-4 px-3 py-1.5 rounded-lg border border-slate-200
                     text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <DownloadIcon /> CSV
        </button>
      </li>
      <li>
        <button
          onClick={onPDF}
          disabled={disabled}
          className="flex items-center gap-4 px-3 py-1.5 rounded-lg
                     bg-teal-500 text-white text-xs font-medium hover:bg-teal-600
                     transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <DownloadIcon /> PDF
        </button>
      </li>
    </menu>
  )
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">
      <path d="M6 1v7M3.5 6 6 8.5 8.5 6M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FacilityFilter({ facilities, value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="sr-only">Filter by facility</span>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600
                   bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
      >
        <option value="">All Facilities</option>
        {facilities.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
    </label>
  )
}

function DateRange({ start, end, onStart, onEnd }) {
  return (
    <fieldset className="flex items-center gap-2 border-0 p-0 m-0">
      <legend className="sr-only">Date range</legend>
      <label className="sr-only" htmlFor="date-start">Start date</label>
      <input
        id="date-start"
        type="date"
        value={start}
        onChange={e => onStart(e.target.value || null)}
        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600
                   bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
      />
      <span className="text-slate-300 text-xs" aria-hidden="true"> to </span>
      <label className="sr-only" htmlFor="date-end">End date</label>
      <input
        id="date-end"
        type="date"
        value={end}
        onChange={e => onEnd(e.target.value || null)}
        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600
                   bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
      />
    </fieldset>
  )
}

function ChartCard({ title, loading, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-5">{title}</h3>
      {loading
        ? <Skeleton className="h-64 w-full" />
        : children
      }
    </section>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: { fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.06)' },
  cursor: { fill: '#f8fafc' },
}

function WaitTimesReport({ facilities }) {
  const [facilityId, setFacilityId] = useState(null)
  const { data, loading } = useWaitTimes({ facilityId })

  const chartData = data.map(d => ({
    hour:               HOUR_LABEL(d.hour_of_day),
    'Avg Wait':         +d.avg_wait_minutes,
    'Min Wait':         +d.min_wait_minutes,
    'Max Wait':         +d.max_wait_minutes,
    total_served:       d.total_served,
  }))

  const totalServed  = data.reduce((s, d) => s + Number(d.total_served), 0)
  const weightedAvg  = totalServed
    ? (data.reduce((s, d) => s + d.avg_wait_minutes * d.total_served, 0) / totalServed).toFixed(1)
    : '—'
  const peakRow = data.reduce((m, d) => (!m || d.avg_wait_minutes > m.avg_wait_minutes ? d : m), null)

  const CSV_COLS = [
    { header: 'Hour of Day',      dataKey: 'hour' },
    { header: 'Avg Wait (min)',   dataKey: 'Avg Wait' },
    { header: 'Min Wait (min)',   dataKey: 'Min Wait' },
    { header: 'Max Wait (min)',   dataKey: 'Max Wait' },
  ]

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <FacilityFilter facilities={facilities} value={facilityId} onChange={setFacilityId} />
        <ExportBar
          disabled={loading || !data.length}
          onCSV={() => exportCSV(chartData, 'wait-times')}
          onPDF={() => exportPDF(chartData, {
            title: 'Average Patient Wait Times by Hour of Day',
            columns: CSV_COLS,
            filename: 'wait-times',
          })}
        />
      </header>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none p-0 m-0">
        <li><StatCard label="Overall Avg Wait" value={loading ? '…' : `${weightedAvg} min`} /></li>
        <li>
          <StatCard
            label="Peak Hour"
            value={loading ? '…' : (peakRow ? HOUR_LABEL(peakRow.hour_of_day) : '—')}
            sub={peakRow ? `${peakRow.avg_wait_minutes} min avg` : undefined}
            accent
          />
        </li>
        <li><StatCard label="Total Served" value={loading ? '…' : totalServed.toLocaleString()} /></li>
      </ul>

      <ChartCard title="Average Wait Time by Hour of Day (minutes)" loading={loading}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" m" />
            <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v} min`]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Min Wait"  fill="#8abc7b" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Avg Wait"  fill="#6cab5b" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Max Wait"  fill="#10860a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  )
}

function NoShowReport({ facilities }) {
  const [facilityId, setFacilityId] = useState(null)
  const [start, setStart] = useState('')
  const [end, setEnd]     = useState('')
  const { data, loading } = useNoShowRates({
    facilityId,
    startDate: start || null,
    endDate:   end   || null,
  })

  const chartData = [...data].reverse().map(d => ({
    date:             d.date,
    'No-Show Rate %': +d.no_show_rate_pct,
    'No-Shows':       +d.no_shows,
    'Total':          +d.total_appointments,
  }))

  const totalAppts   = data.reduce((s, d) => s + Number(d.total_appointments), 0)
  const totalNoShows = data.reduce((s, d) => s + Number(d.no_shows), 0)
  const overallRate  = totalAppts
    ? ((totalNoShows / totalAppts) * 100).toFixed(1)
    : '—'
  const isHigh = Number(overallRate) >= 20

  const CSV_COLS = [
    { header: 'Date',                dataKey: 'date' },
    { header: 'No-Show Rate (%)',    dataKey: 'No-Show Rate %' },
    { header: 'No-Shows',           dataKey: 'No-Shows' },
    { header: 'Total Appointments', dataKey: 'Total' },
  ]

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FacilityFilter facilities={facilities} value={facilityId} onChange={setFacilityId} />
          <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
        </div>
        <ExportBar
          disabled={loading || !data.length}
          onCSV={() => exportCSV(chartData, 'noshows')}
          onPDF={() => exportPDF(chartData, {
            title: 'Appointment No-Show Rates',
            columns: CSV_COLS,
            filename: 'noshows',
          })}
        />
      </header>

      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 list-none p-0 m-0">
        <li><StatCard label="Overall No-Show Rate" value={loading ? '…' : `${overallRate}%`} accent={isHigh} /></li>
        <li><StatCard label="Total No-Shows"       value={loading ? '…' : totalNoShows.toLocaleString()} accent /></li>
        <li><StatCard label="Total Appointments"   value={loading ? '…' : totalAppts.toLocaleString()} /></li>
        <li><StatCard label="Days Analysed"        value={loading ? '…' : data.length} /></li>
      </ul>

      {isHigh && !loading && (
        <aside
          role="alert"
          className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700"
        >
          <span aria-hidden="true" className="mt-0.5 shrink-0">⚠️</span>
          <p>
            Your no-show rate is above 20%. Consider enabling appointment reminder
            notifications for patients 24 hours before their slot.
          </p>
        </aside>
      )}

      <ChartCard title="No-Show Rate Over Time (%)" loading={loading}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" domain={[0, 100]} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v, name) =>
                name === 'No-Show Rate %' ? [`${v}%`, 'No-Show Rate'] : [v, name]
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="No-Show Rate %"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Total"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  )
}

const COLUMNS = [
  {
    key: 'booked_at',
    label: 'Booked At',
    render: v => v ? new Date(v).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : '—',
  },
  {
    key: 'patient_name',
    label: 'Patient',
    render: (v, row) => {
      const full = [row.patient_name, row.patient_surname].filter(Boolean).join(' ')
      return full || '—'
    },
    exportValue: (v, row) => [row.patient_name, row.patient_surname].filter(Boolean).join(' '),
  },
  {
    key: 'patient_contact',
    label: 'Contact',
    render: (_v, row) => row.patient_email ?? row.patient_phone ?? '—',
    exportValue: (_v, row) => row.patient_email || row.patient_phone || '',
  },
  { key: 'facility_name', label: 'Facility' },
  { key: 'appointment_type', label: 'Type', render: v => v?.replace('_', ' ') ?? '—' },
  {
    key: 'status',
    label: 'Status',
    render: v => (
      <mark className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-transparent ${STATUS_STYLES[v] ?? 'bg-slate-100 text-slate-500'}`}>
        {v?.replace('_', ' ')}
      </mark>
    ),
  },
  { key: 'queue_status',   label: 'Queue', render: v => v ?? '—' },
  { key: 'wait_minutes',   label: 'Wait',    render: v => v != null ? `${v} min` : '—' },
  { key: 'service_minutes', label: 'Service', render: v => v != null ? `${v} min` : '—' },
]

function CustomViewReport({ facilities }) {
  const [facilityId, setFacilityId] = useState(null)
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
    Object.fromEntries(
      COLUMNS.map(c => [c.label, c.exportValue ? c.exportValue(row[c.key], row) : (row[c.key] ?? '')])
    )
  )
  const PDF_COLS = COLUMNS.map(c => ({ header: c.label, dataKey: c.label }))

  return (
    <section className="space-y-5">
      {/* Filters */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="flex flex-wrap items-center gap-3 border-0 p-0 m-0">
          <legend className="sr-only">Filter appointments</legend>
          <FacilityFilter facilities={facilities} value={facilityId} onChange={setFacilityId} />

          <label className="sr-only" htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600
                       bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="confirmed">Confirmed</option>
            <option value="complete">Completed</option>
            <option value="no_show">No-Show</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <label className="sr-only" htmlFor="filter-type">Appointment type</label>
          <select
            id="filter-type"
            value={type}
            onChange={e => setType(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600
                       bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="scheduled">Scheduled</option>
            <option value="walk_in">Walk-in</option>
          </select>

          <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
        </fieldset>

        <ExportBar
          disabled={loading || !data.length}
          onCSV={() => exportCSV(flatForExport, 'appointments')}
          onPDF={() => exportPDF(flatForExport, {
            title: 'Custom Appointments View',
            columns: PDF_COLS,
            filename: 'appointments',
          })}
        />
      </header>

      {/* Table */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Appointments</h3>
          <output className="text-[11px] text-slate-400 font-mono">
            {loading ? 'Loading…' : `${data.length.toLocaleString()} records`}
          </output>
        </header>

        <section className="overflow-x-auto">
          {loading ? (
            <ul className="p-5 space-y-2 list-none m-0">
              {[...Array(8)].map((_, i) => <li key={i}><Skeleton className="h-8 w-full" /></li>)}
            </ul>
          ) : data.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">
              No appointments match your filters.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      scope="col"
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase
                                 tracking-widest text-slate-400 whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((row, i) => (
                  <tr key={row.id ?? i} className="hover:bg-slate-50/70 transition-colors">
                    {COLUMNS.map(col => (
                      <td key={col.key} className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
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

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState(0)
  const facilities = useFacilities()

  return (
    <div className="analytics-dashboard">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Patient flow and appointment performance across your facilities
          </p>
        </header>

        {/* Tab bar */}
        <nav aria-label="Analytics sections" className="mb-7">
          <ul
            role="tablist"
            className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm list-none m-0"
          >
            {TABS.map((tab, i) => (
              <li key={tab} role="presentation">
                <button
                  role="tab"
                  aria-selected={activeTab === i}
                  aria-controls={`tabpanel-${i}`}
                  id={`tab-${i}`}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    activeTab === i
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Tab panels */}
        <div
          id="tabpanel-0"
          role="tabpanel"
          aria-labelledby="tab-0"
          hidden={activeTab !== 0}
        >
          <WaitTimesReport facilities={facilities} />
        </div>
        <div
          id="tabpanel-1"
          role="tabpanel"
          aria-labelledby="tab-1"
          hidden={activeTab !== 1}
        >
          <NoShowReport facilities={facilities} />
        </div>
        <div
          id="tabpanel-2"
          role="tabpanel"
          aria-labelledby="tab-2"
          hidden={activeTab !== 2}
        >
          <CustomViewReport facilities={facilities} />
        </div>
      </main>

      <AIAssistant
        context={{
          role: 'admin',
          pageContext: 'analytics - ' + TABS[activeTab],
        }}
      />
    </div>
  )
}