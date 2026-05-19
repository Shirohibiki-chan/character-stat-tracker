function pageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

function NavBtn({ disabled, onClick, children }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-8 h-8 text-sm rounded transition text-text-secondary hover:bg-surface-alt hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

export default function Pagination({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null
  const range = pageRange(page, totalPages)
  return (
    <div className="flex items-center justify-center gap-1 py-5">
      <NavBtn disabled={page === 1} onClick={() => setPage(1)}>«</NavBtn>
      <NavBtn disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</NavBtn>
      {range.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="w-8 text-center text-text-muted text-sm select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`w-8 h-8 text-xs rounded transition font-bold ${
              p === page
                ? 'bg-accent text-bg'
                : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
            }`}
          >
            {p}
          </button>
        )
      )}
      <NavBtn disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</NavBtn>
      <NavBtn disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</NavBtn>
    </div>
  )
}
