import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  submitCards, pickWinner, forceJudging, startNextRound
} from '../lib/gameLogic'
import { carteNere } from '../data/cards-black'
import { carteBianche } from '../data/cards-white'
import type { Room, Player, Round, Submission } from '../types'
import CardBlack from './CardBlack'
import CardWhite from './CardWhite'
import Timer from './Timer'
import Scoreboard from './Scoreboard'

interface Props {
  room: Room
  myPlayer: Player
  players: Player[]
}

export default function Game({ room, myPlayer, players }: Props) {
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedCards, setSelectedCards] = useState<number[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [showScoreboard, setShowScoreboard] = useState(false)
  const [myHand, setMyHand] = useState<number[]>(myPlayer.hand)
  const timerExpiredRef = useRef(false)

  const isCzar = currentRound?.czar_id === myPlayer.id
  const isHost = myPlayer.is_host
  const blackCard = currentRound ? carteNere.find(c => c.id === currentRound.black_card_id) : null

  // Aggiorna la mano locale quando cambia il player nel DB
  useEffect(() => {
    setMyHand(myPlayer.hand)
  }, [myPlayer.hand])

  // Carica il round corrente
  useEffect(() => {
    if (room.round_number === 0) return
    supabase
      .from('rounds')
      .select()
      .eq('room_id', room.id)
      .eq('round_number', room.round_number)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentRound(data as Round)
          setHasSubmitted(false)
          setSelectedCards([])
          timerExpiredRef.current = false
        }
      })
  }, [room.id, room.round_number])

  // Carica le submission del round corrente
  useEffect(() => {
    if (!currentRound) return
    supabase
      .from('submissions')
      .select()
      .eq('round_id', currentRound.id)
      .then(({ data }) => setSubmissions((data ?? []) as Submission[]))
  }, [currentRound?.id, room.status])

  // Sottoscrizione Realtime alle submission
  useEffect(() => {
    if (!currentRound) return
    const channel = supabase
      .channel(`submissions-${currentRound.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'submissions',
        filter: `round_id=eq.${currentRound.id}`
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setSubmissions(prev => [...prev, payload.new as Submission])
        }
        if (payload.eventType === 'UPDATE') {
          setSubmissions(prev => prev.map(s => s.id === (payload.new as Submission).id ? payload.new as Submission : s))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentRound?.id])

  // Auto-avanza a judging quando tutti hanno giocato (solo host)
  useEffect(() => {
    if (!isHost || !currentRound || room.status !== 'submitting' || !blackCard) return
    const nonCzarPlayers = players.filter(p => p.id !== currentRound.czar_id)
    const allSubmitted = nonCzarPlayers.every(p => submissions.some(s => s.player_id === p.id))
    if (allSubmitted && nonCzarPlayers.length > 0) {
      forceJudging(currentRound.id, room.id)
    }
  }, [submissions, players, currentRound, room.status, room.id, isHost, blackCard])

  // Timer scaduto: host forza il passaggio a judging
  function handleTimerExpire() {
    if (timerExpiredRef.current) return
    timerExpiredRef.current = true
    if (isHost && currentRound && room.status === 'submitting') {
      forceJudging(currentRound.id, room.id)
    }
  }

  // Timer pausa scaduto: host avvia il round successivo
  function handlePauseExpire() {
    if (!isHost || room.status !== 'round_end') return
    const usedBlackIds = [] as number[] // semplificato: potresti tracciare nel DB
    startNextRound(room, players, usedBlackIds, room.winner_id!)
  }

  async function handleSubmit() {
    if (!currentRound || !blackCard || selectedCards.length !== blackCard.pick) return
    setHasSubmitted(true)
    try {
      await submitCards(currentRound.id, myPlayer.id, selectedCards, myHand, blackCard.pick)
    } catch {
      setHasSubmitted(false)
    }
  }

  async function handlePickWinner(submission: Submission) {
    if (!currentRound || !isCzar || room.status !== 'judging') return
    const usedBlackIds: number[] = []
    await pickWinner(room, currentRound, submission, players, usedBlackIds)
  }

  function toggleCard(cardId: number) {
    if (hasSubmitted || isCzar || !blackCard) return
    setSelectedCards(prev => {
      if (prev.includes(cardId)) return prev.filter(id => id !== cardId)
      if (prev.length >= blackCard.pick) return [...prev.slice(1), cardId]
      return [...prev, cardId]
    })
  }

  if (showScoreboard) {
    return (
      <Scoreboard
        players={players}
        myPlayer={myPlayer}
        targetScore={room.settings.target_score}
        onClose={() => setShowScoreboard(false)}
      />
    )
  }

  // ----------------------------------------------------------------
  // Schermata Round End / Pausa
  // ----------------------------------------------------------------
  if (room.status === 'round_end' || room.status === 'game_end') {
    const roundWinner = players.find(p => p.id === room.winner_id)
    const winningSubmission = submissions.find(s => s.is_winner)
    const winningCards = winningSubmission?.card_ids.map(id => carteBianche.find(c => c.id === id)!) ?? []

    return (
      <div className="min-h-screen flex flex-col px-4 py-6 max-w-sm mx-auto">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="text-2xl font-black text-white">
            {roundWinner?.nickname ?? '?'} vince il round!
          </h2>
          {room.status === 'game_end' && (
            <p className="text-yellow-400 font-bold mt-1">Ha vinto la partita! 🎉</p>
          )}
        </div>

        {blackCard && (
          <div className="mb-4">
            <CardBlack card={blackCard} compact />
          </div>
        )}

        <div className="space-y-2 mb-6">
          {winningCards.map(card => (
            <CardWhite key={card.id} card={card} disabled compact />
          ))}
        </div>

        {/* Punteggi rapidi */}
        <div className="bg-neutral-900 rounded-2xl p-4 mb-6">
          {[...players]
            .sort((a, b) => b.score - a.score)
            .map(p => (
              <div key={p.id} className="flex justify-between py-1.5 border-b border-neutral-800 last:border-0">
                <span className={`font-medium ${p.id === myPlayer.id ? 'text-white' : 'text-neutral-300'}`}>
                  {p.nickname} {p.id === myPlayer.id && '(tu)'}
                </span>
                <span className="font-black text-white">{p.score} / {room.settings.target_score}</span>
              </div>
            ))}
        </div>

        {room.status === 'round_end' && isHost && (
          <div className="text-center space-y-2">
            <Timer
              endTime={room.pause_end}
              onExpire={handlePauseExpire}
              label="al prossimo round"
            />
            <p className="text-neutral-500 text-xs">
              Il round successivo inizierà automaticamente
            </p>
          </div>
        )}
        {room.status === 'round_end' && !isHost && (
          <div className="text-center">
            <Timer endTime={room.pause_end} label="al prossimo round" />
          </div>
        )}
        {room.status === 'game_end' && (
          <button className="btn-primary w-full" onClick={() => window.location.reload()}>
            Nuova partita
          </button>
        )}
      </div>
    )
  }

  // ----------------------------------------------------------------
  // Schermata Gioco principale
  // ----------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col px-4 py-4 max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-neutral-400 text-sm">
          Round <span className="text-white font-bold">{room.round_number}</span>
          {currentRound && (
            <span className="ml-2 text-neutral-500">
              · Master: <span className="text-white">{players.find(p => p.id === currentRound.czar_id)?.nickname ?? '?'}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {room.status === 'submitting' && (
            <Timer endTime={room.timer_end} onExpire={handleTimerExpire} />
          )}
          <button
            onClick={() => setShowScoreboard(true)}
            className="text-neutral-400 text-xs bg-neutral-800 px-2 py-1 rounded-lg"
          >
            📊
          </button>
        </div>
      </div>

      {/* Carta nera */}
      {blackCard && (
        <div className="mb-4">
          <CardBlack card={blackCard} />
        </div>
      )}

      {/* Stato del round */}
      {room.status === 'submitting' && (
        <div className="text-center text-neutral-400 text-sm mb-3">
          {isCzar
            ? 'Sei il Master — aspetta che gli altri giochino le loro carte'
            : hasSubmitted
              ? `Hai giocato. In attesa degli altri... (${submissions.length}/${players.length - 1})`
              : `Scegli ${blackCard?.pick === 2 ? '2 carte' : 'una carta'} dalla tua mano`
          }
        </div>
      )}

      {room.status === 'judging' && (
        <div className="text-center text-neutral-400 text-sm mb-3">
          {isCzar ? 'Tocca a te scegliere la risposta migliore!' : 'Il Master sta scegliendo...'}
        </div>
      )}

      {/* Vista JUDGING: submissions anonime */}
      {room.status === 'judging' && (
        <div className="flex-1 space-y-3 overflow-y-auto pb-4">
          {submissions.map((sub, i) => {
            const subCards = sub.card_ids.map(id => carteBianche.find(c => c.id === id)!)
            return (
              <div
                key={sub.id}
                onClick={() => isCzar && handlePickWinner(sub)}
                className={`bg-white rounded-2xl p-4 space-y-2 ${
                  isCzar ? 'cursor-pointer active:scale-95 transition-transform' : ''
                }`}
              >
                <p className="text-black text-xs font-bold uppercase tracking-wider opacity-40">
                  Risposta {i + 1}
                </p>
                {subCards.map(card => (
                  <p key={card.id} className="text-black font-medium text-base">{card.text}</p>
                ))}
              </div>
            )
          })}
          {submissions.length === 0 && (
            <p className="text-neutral-600 text-center text-sm">Nessuna carta giocata</p>
          )}
        </div>
      )}

      {/* Vista SUBMITTING: mano del giocatore */}
      {room.status === 'submitting' && !isCzar && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 grid grid-cols-1 gap-3 overflow-y-auto pb-4">
            {myHand.map(cardId => {
              const card = carteBianche.find(c => c.id === cardId)
              if (!card) return null
              const selIdx = selectedCards.indexOf(cardId)
              return (
                <CardWhite
                  key={cardId}
                  card={card}
                  selected={selIdx !== -1}
                  selectionOrder={selIdx !== -1 ? selIdx + 1 : undefined}
                  disabled={hasSubmitted}
                  onClick={() => toggleCard(cardId)}
                />
              )
            })}
          </div>

          {!hasSubmitted && blackCard && (
            <button
              className="btn-primary w-full mt-3"
              onClick={handleSubmit}
              disabled={selectedCards.length !== blackCard.pick}
            >
              Gioca {blackCard.pick === 2 ? 'le 2 carte' : 'la carta'}
              {selectedCards.length > 0 && ` (${selectedCards.length}/${blackCard.pick})`}
            </button>
          )}
        </div>
      )}

      {/* Vista SUBMITTING per il Czar: lista giocatori che hanno giocato */}
      {room.status === 'submitting' && isCzar && (
        <div className="flex-1 bg-neutral-900 rounded-2xl p-4">
          <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Giocatori pronti
          </p>
          {players
            .filter(p => p.id !== currentRound?.czar_id)
            .map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-neutral-800 last:border-0">
                <div className={`w-2 h-2 rounded-full ${
                  submissions.some(s => s.player_id === p.id) ? 'bg-green-500' : 'bg-neutral-600'
                }`} />
                <span className="text-white text-sm">{p.nickname}</span>
                {submissions.some(s => s.player_id === p.id) && (
                  <span className="ml-auto text-green-500 text-xs">✓ ha giocato</span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
