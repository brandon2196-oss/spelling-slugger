import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  ref?: Ref<HTMLInputElement>
}

export function TextField({ label, hint, error, className = '', id, ...rest }: TextFieldProps) {
  const auto = useId()
  const inputId = id ?? auto
  return (
    <label htmlFor={inputId} className="block">
      <span className="block font-semibold text-navy mb-1">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-xl border-2 bg-white px-4 py-3 text-lg text-ink outline-none transition ` +
          `focus:border-navy focus:ring-4 focus:ring-gold/40 ${error ? 'border-red' : 'border-navy/20'} ${className}`}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error ? <span className="block text-red text-sm mt-1">{error}</span> : hint ? <span className="block text-ink/60 text-sm mt-1">{hint}</span> : null}
    </label>
  )
}
