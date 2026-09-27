import { shuffle } from './random';
import type { CardOutcome, GameState, MarkOutcome, Player, Team, TurnClock, TurnRecord } from './types';

export type GameAction =
  | { type: 'startTurn'; now: number }
  | { type: 'mark'; outcome: MarkOutcome }
  /** Takes back the last marked card of the running turn. */
  | { type: 'undo' }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  /** Sent periodically by the UI; ends the turn once the clock has run out. */
  | { type: 'tick'; now: number }
  /** Ends the turn early, exactly as if time ran out. */
  | { type: 'endTurn' }
  /** Corrects a card during review (e.g. a word guessed at the buzzer). */
  | { type: 'setOutcome'; index: number; outcome: CardOutcome }
  | { type: 'confirmTurn' }
  | { type: 'chooseNarrator'; playerIndex: number }
  | { type: 'endGame' }
  /** After the game: play one more round (or finish the interrupted one). */
  | { type: 'addRound' };

/**
 * Pure state machine of a game: ready → playing → review → ready … → finished.
 *
 * Time and randomness enter only through actions and the seeded state, so the same reducer can
 * run in the browser today or on a server for multi-device play later, and is easy to test.
 * Actions that make no sense in the current phase return the state unchanged.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  const { phase } = state;

  switch (action.type) {
    case 'startTurn': {
      if (phase.name !== 'ready') return state;
      const draw = drawCard(state);
      const endsAt = action.now + state.settings.turnSeconds * 1000;
      return {
        ...state,
        drawPile: draw.drawPile,
        seed: draw.seed,
        turnCards: [],
        phase: { name: 'playing', activeCardId: draw.cardId, clock: { status: 'running', endsAt } },
      };
    }

    case 'mark': {
      if (phase.name !== 'playing' || phase.clock.status !== 'running') return state;
      if (action.outcome === 'pass' && passesLeft(state) === 0) return state;
      const draw = drawCard(state, phase.activeCardId);
      return {
        ...state,
        drawPile: draw.drawPile,
        seed: draw.seed,
        turnCards: [...state.turnCards, { cardId: phase.activeCardId, outcome: action.outcome }],
        phase: { ...phase, activeCardId: draw.cardId },
      };
    }

    case 'undo': {
      const last = state.turnCards.at(-1);
      if (phase.name !== 'playing' || phase.clock.status !== 'running' || !last) return state;
      return {
        ...state,
        drawPile: [phase.activeCardId, ...state.drawPile],
        turnCards: state.turnCards.slice(0, -1),
        phase: { ...phase, activeCardId: last.cardId },
      };
    }

    case 'pause': {
      if (phase.name !== 'playing' || phase.clock.status !== 'running') return state;
      const remainingMs = Math.max(0, phase.clock.endsAt - action.now);
      return { ...state, phase: { ...phase, clock: { status: 'paused', remainingMs } } };
    }

    case 'resume': {
      if (phase.name !== 'playing' || phase.clock.status !== 'paused') return state;
      const endsAt = action.now + phase.clock.remainingMs;
      return { ...state, phase: { ...phase, clock: { status: 'running', endsAt } } };
    }

    case 'tick':
      if (phase.name !== 'playing' || phase.clock.status !== 'running' || action.now < phase.clock.endsAt) {
        return state;
      }
      return finishTurn(state);

    case 'endTurn':
      return phase.name === 'playing' ? finishTurn(state) : state;

    case 'setOutcome': {
      if (phase.name !== 'review' || !state.turnCards[action.index]) return state;
      const turnCards = state.turnCards.map((card, i) =>
        i === action.index ? { ...card, outcome: action.outcome } : card,
      );
      return { ...state, turnCards };
    }

    case 'confirmTurn':
      return phase.name === 'review' ? commitTurn(state) : state;

    case 'chooseNarrator': {
      if (phase.name !== 'ready' || !currentTeam(state).players[action.playerIndex]) return state;
      const narratorIndexes = state.narratorIndexes.map((n, i) => (i === state.teamIndex ? action.playerIndex : n));
      return { ...state, narratorIndexes };
    }

    case 'endGame': {
      if (phase.name === 'finished') return state;
      // A reviewed turn is complete and counts; a turn still being played is discarded.
      const settled = phase.name === 'review' ? commitTurn(state) : { ...state, turnCards: [] };
      return { ...settled, phase: { name: 'finished' } };
    }

    case 'addRound':
      if (phase.name !== 'finished') return state;
      return { ...state, settings: { ...state.settings, rounds: state.round }, phase: { name: 'ready' } };
  }
}

export function currentTeam(state: GameState): Team {
  return state.teams[state.teamIndex];
}

export function currentNarrator(state: GameState): Player {
  return currentTeam(state).players[state.narratorIndexes[state.teamIndex]];
}

/** Passes left in the current turn; null when unlimited. */
export function passesLeft(state: GameState): number | null {
  const { passLimit } = state.settings;
  if (passLimit === null) return null;
  return Math.max(0, passLimit - state.turnCards.filter((card) => card.outcome === 'pass').length);
}

export function remainingMs(clock: TurnClock, now: number): number {
  return clock.status === 'running' ? Math.max(0, clock.endsAt - now) : clock.remainingMs;
}

function drawCard(state: GameState, activeCardId?: string): { cardId: string; drawPile: string[]; seed: number } {
  let { drawPile, seed } = state;
  if (drawPile.length === 0) {
    // Deck exhausted: reshuffle every card, avoiding an immediate repeat of the one on screen.
    const all = Object.keys(state.cards);
    [drawPile, seed] = shuffle(all.length > 1 ? all.filter((id) => id !== activeCardId) : all, seed);
  }
  const [cardId, ...rest] = drawPile;
  return { cardId, drawPile: rest, seed };
}

/** The card on screen when the turn ends is kept as 'timeout' so it can be corrected in review. */
function finishTurn(state: GameState): GameState {
  if (state.phase.name !== 'playing') return state;
  return {
    ...state,
    turnCards: [...state.turnCards, { cardId: state.phase.activeCardId, outcome: 'timeout' }],
    phase: { name: 'review' },
  };
}

/** Records the turn, rotates the narrator of that team and passes the turn to the next team. */
function commitTurn(state: GameState): GameState {
  const team = currentTeam(state);
  const record: TurnRecord = {
    round: state.round,
    teamId: team.id,
    narratorId: currentNarrator(state).id,
    cards: state.turnCards,
  };
  const isLastTeam = state.teamIndex === state.teams.length - 1;
  const round = isLastTeam ? state.round + 1 : state.round;

  return {
    ...state,
    history: [...state.history, record],
    turnCards: [],
    narratorIndexes: state.narratorIndexes.map((n, i) => (i === state.teamIndex ? (n + 1) % team.players.length : n)),
    teamIndex: isLastTeam ? 0 : state.teamIndex + 1,
    round,
    phase: round > state.settings.rounds ? { name: 'finished' } : { name: 'ready' },
  };
}
