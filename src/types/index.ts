export type RoomStatus = 'lobby' | 'submitting' | 'judging' | 'round_end' | 'game_end'
export type CzarMode = 'winner' | 'rotation'

export interface RoomSettings {
  target_score: number
  round_timer: number       // secondi per scegliere le carte
  pause_between_rounds: number  // secondi di pausa tra un round e l'altro
  czar_mode: CzarMode
  max_players: number
}

export interface Room {
  id: string
  code: string
  host_id: string
  status: RoomStatus
  settings: RoomSettings
  round_number: number
  current_czar_id: string | null
  current_black_card_id: number | null
  timer_end: string | null   // ISO timestamp
  pause_end: string | null   // ISO timestamp pausa tra round
  winner_id: string | null   // vincitore della partita
  created_at: string
}

export interface Player {
  id: string
  room_id: string
  nickname: string
  score: number
  hand: number[]             // array di ID carte bianche
  is_host: boolean
  connected: boolean
  joined_at: string
}

export interface Round {
  id: string
  room_id: string
  round_number: number
  black_card_id: number
  czar_id: string
  winner_player_id: string | null
  status: 'submitting' | 'judging' | 'complete'
}

export interface Submission {
  id: string
  round_id: string
  player_id: string
  card_ids: number[]
  is_winner: boolean
}

export interface BlackCard {
  id: number
  text: string
  pick: 1 | 2
}

export interface WhiteCard {
  id: number
  text: string
}

export interface GameState {
  room: Room
  players: Player[]
  currentRound: Round | null
  submissions: Submission[]
  myPlayer: Player | null
}
