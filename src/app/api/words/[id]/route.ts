import type { NextRequest } from 'next/server';
import { wordId } from '@/core/words/word';
import { decodeParam, errorResponse, readJson, type IdRouteContext } from '@/server/http';
import { getWordService } from '@/server/word-service';

async function idFrom(ctx: IdRouteContext): Promise<string> {
  return wordId(decodeParam((await ctx.params).id));
}

export async function GET(_request: NextRequest, ctx: IdRouteContext) {
  try {
    return Response.json({ entry: await getWordService().getWord(await idFrom(ctx)) });
  } catch (error) {
    return errorResponse(error);
  }
}

/** PUT /api/words/:id — replaces the word; renaming is allowed → { entry, warnings } */
export async function PUT(request: NextRequest, ctx: IdRouteContext) {
  try {
    return Response.json(await getWordService().updateWord(await idFrom(ctx), await readJson(request)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: IdRouteContext) {
  try {
    await getWordService().deleteWord(await idFrom(ctx));
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
