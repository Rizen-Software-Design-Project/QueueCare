import { useState, useEffect } from 'react'
import { supabase } from '#lib/supabase'

export function useFacilities() {
  const [facilities, setFacilities] = useState([])

  useEffect(() => {
    supabase
      .from('facilities')
      .select('id, name')
      .order('name')
      .then(({ data }) => { if (data) setFacilities(data) })
  }, [])

  return facilities
}

export function useWaitTimes({ facilityId = null } = {}) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetch() {
      let query = supabase
        .from('analytics_avg_wait_times')
        .select('*')
        .order('hour_of_day')

      if (facilityId) query = query.eq('facility_id', facilityId)

      const { data, error } = await query
      if (cancelled) return
      if (error) setError(error)
      else setData(data ?? [])
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [facilityId])

  return { data, loading, error }
}

export function useNoShowRates({ facilityId = null, startDate = null, endDate = null } = {}) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetch() {
      let query = supabase
        .from('analytics_noshows')
        .select('*')
        .order('date', { ascending: false })
        .limit(120)  // ~4 months of daily data

      if (facilityId) query = query.eq('facility_id', facilityId)
      if (startDate)  query = query.gte('date', startDate)
      if (endDate)    query = query.lte('date', endDate)

      const { data, error } = await query
      if (cancelled) return
      if (error) setError(error)
      else setData(data ?? [])
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [facilityId, startDate, endDate])

  return { data, loading, error }
}

export function useCustomView({
  facilityId = null,
  status     = null,
  type       = null,
  startDate  = null,
  endDate    = null,
} = {}) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetch() {
      let query = supabase
        .from('analytics_appointments_custom')
        .select('*')
        .order('booked_at', { ascending: false })
        .limit(500)

      if (facilityId) query = query.eq('facility_id', facilityId)
      if (status)     query = query.eq('status', status)
      if (type)       query = query.eq('appointment_type', type)
      if (startDate)  query = query.gte('booked_at', startDate)
      if (endDate)    query = query.lte('booked_at', endDate + 'T23:59:59Z')

      const { data, error } = await query
      if (cancelled) return
      if (error) setError(error)
      else setData(data ?? [])
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [facilityId, status, type, startDate, endDate])

  return { data, loading, error }
}