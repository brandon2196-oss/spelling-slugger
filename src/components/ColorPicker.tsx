export interface ColorPickerProps {
  label: string
  value: string
  options: { name: string; hex: string }[]
  onChange: (hex: string) => void
}

/** Big tappable swatches. One is selected; the selected one gets a gold ring and a check. */
export function ColorPicker({ label, value, options, onChange }: ColorPickerProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="font-semibold text-navy mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const selected = o.hex.toLowerCase() === value.toLowerCase()
          return (
            <button
              key={o.hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={o.name}
              title={o.name}
              onClick={() => onChange(o.hex)}
              className={`h-10 w-10 rounded-full border-2 transition focus-visible:outline-4 focus-visible:outline-gold ` +
                `${selected ? 'border-gold ring-4 ring-gold/40 scale-110' : 'border-navy/20'}`}
              style={{ background: o.hex }}
            >
              {selected ? <span className="sr-only">selected</span> : null}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
