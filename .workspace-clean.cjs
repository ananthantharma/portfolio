const fs=require('fs'); let p='src/components/Notes/NotesLayout.tsx',s=fs.readFileSync(p,'utf8');
const out=fs.readFileSync('.workspace-typecheck.txt','utf8');
for (const match of out.matchAll(/NotesLayout.tsx\(\d+,\d+\): error TS6133: '([^']+)'/g)) { const n=match[1]; if(n.endsWith('Icon')) s=s.replace(new RegExp('^  '+n+',.*\\r?\\n','m'),''); }
s=s.replace("import {ICON_options} from './IconPicker';\n",'');
s=s.replace('<ClipboardDocumentListIcon />Tasks</button>', '<ClipboardDocumentListIcon />Tasks{activeTaskCount > 0 && <span>{activeTaskCount}</span>}</button>');
s=s.replace("['AI assistant', handleOpenAIChat]", "['Executive overview', () => setIsExecutiveModalOpen(true)], ['AI assistant', handleOpenAIChat]");
s=s.replace("<span>Workspace</span><ChevronRightIcon />", "<button onClick={() => {changeView('notes'); handleSelectCategory(null);}} aria-label=\"Notes home\">Workspace</button><ChevronRightIcon />");
s=s.replace('embedded active={workspaceView', 'embedded isActive={workspaceView');
fs.writeFileSync(p,s);
p='src/components/Tasks/TasksApp.tsx';s=fs.readFileSync(p,'utf8').replace('embedded = false, active = true','embedded = false, isActive = true').replace('active?: boolean','isActive?: boolean').replaceAll('if (!active) return;', 'if (!isActive) return;').replace('}, [active]);','}, [isActive]);').replace('[active, captureOpen','[isActive, captureOpen');fs.writeFileSync(p,s);
