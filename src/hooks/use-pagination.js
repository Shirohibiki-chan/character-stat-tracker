import { useState, useEffect, useMemo } from 'react'
import { useSettingsStore } from '../state/settings-store.js'

const VIEW_MODE_KEY = 'charsnap-view-mode'

export function usePagination(items) {
  const pageSize        = useSettingsStore(s => s.pageSize)
  const setPageSizeStore = useSettingsStore(s => s.setPageSize)

  const [page, setPage] = useState(1)
  const [viewMode, setViewModeState] = useState(
    () => localStorage.getItem(VIEW_MODE_KEY) || 'list'
  )

  useEffect(() => { setPage(1) }, [items.length])
  useEffect(() => { setPage(1) }, [pageSize])

  function setPageSize(n) {
    setPageSizeStore(n)
  }

  function setViewMode(m) {
    localStorage.setItem(VIEW_MODE_KEY, m)
    setViewModeState(m)
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage   = Math.min(page, totalPages)

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  return { page: safePage, setPage, pageSize, setPageSize, viewMode, setViewMode, totalPages, paginated }
}
