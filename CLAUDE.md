@AGENTS.md

# Tabu — project guide

Turkish Taboo party game. Next.js 16 (App Router) + Tailwind v4 + TypeScript, one app for frontend and backend.
UI text and docs for the user are Turkish; code, identifiers and comments are English.

## Commands

- `npm run dev` — http://localhost:3000 (phones on the same Wi-Fi: the "Network" URL it prints)
- `npm test` (Vitest, `src/**/*.test.ts`) · `npm run typecheck` · `npm run lint` · `npm run build`
- `npm run -s words -- <command>` — word store CLI, see below
- `npm run screenshots` — regenerates `docs/screenshots/*.png` for the README by playing a game. Run it against a
  production build started with a scratch played list, so the dev indicator isn't in the images and the user's
  real list stays untouched: `PLAYED_FILE=<scratch>/played.json npx next start -p 3100`, then
  `BASE_URL=http://localhost:3100 npm run screenshots`

## Architecture (ports & adapters)

```
src/core/           framework-free domain, shared by app, API and CLI (no React/Next, relative imports only)
  words/            WordEntry model, difficulty levels, zod schema, file format, WordService,
                    WordRepository + PlayedWordRepository ports
  game/             pure engine (gameReducer), scoring, setup, GameStorage port
src/adapters/       port implementations; create-repositories.ts picks them (WORD_STORE, WORDS_FILE, PLAYED_FILE)
  json-file.ts      shared JSON document helper: mtime-cached reads, serialized atomic writes
  words/            JSON file adapters (data/words.json, data/played.json), in-memory adapters (tests)
  storage/          localStorage GameStorage
src/server/         server composition root (getWordService) + HTTP helpers
src/app/api/        thin REST handlers: parse request → WordService → JSON
src/lib/            client: api-client (only place the UI talks HTTP), game-store (useSyncExternalStore), sound, hooks
src/components/     UI: setup/, game/, words/, played/, ui/
scripts/            words.ts (word CLI, same WordService as the app), screenshots.ts (README images)
```

- Keep zod out of client bundles: client code may import `core/words/{word,word-query,difficulty,word-import}.ts`;
  `word-schema`, `word-file`, `word-service` are server/CLI only (type-only imports are fine).
- New store (SQLite, Postgres, remote API…): implement both ports, add a case to `create-repositories.ts`.
- Played words: every card of a committed turn counts. `GameView` posts all of the game's card ids after each
  committed turn (idempotent, so a lost request is repaired by the next one); decks leave them out unless the
  setup's `includePlayed` is on. `data/played.json` is per-install state and gitignored.
- Game rules live in `gameReducer` (pure: time and randomness come in via actions and the seeded state) — test them in `engine.test.ts`.
- The turn clock is wall-clock based (`endsAt`), so `TurnPlay` pauses it whenever the player leaves (page hidden or
  closed, in-app navigation). Keep that when touching the timer, or time keeps running while nobody is looking.
- Difficulty levels are defined once, ordered and cumulative, in `src/core/words/difficulty.ts`.

## Word data model

`data/words.json` is the single store (sorted, one compact block per word). Entry:
`{ "word": "Çay", "tags": ["içecek", "türkiye"], "taboo": { "easy": [...], "medium": [...], "hard": [...] } }`

- Difficulty is cumulative: easy mode forbids `easy`; medium forbids easy + medium; hard forbids all.
- Identity is the Turkish-lowercased, whitespace-collapsed word (`wordId`): "ÇAY" = "Çay", but "Kır" ≠ "Kir".
- A word can have any number of tags (lowercase). Current vocabulary: `npm run -s words -- tags`.

## Working with words — do NOT read data/words.json

The file is large (~950 words, ~8500 lines). Use the CLI instead:

| Need | Command |
| --- | --- |
| Every existing word, one line | `npm run -s words -- list --inline` |
| Filter | `list --tag yemek,spor`, `list --search çay`, `list --with-tags` |
| Tag vocabulary / statistics | `tags` · `stats` |
| Full entries of specific words | `show "Kara delik" Çay` |
| Validate the file (after hand edits too) | `check` |
| Add words from a file | `add <file.json> --dry-run`, then without `--dry-run` (`--strategy skip\|merge\|replace`, default skip) |
| Delete | `remove "Kelime" ...` |
| Words that came up in games | `played` (`--inline` for one line) |

### When the user asks for new words

1. Run `list --inline` and `tags`; avoid duplicates and near-duplicates, reuse existing tags.
2. Write the entries to a temp file in the scratchpad, never into `data/`: `{ "words": [ ... ] }`.
3. `add <file> --dry-run`: fix invalid entries; "Atlandı" means the word already exists.
4. `add <file>`, then `check` (should report 0 errors).

### Authoring guidelines

- Turkish words known to most adults; 1–3 words (idioms/proverbs up to 6, max 40 chars); sentence case, proper nouns capitalized.
- Taboo words: 3 `easy` (the most obvious clues), 2 `medium`, 2 `hard`; lowercase unless proper noun; seven distinct roots;
  never the card word, a word of it or its root (those are forbidden implicitly).
- 1–3 tags per word. Nothing offensive, political, religiously sensitive, or about living people.
