import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import type { Room, Player } from './types'
import Home from './components/Home'
import Lobby from './components/Lobby'
import Game from './components/Game'

type AppScreen = 'home' | 'lobby' | 'game'

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home')
  const [room, setRoom] = useState<Room | null>(null)
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])

  // Sottoscrizione Realtime: aggiornamenti stanza e giocatori
  useEffect(() => {
    if (!room) return

    // Canale per la room
    const roomChannel = supabase
      .channel(`room-${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${room.id}`
      }, payload => {
        const updated = payload.new as Room
        setRoom(updated)
        if (updated.status !== 'lobby') setScreen('game')
      })
      .subscribe()

    // Canale per i giocatori
    const playersChannel = supabase
      .channel(`players-${room.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'players',
        filter: `room_id=eq.${room.id}`
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setPlayers(prev => [...prev, payload.new as Player])
        }
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Player
          setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p))
          if (myPlayer && updated.id === myPlayer.id) setMyPlayer(updated)
        }
        if (payload.eventType === 'DELETE') {
          setPlayers(prev => prev.filter(p => p.id !== (payload.old as Player).id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(roomChannel)
      supabase.removeChannel(playersChannel)
    }
  }, [room?.id, myPlayer?.id])

  // Carica la lista iniziale di giocatori quando si entra nella stanza
  useEffect(() => {
    if (!room) return
    supabase
      .from('players')
      .select()
      .eq('room_id', room.id)
      .then(({ data }) => setPlayers((data ?? []) as Player[]))
  }, [room?.id])

  function handleEnterRoom(r: Room, p: Player) {
    setRoom(r)
    setMyPlayer(p)
    setScreen('lobby')
  }

  if (!room || !myPlayer) {
    return <Home onEnter={handleEnterRoom} />
  }

  if (screen === 'lobby') {
    return <Lobby room={room} myPlayer={myPlayer} players={players} />
  }

  return <Game room={room} myPlayer={myPlayer} players={players} />
}
