import {createRecord} from '@/lib/projectRecords';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, {params}: {params: {sectionId: string}}) {
  return createRecord(req, params.sectionId, 'decisions');
}
