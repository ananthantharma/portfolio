import {deleteRecord, updateRecord} from '@/lib/projectRecords';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {sectionId: string; itemId: string};
}

export async function PUT(req: Request, {params}: RouteParams) {
  return updateRecord(req, params.sectionId, 'attention', params.itemId);
}

export async function DELETE(_req: Request, {params}: RouteParams) {
  return deleteRecord(params.sectionId, 'attention', params.itemId);
}
