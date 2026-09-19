const fs = require('fs');
const p='src/components/Notes/NotesLayout.tsx';
let s=fs.readFileSync(p,'utf8');
s=s.replace("import axios from 'axios';", "import axios from 'axios';\nimport dynamic from 'next/dynamic';\nimport styles from './Workspace.module.css';\nconst TasksApp = dynamic(() => import('../Tasks/TasksApp'), {ssr: false, loading: () => <div className=\"p-8 text-sm text-slate-500\">Loading your tasks…</div>});");
s=s.replace('  // Sidebar visibility states', `  const [workspaceView, setWorkspaceView] = useState<'notes' | 'tasks'>('notes');
  const [tasksVisited, setTasksVisited] = useState(false);
  const [mobileNavigation, setMobileNavigation] = useState(false);
  const changeView = useCallback((view: 'notes' | 'tasks') => {
    setWorkspaceView(view);
    if (view === 'tasks') setTasksVisited(true);
    const url = new URL(window.location.href);
    if (view === 'tasks') url.searchParams.set('view', 'tasks');
    else url.searchParams.delete('view');
    window.history.replaceState(null, '', url);
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'tasks') {
      setWorkspaceView('tasks');
      setTasksVisited(true);
    }
  }, []);

  // Sidebar visibility states`);
