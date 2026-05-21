import { Link } from '@tanstack/react-router';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="site-header sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-lg">
      <nav className="page-wrap flex h-14 items-center justify-between gap-3 px-4 sm:h-16">
        <Link
          to="/"
          className="inline-flex min-w-0 max-w-[min(100%,14rem)] items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:max-w-none sm:px-4 sm:py-2"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
          <span className="truncate sm:hidden">LocateRoom</span>
          <span className="hidden truncate sm:inline">LocateRoom Lite</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="header-nav-link rounded-lg px-2.5 py-1.5 text-sm font-semibold no-underline"
            activeProps={{
              className: 'header-nav-link is-active rounded-lg px-2.5 py-1.5 text-sm font-semibold no-underline',
            }}
          >
            首页
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
