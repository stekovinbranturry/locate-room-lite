import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, HeadContent, Link, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { Button } from '#/components/ui/button';
import Header from '../components/Header';
import { Toaster } from '../components/ui/sonner';

import appCss from '../styles.css?url';

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

function NotFound() {
  return (
    <main className="mx-auto w-[min(1080px,calc(100%-2rem))] px-4 py-16 text-center">
      <p className="mb-3 text-[0.69rem] font-bold tracking-[0.16em] text-kicker uppercase">404</p>
      <h1 className="font-display mb-3 text-2xl font-bold text-sea-ink">页面不存在</h1>
      <p className="mb-8 text-sea-ink-soft">请检查链接是否正确，或返回首页创建/加入房间。</p>
      <Button variant="outline" asChild>
        <Link to="/">返回首页</Link>
      </Button>
    </main>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'LocateRoom Lite',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-full font-sans text-sea-ink antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <Header />
        {children}
        <Toaster />
        {/* <Footer /> */}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
