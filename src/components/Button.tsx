import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg' | 'xl'

const base =
  'inline-flex items-center justify-center gap-2 font-display font-bold rounded-2xl select-none transition-transform ' +
  'active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 ' +
  'focus-visible:outline-4 focus-visible:outline-gold focus-visible:outline-offset-2'

const variants: Record<Variant, string> = {
  primary: 'bg-red text-chalk shadow-[0_5px_0_#9a1a2b]',
  secondary: 'bg-chalk text-navy shadow-[0_5px_0_#c9bfa8] border-2 border-navy/10',
  ghost: 'bg-transparent text-current underline-offset-4 hover:underline',
  danger: 'bg-navy text-chalk shadow-[0_5px_0_#0a1630]',
}
const sizes: Record<Size, string> = {
  md: 'text-base px-4 py-2 min-h-11',
  lg: 'text-xl px-6 py-3 min-h-14',
  xl: 'text-2xl px-8 py-4 min-h-16',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest} />
}
