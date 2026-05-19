import { useState, useEffect, useMemo } from 'react'

const PAGE_SIZE_KEY = 'charsnap-page-size'
const VIEW_MODE_KEY = 'charsnap-view-mode'

export function usePagination(items) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(() => {
    const s = localStorage.getItem(PAGE_SIZE_KEY)
    return s ? Number(s) : 50
  })
  const [viewMode, setViewModeState] = useState(
    () => localStorage.getItem(VIEW_MODE_KEY) || 'list'
  )

  // Reset to page 1 whenever the filtered/sorted set changes
  useEffect(() => { setPage(1) }, [items])

  function setPageSize(n) {
    localStorage.setItem(PAGE_SIZE_KEY, String(n))
    setPageSizeState(n)
    setPage(1)
  }

  function setViewMode(m) {
    localStorage.setItem(VIEW_MODE_KEY, m)
    setViewModeState(m)
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    viewMode,
    setViewMode,
    totalPages,
    paginated,
  }
}
