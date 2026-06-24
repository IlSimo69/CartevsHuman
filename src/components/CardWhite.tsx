import type { WhiteCard } from '../types'

interface Props {
  card: WhiteCard
  selected?: boolean
  selectionOrder?: number
  disabled?: boolean
  onClick?: () => void
  compact?: boolean
}

export default function CardWhite({ card, selected, selectionOrder, disabled, onClick, compact }: Props) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`card-white relative ${compact ? 'text-sm p-3' : 'text-base p-4'} ${
        selected ? 'card-white-selected' : ''
      } ${disabled ? 'opacity-60 cursor-default' : ''}`}
    >
      {selected && selectionOrder !== undefined && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 text-black text-xs font-black rounded-full flex items-center justify-center">
          {selectionOrder}
        </div>
      )}
      <p className="leading-snug">{card.text}</p>
      <div className="mt-2 text-right">
        <span className="font-black text-xs text-neutral-300 tracking-widest">CAH ITALIA</span>
      </div>
    </div>
  )
}
