import { describe, expect, it } from 'vitest';
import type { Card } from '../words/word';
import { currentNarrator, currentTeam, gameReducer, passesLeft, type GameAction } from './engine';
import { leaders, playerStats, scoreOf, standings } from './scoring';
import { createGame, validateSetup, type GameSetup } from './setup';
import type { GameState } from './types';

const cards: Card[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, word: id.toUpperCase(), taboo: [] }));

const setup: GameSetup = {
  teams: [
    { name: 'Kırmızı', players: ['Ali', 'Ayşe'] },
    { name: 'Mavi', players: ['Bora', 'Banu', ''] },
  ],
  settings: { turnSeconds: 60, rounds: 2, passLimit: 1, difficulty: 'medium', tags: [], includePlayed: false },
};

const newGame = () => createGame(setup, cards, { id: 'g1', now: 0, seed: 42 });
const play = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);
const activeCard = (state: GameState) => (state.phase.name === 'playing' ? state.phase.activeCardId : null);
const quickTurn: GameAction[] = [
  { type: 'startTurn', now: 0 },
  { type: 'mark', outcome: 'correct' },
  { type: 'endTurn' },
  { type: 'confirmTurn' },
];

describe('setup', () => {
  it('validates teams and names blank players', () => {
    expect(validateSetup(setup)).toEqual([]);
    expect(validateSetup({ ...setup, teams: [{ name: 'Tek', players: ['A'] }] })).toHaveLength(2);
    expect(newGame().teams[1].players[2].name).toBe('Oyuncu 3');
  });
});

describe('a turn', () => {
  it('marks cards, enforces the pass limit, undoes and ends on timeout', () => {
    let state = play(newGame(), { type: 'startTurn', now: 1_000 });
    expect(state.phase).toMatchObject({ name: 'playing', clock: { status: 'running', endsAt: 61_000 } });

    state = play(state, { type: 'mark', outcome: 'correct' }, { type: 'mark', outcome: 'pass' });
    expect(passesLeft(state)).toBe(0);
    expect(gameReducer(state, { type: 'mark', outcome: 'pass' })).toBe(state);

    const undone = play(state, { type: 'undo' });
    expect(undone.turnCards).toHaveLength(1);
    expect(activeCard(undone)).toBe(state.turnCards[1].cardId);

    state = play(undone, { type: 'mark', outcome: 'taboo' }, { type: 'tick', now: 30_000 });
    expect(state.phase.name).toBe('playing');
    state = play(state, { type: 'tick', now: 61_000 });
    expect(state.phase.name).toBe('review');
    expect(state.turnCards.map((card) => card.outcome)).toEqual(['correct', 'taboo', 'timeout']);

    state = play(state, { type: 'setOutcome', index: 2, outcome: 'correct' }, { type: 'confirmTurn' });
    expect(standings(state)[0].score).toEqual({ correct: 2, taboo: 1, pass: 0, total: 1 });
    expect(currentTeam(state).name).toBe('Mavi');
  });

  it('stops the clock while paused', () => {
    let state = play(newGame(), { type: 'startTurn', now: 0 }, { type: 'pause', now: 20_000 });
    expect(gameReducer(state, { type: 'tick', now: 999_999 })).toBe(state);
    expect(gameReducer(state, { type: 'mark', outcome: 'correct' })).toBe(state);
    state = play(state, { type: 'resume', now: 100_000 });
    expect(state.phase).toMatchObject({ clock: { status: 'running', endsAt: 140_000 } });
  });

  it('reshuffles an exhausted deck without repeating the card on screen', () => {
    let state = play(newGame(), { type: 'startTurn', now: 0 });
    for (let i = 0; i < 12; i++) {
      const before = activeCard(state);
      state = gameReducer(state, { type: 'mark', outcome: 'correct' });
      expect(activeCard(state)).not.toBe(before);
    }
    expect(state.turnCards).toHaveLength(12);
  });
});

describe('a game', () => {
  it('alternates teams, rotates narrators and finishes after the last round', () => {
    let state = newGame();
    const narrators: string[] = [];
    for (let turn = 0; turn < 4; turn++) {
      narrators.push(currentNarrator(state).name);
      state = play(state, ...quickTurn);
    }
    expect(narrators).toEqual(['Ali', 'Bora', 'Ayşe', 'Banu']);
    expect(state.phase.name).toBe('finished');
    expect(standings(state).map((row) => row.score.total)).toEqual([2, 2]);
    expect(leaders(state)).toHaveLength(2);

    state = play(state, { type: 'addRound' });
    expect(state.phase.name).toBe('ready');
    expect(currentNarrator(state).name).toBe('Ali');
    state = play(state, ...quickTurn, { type: 'chooseNarrator', playerIndex: 0 });
    expect(currentNarrator(state).name).toBe('Bora');
    state = play(state, ...quickTurn);
    expect(state.phase.name).toBe('finished');
    expect(state.settings.rounds).toBe(3);
  });

  it('counts a reviewed turn but discards one in progress when ended early', () => {
    const reviewed = play(newGame(), { type: 'startTurn', now: 0 }, { type: 'mark', outcome: 'correct' }, { type: 'endTurn' });
    expect(standings(play(reviewed, { type: 'endGame' }))[0].score.correct).toBe(1);

    const playing = play(newGame(), { type: 'startTurn', now: 0 }, { type: 'mark', outcome: 'correct' }, { type: 'endGame' });
    expect(playing.phase.name).toBe('finished');
    expect(playing.history).toEqual([]);
  });

  it('tracks correct answers and taboo mistakes separately, per player too', () => {
    let state = play(newGame(), { type: 'startTurn', now: 0 });
    for (const outcome of ['correct', 'correct', 'taboo', 'correct', 'taboo', 'correct', 'correct'] as const) {
      state = gameReducer(state, { type: 'mark', outcome });
    }
    state = play(state, { type: 'endTurn' }, { type: 'confirmTurn' });
    expect(standings(state)[0].score).toEqual({ correct: 5, taboo: 2, pass: 0, total: 3 });
    expect(playerStats(state)[0]).toMatchObject({ turns: 1, score: { correct: 5, taboo: 2, total: 3 } });
    expect(scoreOf([{ cardId: 'a', outcome: 'timeout' }])).toEqual({ correct: 0, taboo: 0, pass: 0, total: 0 });
  });
});
