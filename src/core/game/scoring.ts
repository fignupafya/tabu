import type { GameState, PlayedCard, Player, Team } from './types';

/**
 * Correct answers and taboo mistakes are counted separately and never cancel each other out;
 * `total` (correct − taboo) is derived for the final ranking. Passes don't affect the score.
 */
export interface Score {
  correct: number;
  taboo: number;
  pass: number;
  total: number;
}

export interface Standing {
  team: Team;
  score: Score;
}

export interface PlayerStats {
  player: Player;
  team: Team;
  turns: number;
  score: Score;
}

export function scoreOf(cards: readonly PlayedCard[]): Score {
  const score = { correct: 0, taboo: 0, pass: 0, total: 0 };
  for (const { outcome } of cards) {
    if (outcome !== 'timeout') score[outcome]++;
  }
  score.total = score.correct - score.taboo;
  return score;
}

/** Committed turns only; the turn in progress is shown separately. */
export function standings(state: GameState): Standing[] {
  return state.teams.map((team) => ({
    team,
    score: scoreOf(state.history.filter((turn) => turn.teamId === team.id).flatMap((turn) => turn.cards)),
  }));
}

/** Teams with the highest total (several on a tie); empty before any turn is played. */
export function leaders(state: GameState): Team[] {
  if (state.history.length === 0) return [];
  const table = standings(state);
  const best = Math.max(...table.map((row) => row.score.total));
  return table.filter((row) => row.score.total === best).map((row) => row.team);
}

/** Per-narrator statistics, in team and narration order. */
export function playerStats(state: GameState): PlayerStats[] {
  return state.teams.flatMap((team) =>
    team.players.map((player) => {
      const turns = state.history.filter((turn) => turn.narratorId === player.id);
      return { player, team, turns: turns.length, score: scoreOf(turns.flatMap((turn) => turn.cards)) };
    }),
  );
}
