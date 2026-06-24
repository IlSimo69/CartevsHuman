import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { startGame } from '../lib/gameLogic'
import type { Room, Player } from '../types'

interface Props {
  room: Room
  myPlayer: Player
  players: Player[]
}

export default function Lobby({ room, myPlayer, players }: Props) {
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const isHost = myPlayer.is_host
  const canStart = players.length >= 2

  async function handleStart() {
    setStarting(true)
    try {
      await startGame(room, players)
    } catch (e) {
      console.error(e)
      setStarting(false)
    }
  }

  async function handleLeave() {
    await supabase.from('players').delete().eq('id', myPlayer.id)
    window.location.reload()
  }

  function copyCode() {
    navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-6 space-y-3">
        <div className="inline-block bg-white text-black font-black text-xl px-4 py-2 rounded-xl">
          CAH Italia
        </div>
        <p className="text-neutral-400 text-sm">Sala d'attesa</p>

        {/* Codice stanza */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 mx-auto bg-neutral-900 px-5 py-3 rounded-2xl border border-neutral-700 active:scale-95 transition-transform"
        >
          <span className="text-3xl font-black tracking-widest text-white">{room.code}</span>
          <span className="text-neutral-500 text-xs">{copied ? '✓ copiato' : 'tocca per copiare'}</span>
        </button>
        <p className="text-neutral-500 text-xs">Condividi questo codice con gli amici</p>
      </div>

      {/* Impostazioni (solo visualizzazione per i non-host) */}
      <div className="bg-neutral-900 rounded-2xl p-4 mb-4 space-y-2">
        <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-3">Impostazioni</p>
        <SettingDisplay label="Punti per vincere" value={`${room.settings.target_score}`} />
        <SettingDisplay label="Tempo round" value={`${room.settings.round_timer}s`} />
        <SettingDisplay label="Pausa tra round" value={`${room.settings.pause_between_rounds}s`} />
        <SettingDisplay label="Modalità Master" value={room.settings.czar_mode === 'winner' ? 'Vincitore' : 'Rotazione'} />
        <SettingDisplay label="Giocatori max" value={`${room.settings.max_players}`} />
      </div>

      {/* Lista giocatori */}
      <div className="flex-1 bg-neutral-900 rounded-2xl p-4 mb-6">
        <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Giocatori ({players.length}/{room.settings.max_players})
        </p>
        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-neutral-800 last:border-0">
              <div className={`w-2 h-2 rounded-full ${p.connected ? 'bg-green-500' : 'bg-neutral-600'}`} />
              <span className="font-medium text-white">
                {p.nickname}
                {p.id === myPlayer.id && <span className="text-neutral-500 text-xs ml-1">(tu)</span>}
              </span>
              {p.is_host && <span className="ml-auto text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded-full">Host</span>}
            </div>
          ))}
        </div>
        {players.length < 2 && (
          <p className="text-neutral-500 text-xs text-center mt-3">
            Aspetta almeno un altro giocatore per iniziare
          </p>
        )}
      </div>

      {/* Azioni */}
      <div className="space-y-3">
        {isHost && (
          <button
            className="btn-primary w-full text-lg"
            onClick={handleStart}
            disabled={!canStart || starting}
          >
            {starting ? 'Avvio...' : `Inizia partita (${players.length} giocatori)`}
          </button>
        )}
        {!isHost && (
          <div className="text-center text-neutral-400 text-sm py-3">
            In attesa che l'host avvii la partita...
          </div>
        )}
        <button className="btn-secondary w-full" onClick={handleLeave}>
          Abbandona
        </button>
      </div>
    </div>
  )
}

function SettingDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-neutral-400 text-sm">{label}</span>
      <span className="text-white text-sm font-semibold">{value}</span>
    </div>
  )
}
