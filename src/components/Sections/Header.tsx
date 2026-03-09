/* eslint-disable simple-import-sort/imports */
'use client';

import Link from 'next/link';
import { FC, memo, useCallback, useEffect, useRef, useState } from 'react';

import { SectionId } from '../../data/data';
import { useNavObserver } from '../../hooks/useNavObserver';
import UserProfileMenu from '../UserProfileMenu';

export const headerID = 'headerNav';

// ─── Data ──────────────────────────────────────────────────────────────────────

const topLevelItems = [
  { label: 'Home', href: '/' },
  { label: 'Contact', href: `/#${SectionId.Contact}` },
  { label: 'AI Chat', href: '/chat' },
  { label: 'Open', href: '/open' },
  { label: 'Invoices', href: '/smart-invoices' },
];

const ananthanItems = [
  { label: 'Drive', href: '/drive', emoji: '☁️', desc: 'File storage' },
  { label: 'Bookmarks', href: '/bookmarks', emoji: '🔖', desc: 'Saved links' },
  { label: 'Secure Login', href: '/dashboard', emoji: '🔐', desc: 'Vault' },
  { label: 'Finance', href: '/finance', emoji: '💰', desc: 'Money tracker' },
  { label: 'Notes', href: '/notes', emoji: '📝', desc: 'Workspace' },
  { label: 'Gantt', href: '/gantt', emoji: '📊', desc: 'Projects' },
  { label: 'Tasks', href: '/tasks', emoji: '✅', desc: 'To-do list' },
];

// ─── Root ──────────────────────────────────────────────────────────────────────

const Header: FC = memo(() => {
  const navSections = [SectionId.Contact];
  const [currentSection, setCurrentSection] = useState<SectionId | null>(null);

  const intersectionHandler = useCallback((section: SectionId | null) => {
    section && setCurrentSection(section);
  }, []);

  useNavObserver(navSections.map(s => `#${s}`).join(','), intersectionHandler);

  return (
    <>
      <MobileNav />
      <DesktopNav currentSection={currentSection} />
    </>
  );
});

// ─── Desktop ───────────────────────────────────────────────────────────────────

