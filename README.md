# CAH Italia 🇮🇹

Cards Against Humanity in italiano — PWA multiplayer giocabile da mobile via browser.

## Setup rapido

### 1. Supabase

1. Nel tuo account Supabase crea un **nuovo progetto** (es. `cah-ita`)
2. Vai su **SQL Editor** e incolla tutto il contenuto di `supabase/schema.sql`
3. Esegui lo script — crea le tabelle, le policy RLS e la funzione per i codici stanza
4. Da **Project Settings → API** copia:
   - `Project URL`
   - `anon / public key`

### 2. Variabili d'ambiente

```bash
cp .env.example .env
```

Modifica `.env` con i valori di Supabase:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Sviluppo locale

```bash
npm install
npm run dev
```

### 4. Deploy su GitHub Pages

1. Assicurati che `vite.config.ts` abbia `base: '/cah-ita/'` (già configurato)
2. Nel tuo repository GitHub crea la cartella `cah-ita/` (oppure usa un repo dedicato)
3. Build e deploy:

```bash
npm run build
# Copia la cartella dist/ nel tuo repo GitHub Pages
```

Oppure configura **GitHub Actions** per il deploy automatico:

```yaml
# .github/workflows/deploy.yml
name: Deploy CAH Italia
on:
  push:
    branches: [main]
    paths: ['cah-ita/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
        working-directory: cah-ita
      - run: npm run build
        working-directory: cah-ita
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: cah-ita/dist
```

Aggiungi `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nei **Secrets** del repository GitHub.

---

## Come si gioca

1. Un giocatore crea una stanza e condivide il **codice** (6 caratteri)
2. Gli altri entrano inserendo il codice e un nickname — nessuna registrazione
3. L'host configura le regole e avvia la partita
4. Ogni round:
   - Viene mostrata una **carta nera** con una frase da completare
   - Tutti i giocatori (tranne il Master) scelgono una o due **carte bianche** dalla propria mano entro il timer
   - Il **Master** sceglie la risposta più divertente
   - Il vincitore ottiene 1 punto
5. Vince chi raggiunge il punteggio obiettivo

## Impostazioni configurabili dall'host

| Opzione | Valori |
|---|---|
| Punti per vincere | 3 / 5 / 8 / 10 |
| Tempo per round | 30s / 60s / 90s / 120s |
| Pausa tra round | 3s / 5s / 10s / 15s |
| Modalità Master | Vincitore del round / Rotazione |
| Giocatori massimi | 4 – 20 |

## Dataset carte

- **35 carte nere** (domande/frasi italiane)
- **120 carte bianche** (risposte)

Il dataset è in `src/data/cards-black.ts` e `src/data/cards-white.ts` — aggiungere nuove carte è semplicissimo.
