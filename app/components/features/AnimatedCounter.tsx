'use client'
import { useEffect, useState, useRef } from 'react'

interface AnimatedCounterProps {
  value:    number
  prefix?:  string
  suffix?:  string
  duration?: number   // ms
  color?:   string
  size?:    'sm' | 'md' | 'lg' | 'xl'
  format?:  (v: number) => string
}

export default function AnimatedCounter({
  value, prefix = '', suffix = '', duration = 800,
  color, size = 'md', format,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const start = prevRef.current
    const diff  = value - start
    if (diff === 0) return

    const steps    = 30
    const stepTime = duration / steps
    let step       = 0

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      step++
      // イーズアウト
      const progress = 1 - Math.pow(1 - step / steps, 3)
      setDisplay(Math.round(start + diff * progress))
      if (step >= steps) {
        setDisplay(value)
        prevRef.current = value
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }, stepTime)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [value, duration])

  const sizeClass = {
    sm:  'text-sm font-bold',
    md:  'text-xl font-bold',
    lg:  'text-2xl font-bold',
    xl:  'text-3xl font-bold',
  }[size]

  const formatted = format ? format(display) : display.toLocaleString()

  return (
    <span className={sizeClass} style={{ color }}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
