import { z } from 'zod';
import { MERGE_STRATEGIES } from '@/core/words/word-import';
import { errorResponse, readJson } from '@/server/http';
import { getWordService } from '@/server/word-service';

const importRequest = z.object({
  /** The uploaded file content: `{ "words": [...] }` or a bare array. */
  data: z.unknown(),
  strategy: z.enum(MERGE_STRATEGIES).default('skip'),
  dryRun: z.boolean().default(false),
});

/** POST /api/words/import — body: { data, strategy?, dryRun? } → ImportReport */
export async function POST(request: Request) {
  try {
    const body = importRequest.safeParse(await readJson(request));
    if (!body.success) {
      return Response.json(
        { error: 'Geçersiz istek', details: body.error.issues.map((issue) => issue.message) },
        { status: 400 },
      );
    }
    const { data, strategy, dryRun } = body.data;
    return Response.json(await getWordService().importWords(data, { strategy, dryRun }));
  } catch (error) {
    return errorResponse(error);
  }
}
