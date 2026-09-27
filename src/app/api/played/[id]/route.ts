import type { NextRequest } from 'next/server';
import { decodeParam, errorResponse, type IdRouteContext } from '@/server/http';
import { getWordService } from '@/server/word-service';

/** DELETE /api/played/:kelime — removes one word from the list so it can come up again */
export async function DELETE(_request: NextRequest, ctx: IdRouteContext) {
  try {
    await getWordService().unmarkPlayed([decodeParam((await ctx.params).id)]);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
