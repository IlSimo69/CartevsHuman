import type { BlackCard } from '../types'

interface Props {
  card: BlackCard
  compact?: boolean
}

export default function CardBlack({ card, compact }: Props) {
  return (
    <div className={`card-black ${compact ? 'text-base p-4' : 'text-xl p-6'}`}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-normal text-neutral-400 uppercase tracking-widest">Carta Nera</span>
        {card.pick === 2 && (
          <span className="text-xs bg-white text-black font-bold px-2 py-0.5 rounded-full">
            PICK 2
          </span>
        )}
      </div>
      <p className="leading-snug">{card.text}</p>
      <div className="mt-4 text-right">
        <span className="font-black text-xs text-neutral-500 tracking-widest">CAH ITALIA</span>
      </div>
    </div>
  )
}
