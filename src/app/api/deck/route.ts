import type { NextRequest } from 'next/server';
import { DIFFICULTY_LEVELS, isDifficultyLevel } from '@/core/words/difficulty';
import { errorResponse, tagsParam } from '@/server/http';
import { getWordService } from '@/server/word-service';

/**
 * GET /api/deck?difficulty=medium&tags=yemek,spor&includePlayed=0 → { cards } with taboo words resolved
 * for the level. `includePlayed=0` leaves out words that came up in earlier games.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const difficulty = params.get('difficulty') ?? 'medium';
    if (!isDifficultyLevel(difficulty)) {
      return Response.json(
        { error: `Geçersiz zorluk: "${difficulty}" (geçerli: ${DIFFICULTY_LEVELS.join(', ')})` },
        { status: 400 },
      );
    }
    const includePlayed = !['0', 'false'].includes(params.get('includePlayed') ?? '');
    const cards = await getWordService().buildDeck({ difficulty, tags: tagsParam(request.nextUrl), includePlayed });
    return Response.json({ cards });
  } catch (error) {
    return errorResponse(error);
  }
}
