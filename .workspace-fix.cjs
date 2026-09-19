const fs=require('fs'); const p='src/components/Notes/NotesLayout.tsx';let s=fs.readFileSync(p,'utf8');
const start=s.indexOf('              selectedCategoryId ? (',s.indexOf('className={styles.editor}'));
const end=s.indexOf('                <div className={styles.home}>',start);
s=s.slice(0,start)+`              selectedCategoryId ? (
                <div className={styles.home}>
                  <div className={styles.eyebrow}>Notebook</div>
                  <h1>{currentCategory?.name}</h1>
                  <p className={styles.intro}>{sections.length} sections · {categoryPages.length} pages</p>
                  <div className={styles.quickActions}>
                    <button onClick={() => handleAddCategoryPage('New Page')}><span className={styles.actionIcon}><DocumentPlusIcon /></span><strong>New page</strong><span>Give your next idea a place.</span></button>
                    <button onClick={() => handleAddSection('New Section')}><span className={styles.actionIcon}><PlusCircleIcon /></span><strong>New section</strong><span>Keep related pages together.</span></button>
                  </div>
                  <div className={styles.sectionHeading}><h2>Pages</h2></div>
                  {loadingCategoryPages ? <p className={styles.intro}>Loading pages…</p> : categoryPages.length ? <div className={styles.recentList}>{categoryPages.map(page => <button key={page._id as string} onClick={() => setSelectedPageId(page._id as string)}><DocumentTextIcon /><span><strong>{page.title}</strong></span><ChevronRightIcon /></button>)}</div> : <p className={styles.intro}>No pages yet. Create one above or explore a section below.</p>}
                  <div className={styles.sectionHeading} style={{marginTop: 30}}><h2>Sections</h2></div>
                  {loadingSections ? <p className={styles.intro}>Loading sections…</p> : <div className={styles.notebookGrid}>{sections.map(section => <button key={section._id as string} onClick={() => handleSelectSection(section._id as string)}><BookOpenIcon /><strong>{section.name}</strong><span>Open section <ChevronRightIcon /></span></button>)}</div>}
                </div>
              ) : (
`+s.slice(end);
// Remove the obsolete resize and profile systems.
s=s.replace(/  \/\/ Resizable Sidebar State[\s\S]*?  \/\/ Persistence: Load/, '  // Persistence: Load');
s=s.replace(/    const savedCategoryWidth[\s\S]*?    const savedCategoryCollapsed/, '    const savedCategoryCollapsed');
s=s.replace(/  const startResizing[\s\S]*?\n  }, \[resizingCol, categoryWidth, sectionWidth, isCategoryCollapsed\]\);/, '');
s=s.replace(/  \/\/ Profile dropdown state[\s\S]*?  \/\/ AI Chat Modal handlers/, '  // AI Chat Modal handlers');
s=s.replace(/  \/\/ Calculate total important and flagged counts[\s\S]*?\n  return \(/, '\n  return (');
fs.writeFileSync(p,s);
