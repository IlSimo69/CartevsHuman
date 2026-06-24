import { useState } from 'react'
import { createRoom, joinRoom } from '../lib/gameLogic'
import type { Room, Player, RoomSettings } from '../types'

interface Props {
  onEnter: (room: Room, player: Player) => void
}

const DEFAULT_SETTINGS: RoomSettings = {
  target_score: 8,
  round_timer: 60,
  pause_between_rounds: 5,
  czar_mode: 'winner',
  max_players: 10,
}

export default function Home({ onEnter }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [nickname, setNickname] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!nickname.trim()) { setError('Inserisci un nickname'); return }
    setLoading(true); setError('')
    try {
      const { room, player } = await createRoom(nickname.trim(), settings)
      onEnter(room, player)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore nella creazione della stanza')
    } finally { setLoading(false) }
  }

  async function handleJoin() {
    if (!nickname.trim()) { setError('Inserisci un nickname'); return }
    if (!joinCode.trim()) { setError('Inserisci il codice stanza'); return }
    setLoading(true); setError('')
    try {
      const { room, player } = await joinRoom(joinCode.trim(), nickname.trim())
      onEnter(room, player)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore nel join')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="inline-block bg-white text-black font-black text-2xl px-4 py-2 rounded-xl tracking-tight">
            CAH Italia
          </div>
          <p className="text-neutral-400 text-sm">Un gioco per persone orribili 🇮🇹</p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-neutral-900 rounded-xl p-1">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                tab === t ? 'bg-white text-black' : 'text-neutral-400'
              }`}
            >
              {t === 'create' ? 'Crea stanza' : 'Unisciti'}
            </button>
          ))}
        </div>

        {/* Nickname */}
        <div className="space-y-2">
          <label className="text-neutral-300 text-sm font-medium">Il tuo nickname</label>
          <input
            className="input-field"
            placeholder="Es. ZioUmberto"
            maxLength={32}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (tab === 'join' ? handleJoin() : handleCreate())}
          />
        </div>

        {tab === 'join' && (
          <div className="space-y-2">
            <label className="text-neutral-300 text-sm font-medium">Codice stanza</label>
            <input
              className="input-field uppercase tracking-widest text-xl font-bold text-center"
              placeholder="ABC123"
              maxLength={6}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
          </div>
        )}

        {tab === 'create' && (
          <div className="bg-neutral-900 rounded-2xl p-4 space-y-4">
            <p className="text-neutral-300 text-sm font-semibold">Impostazioni partita</p>

            <SettingRow
              label="Punti per vincere"
              value={settings.target_score}
              options={[3, 5, 8, 10]}
              onChange={v => setSettings(s => ({ ...s, target_score: v }))}
            />

            <SettingRow
              label="Tempo per round"
              value={settings.round_timer}
              options={[30, 60, 90, 120]}
              format={v => `${v}s`}
              onChange={v => setSettings(s => ({ ...s, round_timer: v }))}
            />

            <SettingRow
              label="Pausa tra round"
              value={settings.pause_between_rounds}
              options={[3, 5, 10, 15]}
              format={v => `${v}s`}
              onChange={v => setSettings(s => ({ ...s, pause_between_rounds: v }))}
            />

            <SettingRow
              label="Modalità Master"
              value={settings.czar_mode}
              options={['winner', 'rotation']}
              format={v => v === 'winner' ? 'Vincitore' : 'Rotazione'}
              onChange={v => setSettings(s => ({ ...s, czar_mode: v as 'winner' | 'rotation' }))}
            />

            <SettingRow
              label="Giocatori max"
              value={settings.max_players}
              options={[4, 6, 8, 10, 15, 20]}
              onChange={v => setSettings(s => ({ ...s, max_players: v }))}
            />
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-950/40 rounded-xl py-2 px-3">
            {error}
          </p>
        )}

        <button
          className="btn-primary w-full text-lg"
          onClick={tab === 'create' ? handleCreate : handleJoin}
          disabled={loading}
        >
          {loading ? '...' : tab === 'create' ? 'Crea stanza' : 'Entra'}
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Componente helper per le opzioni di impostazione
// ----------------------------------------------------------------
function SettingRow<T extends string | number>({
  label, value, options, format, onChange
}: {
  label: string
  value: T
  options: T[]
  format?: (v: T) => string
  onChange: (v: T) => void
}) {
  return (
    <div className="space-y-1">
      <p className="text-neutral-400 text-xs">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={String(opt)}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              value === opt
                ? 'bg-white text-black'
                : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
            }`}
          >
            {format ? format(opt) : String(opt)}
          </button>
        ))}
      </div>
    </div>
  )
}
