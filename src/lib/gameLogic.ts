import { supabase } from './supabase'
import { carteNere } from '../data/cards-black'
import { carteBianche } from '../data/cards-white'
import type { Room, Player, RoomSettings } from '../types'

const HAND_SIZE = 10

// ----------------------------------------------------------------
// Stanza
// ----------------------------------------------------------------

export async function createRoom(nickname: string, settings: RoomSettings) {
  const { data: codeData, error: codeError } = await supabase
    .rpc('generate_room_code')
  if (codeError) throw codeError

  const hostId = crypto.randomUUID()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code: codeData, host_id: hostId, settings })
    .select()
    .single()
  if (roomError) throw roomError

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ room_id: room.id, nickname, is_host: true, id: hostId })
    .select()
    .single()
  if (playerError) throw playerError

  return { room: room as Room, player: player as Player }
}

export async function joinRoom(code: string, nickname: string) {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select()
    .eq('code', code.toUpperCase())
    .single()
  if (roomError) throw new Error('Stanza non trovata')
  if (room.status !== 'lobby') throw new Error('La partita è già iniziata')

  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('room_id', room.id)
    .eq('nickname', nickname)
    .maybeSingle()
  if (existing) throw new Error('Nickname già in uso in questa stanza')

  const settings = room.settings as RoomSettings
  const { data: players } = await supabase
    .from('players')
    .select('id')
    .eq('room_id', room.id)
  if (players && players.length >= settings.max_players) {
    throw new Error('Stanza piena')
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ room_id: room.id, nickname })
    .select()
    .single()
  if (playerError) throw playerError

  return { room: room as Room, player: player as Player }
}

// ----------------------------------------------------------------
// Avvio partita (solo host)
// ----------------------------------------------------------------

export async function startGame(room: Room, players: Player[]) {
  const deck = shuffleArray([...carteBianche.map(c => c.id)])

  const hands: Record<string, number[]> = {}
  let idx = 0
  for (const p of players) {
    hands[p.id] = deck.slice(idx, idx + HAND_SIZE)
    idx += HAND_SIZE
  }

  // Distribuisce le mani
  await Promise.all(
    players.map(p =>
      supabase.from('players').update({ hand: hands[p.id] }).eq('id', p.id)
    )
  )

  // Primo czar = host
  const czarId = room.host_id
  const blackCard = pickRandomBlackCard([])
  const timerEnd = new Date(Date.now() + room.settings.round_timer * 1000).toISOString()

  await supabase.from('rounds').insert({
    room_id: room.id,
    round_number: 1,
    black_card_id: blackCard.id,
    czar_id: czarId,
  })

  await supabase.from('rooms').update({
    status: 'submitting',
    round_number: 1,
    current_czar_id: czarId,
    current_black_card_id: blackCard.id,
    timer_end: timerEnd,
  }).eq('id', room.id)
}

// ----------------------------------------------------------------
// Gioca le carte (giocatore)
// ----------------------------------------------------------------

export async function submitCards(
  roundId: string,
  playerId: string,
  cardIds: number[],
  currentHand: number[],
  blackCardPick: number
) {
  if (cardIds.length !== blackCardPick) {
    throw new Error(`Devi scegliere esattamente ${blackCardPick} carta/e`)
  }

  await supabase.from('submissions').insert({
    round_id: roundId,
    player_id: playerId,
    card_ids: cardIds,
  })

  // Rimuove le carte usate dalla mano
  const newHand = currentHand.filter(id => !cardIds.includes(id))
  await supabase.from('players').update({ hand: newHand }).eq('id', playerId)
}

// ----------------------------------------------------------------
// Il Master sceglie il vincitore
// ----------------------------------------------------------------

