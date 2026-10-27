import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal?.()
    if (!open && d.open) d.close()
  }, [open])
  if (!open) return null
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,28rem)] rounded-3xl bg-chalk p-6 text-ink shadow-2xl backdrop:bg-navy/70"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title" className="text-2xl text-navy mb-3">{title}</h2>
      {children}
    </dialog>
  )
}
