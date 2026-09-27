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

/** True when the section is a project (a section of a project notebook) owned by the user. */
export async function isProjectSection(userEmail: string, sectionId: unknown): Promise<boolean> {
  if (!sectionId) return false;
  const section = await NoteSection.findOne({_id: sectionId, userEmail}).select('categoryId').lean();
  if (!section) return false;
  const notebook = await NoteCategory.findOne({_id: section.categoryId, userEmail}).select('kind').lean();
  return notebook?.kind === 'project';
}

/**
 * Records project activity. Only project sections keep a history, and a failure here
 * never breaks the action that triggered it.
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
    if (!knownProject && !(await isProjectSection(userEmail, sectionId))) return;
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