export async function pickWinner(
  room: Room,
  round: { id: string; round_number: number },
  winnerSubmission: { id: string; player_id: string },
  players: Player[],
  usedBlackCardIds: number[]
) {
  // Segna la submission vincitrice
  await supabase.from('submissions')
    .update({ is_winner: true })
    .eq('id', winnerSubmission.id)

  // Aggiorna il punteggio del vincitore
  const winner = players.find(p => p.id === winnerSubmission.player_id)!
  await supabase.from('players')
    .update({ score: winner.score + 1 })
    .eq('id', winner.id)

  // Completa il round
  await supabase.from('rounds')
    .update({ status: 'complete', winner_player_id: winner.id })
    .eq('id', round.id)

  const settings = room.settings
  const pauseEnd = new Date(Date.now() + settings.pause_between_rounds * 1000).toISOString()

  // Controlla se ha vinto la partita
  const newScore = winner.score + 1
  if (newScore >= settings.target_score) {
    await supabase.from('rooms').update({
      status: 'game_end',
      winner_id: winner.id,
      pause_end: pauseEnd,
    }).eq('id', room.id)
    return
  }

  await supabase.from('rooms').update({
    status: 'round_end',
    winner_id: winner.id,
    pause_end: pauseEnd,
  }).eq('id', room.id)
}

// ----------------------------------------------------------------
// Nuovo round (host, chiamato dopo la pausa)
// ----------------------------------------------------------------

export async function startNextRound(
  room: Room,
  players: Player[],
  usedBlackCardIds: number[],
  lastWinnerId: string
) {
  const nextRoundNumber = room.round_number + 1

  // Nuovo czar
  const nextCzarId =
    room.settings.czar_mode === 'winner'
      ? lastWinnerId
      : getNextCzar(players, room.current_czar_id)

  // Nuova carta nera
  const blackCard = pickRandomBlackCard(usedBlackCardIds)

  // Distribuisce nuove carte ai giocatori che ne hanno meno di HAND_SIZE
  const usedCards = new Set(players.flatMap(p => p.hand))
  const available = carteBianche.map(c => c.id).filter(id => !usedCards.has(id))
  const refillDeck = shuffleArray(available)
  let refillIdx = 0

  await Promise.all(
    players.map(async p => {
      const needed = HAND_SIZE - p.hand.length
      if (needed > 0) {
        const newCards = refillDeck.slice(refillIdx, refillIdx + needed)
        refillIdx += needed
        await supabase.from('players')
          .update({ hand: [...p.hand, ...newCards] })
          .eq('id', p.id)
      }
    })
  )

  const timerEnd = new Date(Date.now() + room.settings.round_timer * 1000).toISOString()

  await supabase.from('rounds').insert({
    room_id: room.id,
    round_number: nextRoundNumber,
    black_card_id: blackCard.id,
    czar_id: nextCzarId,
  })

  await supabase.from('rooms').update({
    status: 'submitting',
    round_number: nextRoundNumber,
    current_czar_id: nextCzarId,
    current_black_card_id: blackCard.id,
    timer_end: timerEnd,
    winner_id: null,
    pause_end: null,
  }).eq('id', room.id)
}

// ----------------------------------------------------------------
// Forza fine timer (host, se il timer è scaduto)
// ----------------------------------------------------------------

export async function forceJudging(roundId: string, roomId: string) {
  await supabase.from('rounds').update({ status: 'judging' }).eq('id', roundId)
  await supabase.from('rooms').update({ status: 'judging', timer_end: null }).eq('id', roomId)
}

// ----------------------------------------------------------------
// Utils
// ----------------------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandomBlackCard(usedIds: number[]) {
  const available = carteNere.filter(c => !usedIds.includes(c.id))
  if (available.length === 0) return carteNere[Math.floor(Math.random() * carteNere.length)]
  return available[Math.floor(Math.random() * available.length)]
}

function getNextCzar(players: Player[], currentCzarId: string | null): string {
  if (!currentCzarId) return players[0].id
  const idx = players.findIndex(p => p.id === currentCzarId)
  return players[(idx + 1) % players.length].id
}
