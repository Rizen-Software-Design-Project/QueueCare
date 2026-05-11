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
  return <div className={`animate-pulse bg-slate-100 rounded-lg ${className}`} />
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
        {label}
      </p>
      <p className={`text-2xl font-bold font-mono tabular-nums ${accent ? 'text-rose-500' : 'text-teal-600'}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ExportBar({ onCSV, onPDF, disabled }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onCSV}
        disabled={disabled}
        className="flex items-center gap-4 px-3 py-1.5 rounded-lg border border-slate-200
                   text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <DownloadIcon /> CSV
      </button>
      <button
        onClick={onPDF}
        disabled={disabled}
        className="flex items-center gap-4 px-3 py-1.5 rounded-lg
                   bg-teal-500 text-white text-xs font-medium hover:bg-teal-600
                   transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
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

function FacilityFilter({ facilities, value, onChange }) {
  return (
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
  )
}

function DateRange({ start, end, onStart, onEnd }) {
  return (
    <div className="flex items-center gap-2">
      <input type="date" value={start} onChange={e => onStart(e.target.value || null)}
        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600
                   bg-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
      <span className="text-slate-300 text-xs"> to </span>
      <input type="date" value={end} onChange={e => onEnd(e.target.value || null)}
        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600
                   bg-white focus:outline-none focus:ring-2 focus:ring-teal-400" />
    </div>
  )
}

function ChartCard({ title, loading, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-5">{title}</h3>
      {loading
        ? <Skeleton className="h-64 w-full" />
        : children
      }
    </div>
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Overall Avg Wait"
          value={loading ? '…' : `${weightedAvg} min`}
        />
        <StatCard
          label="Peak Hour"
          value={loading ? '…' : (peakRow ? HOUR_LABEL(peakRow.hour_of_day) : '—')}
          sub={peakRow ? `${peakRow.avg_wait_minutes} min avg` : undefined}
          accent
        />
        <StatCard
          label="Total Served"
          value={loading ? '…' : totalServed.toLocaleString()}
        />
      </div>

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
    </div>
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

  // Reverse for chronological chart (data arrives newest-first)
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Overall No-Show Rate"
          value={loading ? '…' : `${overallRate}%`}
          accent={isHigh}
        />
        <StatCard label="Total No-Shows"       value={loading ? '…' : totalNoShows.toLocaleString()} accent />
        <StatCard label="Total Appointments"   value={loading ? '…' : totalAppts.toLocaleString()} />
        <StatCard label="Days Analysed"        value={loading ? '…' : data.length} />
      </div>

      {isHigh && !loading && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <p>
            Your no-show rate is above 20%. Consider enabling appointment reminder
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
    </div>
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
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_STYLES[v] ?? 'bg-slate-100 text-slate-500'}`}>
        {v?.replace('_', ' ')}
      </span>
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
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FacilityFilter facilities={facilities} value={facilityId} onChange={setFacilityId} />

          <select value={status} onChange={e => setStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600
                       bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer">
            <option value="">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="confirmed">Confirmed</option>
            <option value="complete">Completed</option>
            <option value="no_show">No-Show</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select value={type} onChange={e => setType(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600
                       bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer">
            <option value="">All Types</option>
            <option value="scheduled">Scheduled</option>
            <option value="walk_in">Walk-in</option>
          </select>

          <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
        </div>

        <ExportBar
          disabled={loading || !data.length}
          onCSV={() => exportCSV(flatForExport, 'appointments')}
          onPDF={() => exportPDF(flatForExport, {
            title: 'Custom Appointments View',
            columns: PDF_COLS,
            filename: 'appointments',
          })}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Appointments</h3>
          <span className="text-[11px] text-slate-400 font-mono">
            {loading ? 'Loading…' : `${data.length.toLocaleString()} records`}
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-5 space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : data.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400">No appointments match your filters.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {COLUMNS.map(col => (
                    <th key={col.key}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase
                                 tracking-widest text-slate-400 whitespace-nowrap">
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
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState(0)
  const facilities = useFacilities()

  return (
    <div className="analytics-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Patient flow and appointment performance across your facilities
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-7 shadow-sm">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === i
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 0 && <WaitTimesReport  facilities={facilities} />}
        {activeTab === 1 && <NoShowReport     facilities={facilities} />}
        {activeTab === 2 && <CustomViewReport facilities={facilities} />}
      </div>

      <AIAssistant
        context={{
          role: 'admin',
          pageContext: 'analytics - ' + TABS[activeTab],
        }}
      />
    </div>
  )
}