s=s.replace('    setIsKeyTasksOpen(false);\n    setIsImportantOpen(false);', "    setWorkspaceView('notes');\n    setIsKeyTasksOpen(false);\n    setIsImportantOpen(false);");
s=s.replace('      // Ctrl+K / Cmd+K', "      if (workspaceView !== 'notes') return;\n      // Ctrl+K / Cmd+K");
s=s.replace('[selectedSectionId, selectedCategoryId, handleAddPage, handleAddCategoryPage]);\n\n  // Calculate', '[workspaceView, selectedSectionId, selectedCategoryId, handleAddPage, handleAddCategoryPage]);\n\n  // Calculate');
const category=s.slice(s.indexOf('                <CategoryList'),s.indexOf('                {!isCategoryCollapsed &&',s.indexOf('                <CategoryList')));
let sections=s.slice(s.indexOf('                <SectionPageList'),s.indexOf('                {!isSectionCollapsed &&',s.indexOf('                <SectionPageList')));
sections=sections.replace('onSelectPage={setSelectedPageId}', 'onSelectPage={id => {setSelectedPageId(id); setMobileNavigation(false);}}');
const start=s.indexOf('      <div\n',s.indexOf('  return (\n    <BadgeSettingsProvider>'));
const main=s.indexOf('              {/* Page open: Editor */}',start);
const shell=`      <div className={styles.workspace}>
        {!isFocusMode && <aside className={styles.sidebar}>
          <Link href="/" className={styles.brand}><BookOpenIcon /> <span>notebook<span className={styles.brandDot}>.</span></span></Link>
          <div className={styles.workspaceLabel}>PERSONAL WORKSPACE</div>
          <nav className={styles.navigation} aria-label="Workspace">
            <button aria-current={workspaceView === 'notes' ? 'page' : undefined} onClick={() => changeView('notes')}><DocumentTextIcon />Notes<span>{categories.length}</span></button>
            <button aria-current={workspaceView === 'tasks' ? 'page' : undefined} onClick={() => changeView('tasks')}><ClipboardDocumentListIcon />Tasks</button>
            <button onClick={handleOpenSearch}><MagnifyingGlassIcon />Search notes<kbd>⌘ K</kbd></button>
          </nav>
          <div className={styles.notebooks}>
${category.replace('isCollapsed={isCategoryCollapsed}', 'isCollapsed={false}').replace('onSelectCategory={handleSelectCategory}', "onSelectCategory={id => {handleSelectCategory(id); changeView('notes');}}").replace('onToggleCollapse={handleToggleCategoryCollapse}', 'onToggleCollapse={() => setMobileNavigation(v => !v)}')}
          </div>
          <div className={styles.sidebarFooter}>
            <button onClick={handleOpenSettings}><Cog6ToothIcon />Workspace settings</button>
            <button onClick={() => signOut()}><span className={styles.avatar}>{userInitial}</span><span>{userName || 'My workspace'}<small>Personal account · Sign out</small></span></button>
          </div>
        </aside>}
        <div className={styles.body}>
          <header className={styles.header}>
            <div className={styles.breadcrumb}><button className={styles.mobileToggle} aria-label="Toggle notebooks and pages" aria-expanded={mobileNavigation} onClick={() => setMobileNavigation(v => !v)}><RectangleGroupIcon /></button><span>Workspace</span><ChevronRightIcon /><strong>{workspaceView === 'tasks' ? 'Tasks' : currentCategory?.name || 'My notes'}</strong>{selectedPage && workspaceView === 'notes' && <><ChevronRightIcon /><span>{selectedPage.title}</span></>}</div>
            <div className={styles.headerActions}>
              <details className={styles.tools}><summary><SparklesIcon />Tools<ChevronDownIcon /></summary><div>
                {[
                  ['AI assistant', handleOpenAIChat], ['Calendar', () => setIsCalendarOpen(true)],
                  ['Google Drive', () => setIsDriveOpen(true)], ['Contacts', handleOpenContactList],
                  ['Bookmarks', () => setIsBookmarksOpen(true)], ['Prompt library', () => setIsPromptLibraryOpen(true)],
                  ['Important notes', handleOpenImportant], ['Flagged notes', handleOpenKeyTasks],
                  ['Note reminders', handleOpenToDoList], ['Record audio', () => setIsAudioRecorderOpen(true)],
                  ['Rewrite', handleOpenRewrite], ['Image extraction', handleOpenImageExtract],
                  ['Assessment', handleOpenAssessment], ['Style refiner', handleOpenRefiner],
                  ['Contract review', handleOpenRedline], ['Humanizer', handleOpenHumanizer], ['Truth teller', handleOpenTruthTeller],
                  ...(isAdmin ? [['Camera', () => setIsCameraOpen(true)]] : []),
                ].map(([label, action]) => <button key={label as string} onClick={e => { (action as () => void)(); e.currentTarget.closest('details')?.removeAttribute('open'); }}>{label as string}</button>)}
              </div></details>
              <button className={styles.iconButton} onClick={toggleFocusMode} aria-label={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}>{isFocusMode ? <ArrowsPointingInIcon /> : <ArrowsPointingOutIcon />}</button>
              <button className={styles.primaryButton} onClick={() => {changeView('notes'); if (selectedCategoryId) handleCreatePageFromPalette(); else handleQuickNote();}}><DocumentPlusIcon />New note</button>
            </div>
          </header>
          <div className={styles.viewTabs} role="tablist" aria-label="Workspace view">
            <button id="notes-tab" role="tab" aria-selected={workspaceView === 'notes'} aria-controls="notes-panel" onClick={() => changeView('notes')}><DocumentTextIcon />Notes</button>
            <button id="tasks-tab" role="tab" aria-selected={workspaceView === 'tasks'} aria-controls="tasks-panel" onClick={() => changeView('tasks')}><ClipboardDocumentListIcon />Tasks</button>
            <span>Room to think. Space to do.</span>
          </div>
          <div id="tasks-panel" role="tabpanel" aria-labelledby="tasks-tab" hidden={workspaceView !== 'tasks'} className={styles.taskPanel}>{tasksVisited && <TasksApp embedded active={workspaceView === 'tasks'} onOpenNotes={() => changeView('notes')} />}</div>
          <div id="notes-panel" role="tabpanel" aria-labelledby="notes-tab" hidden={workspaceView !== 'notes'} className={styles.notesPanel} data-mobile-navigation={mobileNavigation}>
            {!isFocusMode && <aside className={styles.pageSidebar}>
              <div className={styles.mobileNotebooks}>${category.replace('isCollapsed={isCategoryCollapsed}', 'isCollapsed={false}')}</div>
${sections}
            </aside>}
            <main className={styles.editor}>
`;
s=s.slice(0,start)+shell+s.slice(main);
// Replace the old landing dashboard, retain notebook and section-specific screens.
const homeStart=s.indexOf('              ) : (',s.indexOf('selectedCategoryId ? (',s.indexOf('className={styles.editor}')));
const homeEnd=s.indexOf('            </main>',homeStart);
if(homeStart<0) throw Error('home not found');
s=s.slice(0,homeStart)+`              ) : (
                <div className={styles.home}>
                  <div className={styles.eyebrow}>{dateStr}</div>
                  <h1>{greeting}{userName ? ', ' + userName : ''}<span>.</span></h1>
                  <p className={styles.intro}>A little clarity for everything on your mind.</p>
                  <div className={styles.quickActions}>
                    <button onClick={handleQuickNote}><span className={styles.actionIcon}><DocumentPlusIcon /></span><strong>Start a fresh note</strong><span>Capture a thought, make it yours.</span><ChevronRightIcon /></button>
                    <button onClick={() => changeView('tasks')}><span className={styles.actionIcon}><ClipboardDocumentListIcon /></span><strong>Make room for progress</strong><span>Your tasks, right here with your notes.</span><ChevronRightIcon /></button>
                  </div>
                  <div className={styles.sectionHeading}><h2>Pick up where you left off</h2><span>Recently opened</span></div>
                  {recentPages.length ? <div className={styles.recentList}>{recentPages.slice(0, 5).map(rp => <button key={rp.id} onClick={() => handleJumpToRecentPage(rp)}><DocumentTextIcon /><span><strong>{rp.title}</strong><small>{rp.categoryName}{rp.sectionName ? ' / ' + rp.sectionName : ''}</small></span><time>{formatTimeAgo(rp.timestamp)}</time><ChevronRightIcon /></button>)}</div> : <div className={styles.empty}><BookOpenIcon /><h3>Your next idea starts here</h3><p>Create your first note. Your recent pages will appear here for easy access.</p><button className={styles.primaryButton} onClick={handleQuickNote}>Create a note</button></div>}
                  <div className={styles.sectionHeading}><h2>Your notebooks</h2><span>{categories.length} collections</span></div>
                  <div className={styles.notebookGrid}>{categories.map(cat => <button key={cat._id as string} onClick={() => handleSelectCategory(cat._id as string)}><BookOpenIcon /><strong>{cat.name}</strong><span>Open notebook <ChevronRightIcon /></span></button>)}</div>
                  <div className={styles.homeFooter}>A home for your ideas, plans, and everything in between.</div>
                </div>
              )}
`+s.slice(homeEnd);
// Remove floating controls; every action now has a stable home in the toolbar.
const floating=s.indexOf('        {/* ── Focus Mode Exit Button');
s=s.slice(0,floating)+'      </div>\n    </BadgeSettingsProvider>\n  );\n});\n\nNotesLayout.displayName = \'NotesLayout\';\nexport default NotesLayout;\n';
fs.writeFileSync(p,s);
let t=fs.readFileSync('src/components/Tasks/TasksApp.tsx','utf8');
t=t.replace('export default function TasksApp() {', "export default function TasksApp({embedded = false, active = true, onOpenNotes}: {embedded?: boolean; active?: boolean; onOpenNotes?: () => void}) {");
t=t.replace('    const onKey = (e: KeyboardEvent) => {','    const onKey = (e: KeyboardEvent) => {\n      if (!active) return;');
t=t.replace("window.removeEventListener('keydown', onKey);\n  }, []);", "window.removeEventListener('keydown', onKey);\n  }, [active]);");
t=t.replace('    const onPaste = (e: ClipboardEvent) => {','    const onPaste = (e: ClipboardEvent) => {\n      if (!active) return;');
t=t.replace('[captureOpen, newTaskOpen, paletteOpen, expandedTaskId]);','[active, captureOpen, newTaskOpen, paletteOpen, expandedTaskId]);');
t=t.replace("<div className={isDark ? 'dark' : ''}>","<div className={`${isDark ? 'dark' : ''} ${embedded ? 'h-full min-h-0' : ''}`}>");
t=t.replace('className="flex h-screen w-full overflow-hidden bg-[#f6f6f4] font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100"', 'className={`flex ${embedded ? \'h-full\' : \'h-screen\'} w-full overflow-hidden bg-[#f6f6f4] font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100`}');
t=t.replace('<RailButton href="/notes" icon={<FileText className="h-[17px] w-[17px]" />} label="Notes" />','<RailButton href={embedded ? undefined : "/notes"} onClick={onOpenNotes} icon={<FileText className="h-[17px] w-[17px]" />} label="Notes" />');
t=t.replace('>Command Centre</h1>', '>Your tasks</h1>');
fs.writeFileSync('src/components/Tasks/TasksApp.tsx',t);
