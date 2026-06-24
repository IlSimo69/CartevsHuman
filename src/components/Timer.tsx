import { useEffect, useState } from 'react'

interface Props {
  endTime: string | null
  onExpire?: () => void
  label?: string
}

export default function Timer({ endTime, onExpire, label }: Props) {
  const [seconds, setSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (!endTime) { setSeconds(null); return }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(endTime).getTime() - Date.now()) / 1000))
      setSeconds(remaining)
      if (remaining === 0 && onExpire) onExpire()
    }

    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [endTime, onExpire])

  if (seconds === null) return null

  const isUrgent = seconds <= 10
  const isPaused = label?.includes('prossimo')

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
      isPaused
        ? 'bg-neutral-800 text-neutral-300'
        : isUrgent
          ? 'bg-red-600 text-white animate-pulse'
          : 'bg-neutral-800 text-white'
    }`}>
      <span className="text-base">{isPaused ? '⏳' : '⏱'}</span>
      <span>{seconds}s</span>
      {label && <span className="font-normal text-xs opacity-70">{label}</span>}
    </div>
  )
}