const DesktopNav: FC<{ currentSection: SectionId | null }> = memo(({ currentSection: _cs }) => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAnanthanActive = ananthanItems.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/'),
  );

  if (!mounted) return null;

  return (
    <>
      {/* Inject keyframes */}
      <style>{`
        @keyframes nav-fade-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
        }
        @keyframes dropdown-in {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 16px rgba(249,115,22,0.3); }
          50%       { box-shadow: 0 0 28px rgba(249,115,22,0.55); }
        }
        .nav-link-pill:hover .nav-pill-bg {
          opacity: 1;
          transform: scale(1);
        }
        .nav-link-pill .nav-pill-bg {
          opacity: 0;
          transform: scale(0.92);
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
      `}</style>

      <header
        id={headerID}
        className="fixed top-0 z-50 hidden w-full sm:flex items-center justify-center"
        style={{ paddingTop: '12px', paddingBottom: '0' }}>

        {/* The floating bar */}
        <div
          className="flex h-12 items-center gap-2 px-2 mx-4 w-full max-w-5xl"
          style={{
            background: 'linear-gradient(135deg, rgba(10,8,18,0.92) 0%, rgba(16,10,28,0.92) 100%)',
            backdropFilter: 'saturate(200%) blur(24px)',
            WebkitBackdropFilter: 'saturate(200%) blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.03) inset,
              0 2px 4px rgba(0,0,0,0.3),
              0 12px 40px rgba(0,0,0,0.5),
              0 0 80px rgba(249,115,22,0.04)
            `,
            animation: 'nav-fade-in 0.4s ease both',
          }}>

          {/* ── Brand ── */}
          <Link
            href="/"
            className="flex items-center gap-2 flex-shrink-0 px-1 mr-1 group"
            aria-label="Home">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-black transition-all duration-300 group-hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                boxShadow: '0 2px 10px rgba(249,115,22,0.5)',
                animation: 'glow-pulse 3s ease-in-out infinite',
              }}>
              A
            </span>
          </Link>

          {/* ── Divider ── */}
          <div className="h-5 w-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* ── Nav links ── */}
          <div className="flex items-center gap-0.5 flex-1">
            {topLevelItems.map(item => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(item.href.replace('/#', '/'));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="nav-link-pill relative flex items-center rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  style={{
                    color: isActive ? '#ffffff' : 'rgba(160,160,180,1)',
                  }}>
                  {/* Hover background */}
                  <span
                    className="nav-pill-bg absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />

                  {/* Active glow background */}
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.08) 100%)',
                        border: '1px solid rgba(249,115,22,0.2)',
                      }}
                    />
                  )}

                  <span className="relative z-10">{item.label}</span>

                  {/* Active dot */}
                  {isActive && (
                    <span
                      className="relative z-10 ml-1.5 h-1 w-1 rounded-full flex-shrink-0"
                      style={{ background: '#f97316', boxShadow: '0 0 4px #f97316' }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Right side ── */}
          <div className="flex items-center gap-1.5 flex-shrink-0">

            {/* Ananthan dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                onClick={() => setDropdownOpen(p => !p)}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                style={{
                  color: isAnanthanActive || dropdownOpen ? '#fb923c' : 'rgba(200,200,215,1)',
                  background: isAnanthanActive || dropdownOpen
                    ? 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.08))'
                    : 'transparent',
                  border: isAnanthanActive || dropdownOpen
                    ? '1px solid rgba(249,115,22,0.25)'
                    : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  if (!isAnanthanActive && !dropdownOpen) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'white';
                  }
                }}
                onMouseLeave={e => {
                  if (!isAnanthanActive && !dropdownOpen) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,200,215,1)';
                  }
                }}>
                {/* Grid dots icon */}
                <span className="grid grid-cols-2 gap-[3px] flex-shrink-0">
                  {[0, 1, 2, 3].map(i => (
                    <span
                      key={i}
                      className="h-[4px] w-[4px] rounded-[1px]"
                      style={{
                        background: isAnanthanActive || dropdownOpen ? '#f97316' : 'currentColor',
                        opacity: 0.7,
                      }}
                    />
                  ))}
                </span>
                Ananthan
                <svg
                  className="h-3 w-3 flex-shrink-0 transition-transform duration-200"
                  style={{
                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    opacity: 0.6,
                  }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 overflow-hidden"
                  style={{
                    top: 'calc(100% + 10px)',
                    width: '320px',
                    background: 'linear-gradient(160deg, rgba(12,10,22,0.98) 0%, rgba(16,10,30,0.98) 100%)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '20px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.2), 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
                    animation: 'dropdown-in 0.18s cubic-bezier(0.16,1,0.3,1) both',
                  }}>

                  {/* Header */}
                  <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(120,100,160,1)' }}>
                      Ananthan's Apps
                    </p>
                  </div>

                  {/* App grid */}
                  <div className="grid grid-cols-3 gap-1.5 p-3">
                    {ananthanItems.map(item => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setDropdownOpen(false)}
                          className="group flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-all duration-150"
                          style={{
                            background: isActive
                              ? 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(234,88,12,0.1))'
                              : 'rgba(255,255,255,0.03)',
                            border: isActive
                              ? '1px solid rgba(249,115,22,0.25)'
                              : '1px solid rgba(255,255,255,0.04)',
                          }}
                          onMouseEnter={e => {
                            if (!isActive) {
                              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)';
                              (e.currentTarget as HTMLAnchorElement).style.border = '1px solid rgba(255,255,255,0.08)';
                              (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.03)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isActive) {
                              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)';
                              (e.currentTarget as HTMLAnchorElement).style.border = '1px solid rgba(255,255,255,0.04)';
                              (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
                            }
                          }}>
                          {/* Emoji icon */}
                          <span className="text-2xl leading-none transition-transform duration-200 group-hover:scale-110">
                            {item.emoji}
                          </span>
                          <div>
                            <p
                              className="text-[12px] font-semibold leading-tight"
                              style={{ color: isActive ? '#fb923c' : 'rgba(220,215,235,1)' }}>
                              {item.label}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(100,95,120,1)' }}>
                              {item.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Thin separator */}
            <div className="h-5 w-px mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

            {/* User profile */}
            <UserProfileMenu />
          </div>
        </div>
      </header>
    </>
  );
});

// ─── Mobile ────────────────────────────────────────────────────────────────────

const MobileNav: FC = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [appsExpanded, setAppsExpanded] = useState(false);
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <style>{`
        @keyframes drawer-in {
          from { transform: translateX(-100%); opacity: 0.5; }
          to   { transform: translateX(0);     opacity: 1;   }
        }
      `}</style>

      {/* Floating burger */}
      <button
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setIsOpen(p => !p)}
        className="fixed right-3 top-3 z-50 sm:hidden flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 focus:outline-none"
        style={{
          background: isOpen
            ? 'rgba(255,255,255,0.1)'
            : 'linear-gradient(135deg,#f97316,#ea580c)',
          boxShadow: isOpen ? 'none' : '0 4px 16px rgba(249,115,22,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
        <span className="relative h-4 w-4 flex flex-col justify-between">
          <span
            className="block h-0.5 w-full rounded-full bg-white transition-all duration-300"
            style={{
              transform: isOpen ? 'translateY(7px) rotate(45deg)' : 'none',
            }}
          />
          <span
            className="block h-0.5 w-full rounded-full bg-white transition-all duration-300"
            style={{ opacity: isOpen ? 0 : 1 }}
          />
          <span
            className="block h-0.5 w-full rounded-full bg-white transition-all duration-300"
            style={{
              transform: isOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
            }}
          />
        </span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          onClick={close}
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed left-0 top-0 z-40 h-full w-[300px] sm:hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(8,6,16,0.99) 0%, rgba(12,8,24,0.99) 100%)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '16px 0 60px rgba(0,0,0,0.7)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}>

        {/* Top bar */}
        <div
          className="flex h-16 items-center justify-between px-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white text-sm font-black"
              style={{
                background: 'linear-gradient(135deg,#f97316,#dc2626)',
                boxShadow: '0 2px 12px rgba(249,115,22,0.45)',
              }}>
              A
            </span>
            <span className="text-sm font-semibold" style={{ color: 'rgba(220,215,235,0.9)' }}>
              ananthan<span style={{ color: '#f97316' }}>.org</span>
            </span>
          </div>
          <UserProfileMenu />
        </div>

        <nav className="overflow-y-auto px-4 py-5 space-y-1">
          {/* Main links section */}
          <p
            className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: 'rgba(100,90,130,1)' }}>
            Navigation
          </p>

          {topLevelItems.map(item => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href.replace('/#', '/'));
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={close}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(234,88,12,0.08))'
                    : 'rgba(255,255,255,0.03)',
                  border: isActive
                    ? '1px solid rgba(249,115,22,0.25)'
                    : '1px solid rgba(255,255,255,0.04)',
                  color: isActive ? '#fb923c' : 'rgba(195,190,215,1)',
                }}>
                <span>{item.label}</span>
                {isActive && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ background: '#f97316', boxShadow: '0 0 6px #f97316' }}
                  />
                )}
              </Link>
            );
          })}

          {/* Separator */}
          <div className="my-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />

          {/* Ananthan group */}
          <button
            onClick={() => setAppsExpanded(p => !p)}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200"
            style={{
              background: appsExpanded ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.03)',
              border: appsExpanded ? '1px solid rgba(249,115,22,0.2)' : '1px solid rgba(255,255,255,0.04)',
              color: appsExpanded ? '#f97316' : 'rgba(200,195,220,1)',
            }}>
            <span className="grid grid-cols-2 gap-[3px] flex-shrink-0">
              {[0, 1, 2, 3].map(i => (
                <span
                  key={i}
                  className="h-[4px] w-[4px] rounded-[1px]"
                  style={{ background: 'currentColor', opacity: 0.7 }}
                />
              ))}
            </span>
            <span>Ananthan</span>
            <span
              className="ml-auto text-xs transition-transform duration-200"
              style={{
                opacity: 0.5,
                transform: appsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}>
              ›
            </span>
          </button>

          {appsExpanded && (
            <div className="grid grid-cols-2 gap-2 pt-1 pl-1">
              {ananthanItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={close}
                    className="flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition-all duration-150"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1))'
                        : 'rgba(255,255,255,0.04)',
                      border: isActive
                        ? '1px solid rgba(249,115,22,0.3)'
                        : '1px solid rgba(255,255,255,0.05)',
                    }}>
                    <span className="text-xl leading-none">{item.emoji}</span>
                    <p
                      className="text-[11px] font-semibold leading-tight"
                      style={{ color: isActive ? '#fb923c' : 'rgba(200,195,220,1)' }}>
                      {item.label}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </div>
    </>
  );
});

Header.displayName = 'Header';
DesktopNav.displayName = 'DesktopNav';
MobileNav.displayName = 'MobileNav';

export default Header;
