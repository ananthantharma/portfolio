import NoteCategory from '@/models/NoteCategory';
import NoteSection from '@/models/NoteSection';
import ProjectActivity, {ActivityType} from '@/models/ProjectActivity';

export interface ActivityEntry {
  type: ActivityType;
  action: string;
  label: string;
  title: string;
  refId?: string | null;
}

/** 'project' or 'vendor' when the section belongs to a project or vendor notebook owned by the user. */
export async function profileKind(userEmail: string, sectionId: unknown): Promise<'project' | 'vendor' | null> {
  if (!sectionId) return null;
  const section = await NoteSection.findOne({_id: sectionId, userEmail}).select('categoryId').lean();
  if (!section) return null;
  const notebook = await NoteCategory.findOne({_id: section.categoryId, userEmail}).select('kind').lean();
  return notebook?.kind === 'project' || notebook?.kind === 'vendor' ? notebook.kind : null;
}

/**
 * Records activity for a project or vendor page. Other sections keep no history, and a failure
 * here never breaks the action that triggered it.
 */
export async function logActivity(
  userEmail: string,
  sectionId: unknown,
  entries: ActivityEntry | ActivityEntry[],
  {knownProject = false}: {knownProject?: boolean} = {},
) {
  const list = (Array.isArray(entries) ? entries : [entries]).filter(e => e.label);
  if (!list.length || !sectionId) return;
  try {
    if (!knownProject && !(await profileKind(userEmail, sectionId))) return;
    await ProjectActivity.insertMany(
      list.map(e => ({
        userEmail,
        sectionId,
        type: e.type,
        action: e.action,
        label: e.label.slice(0, 80),
        title: (e.title || '').slice(0, 240),
        refId: e.refId || null,
      })),
    );
  } catch (error) {
    console.error('Project activity log failed:', error);
  }
}
