import type { Player } from '../types'

interface Props {
  players: Player[]
  myPlayer: Player
  targetScore: number
  onClose: () => void
}

export default function Scoreboard({ players, myPlayer, targetScore, onClose }: Props) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-white">Classifica</h2>
        <button onClick={onClose} className="text-neutral-400 text-sm bg-neutral-800 px-3 py-1.5 rounded-lg">
          ← Torna
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map((p, i) => {
          const pct = Math.min((p.score / targetScore) * 100, 100)
          const medals = ['🥇', '🥈', '🥉']
          return (
            <div
              key={p.id}
              className={`bg-neutral-900 rounded-2xl p-4 ${
                p.id === myPlayer.id ? 'border border-white/20' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{medals[i] ?? `${i + 1}.`}</span>
                  <span className={`font-bold ${p.id === myPlayer.id ? 'text-white' : 'text-neutral-200'}`}>
                    {p.nickname}
                    {p.id === myPlayer.id && <span className="text-neutral-500 text-xs ml-1">(tu)</span>}
                  </span>
                </div>
                <span className="font-black text-white text-lg">
                  {p.score}<span className="text-neutral-500 font-normal text-sm">/{targetScore}</span>
                </span>
              </div>
              {/* Barra progresso */}
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-neutral-600 text-xs text-center mt-6">
        Primo a {targetScore} punti vince
      </p>
    </div>
  )
}
