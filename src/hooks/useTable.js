import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Generic Supabase fetch hook.
 * @param {string} table   Table name
 * @param {object} options { orderBy, ascending, filters (array of {col,op,val}) }
 */
export function useTable(table, options = {}) {
  const { orderBy, ascending = true, filters = [], deps = [] } = options
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    let q = supabase.from(table).select('*')
    filters.forEach(f => { q = q.filter(f.col, f.op, f.val) })
    if (orderBy) q = q.order(orderBy, { ascending })
    const { data, error } = await q
    if (error) setError(error)
    else setData(data || [])
    setLoading(false)
  }, [table, orderBy, ascending, JSON.stringify(filters)])

  useEffect(() => { fetchData() }, [fetchData, ...deps])

  const insert = async (row) => {
    const { data, error } = await supabase.from(table).insert(row).select().single()
    if (!error) await fetchData()
    return { data, error }
  }
  const update = async (id, patch) => {
    const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
    if (!error) await fetchData()
    return { data, error }
  }
  const remove = async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) await fetchData()
    return { error }
  }

  return { data, loading, error, refetch: fetchData, insert, update, remove }
}
