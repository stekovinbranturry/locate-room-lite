import { Link } from '@tanstack/react-router';
import { cn } from '#/lib/utils';
import ThemeToggle from './ThemeToggle';

const headerNavLink =
  'relative px-2.5 py-1.5 text-sm font-semibold text-sea-ink no-underline after:pointer-events-none after:absolute after:bottom-0.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-gradient-to-r after:from-lagoon after:to-[#7ed3bf] after:transition-transform after:duration-150 after:ease-out hover:text-sea-ink';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-header-bg pt-[env(safe-area-inset-top,0px)] backdrop-blur-lg">
      <nav className="mx-auto flex h-14 w-[min(1080px,calc(100%-2rem))] items-center justify-between gap-3 px-4 sm:h-16">
        <Link
          to="/"
          className="inline-flex min-w-0 max-w-[min(100%,14rem)] items-center gap-2 rounded-full border border-chip-line bg-chip-bg px-3 py-1.5 text-sm font-semibold text-sea-ink no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:max-w-none sm:px-4 sm:py-2"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
          <span className="truncate sm:hidden">LocateRoom</span>
          <span className="hidden truncate sm:inline">LocateRoom Lite</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className={headerNavLink}
            activeProps={{
              className: cn(headerNavLink, 'after:scale-x-100'),
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
