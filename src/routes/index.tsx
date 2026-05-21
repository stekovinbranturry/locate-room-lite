import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { createRoomId } from '#/lib/config';

export const Route = createFileRoute('/')({ component: HomePage });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseRoomId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (UUID_RE.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/room\/([^/?#]+)/);
    if (match?.[1] && UUID_RE.test(match[1])) return match[1];
  } catch {
    // not a URL
  }

  return null;
}

function HomePage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [joinOpen, setJoinOpen] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    setDisplayName(sessionStorage.getItem('locate-display-name') ?? '');
  }, []);

  const persistNameAndNavigate = (roomId: string) => {
    const name = displayName.trim() || `用户-${Math.floor(Math.random() * 900 + 100)}`;
    sessionStorage.setItem('locate-display-name', name);
    setJoinOpen(false);
    setRoomIdInput('');
    setJoinError('');
    navigate({ to: '/room/$roomId', params: { roomId } });
  };

  const startRoom = () => {
    persistNameAndNavigate(createRoomId());
  };

  const submitJoin = (event: React.FormEvent) => {
    event.preventDefault();
    const roomId = parseRoomId(roomIdInput);
    if (!roomId) {
      setJoinError('请输入有效的房间 ID 或分享链接');
      return;
    }
    persistNameAndNavigate(roomId);
  };

  return (
    <main className="page-wrap px-4 pb-8 pt-6 sm:pt-10">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <p className="island-kicker mb-3">LocateRoom Lite</p>
        <h1 className="display-title mb-5 max-w-3xl text-[1.75rem] leading-snug font-bold tracking-tight text-balance text-[var(--sea-ink)] sm:text-5xl sm:leading-[1.02]">
          实时位置共享小房间
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          最多 4 人，通过 WebRTC DataChannel P2P 共享位置，信令仅用于建连，不转发坐标。
        </p>

        <label className="mb-6 block max-w-md">
          <span className="mb-2 block text-sm font-semibold text-[var(--sea-ink)]">昵称</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例如：小明"
            className="w-full rounded-xl border border-[var(--chip-line)] bg-white/70 px-4 py-2.5 text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)]"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startRoom}
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            创建房间
          </button>

          <Dialog
            open={joinOpen}
            onOpenChange={(open) => {
              setJoinOpen(open);
              if (!open) {
                setRoomIdInput('');
                setJoinError('');
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-auto rounded-full border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] shadow-none hover:-translate-y-0.5 hover:bg-white/80"
              >
                加入房间
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-5 rounded-2xl border-[var(--chip-line)] bg-[var(--surface-strong)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[var(--sea-ink)]">加入房间</DialogTitle>
                <DialogDescription className="text-[var(--sea-ink-soft)]">
                  粘贴分享链接，或直接输入房间 ID（UUID）。
                </DialogDescription>
              </DialogHeader>

              <form className="grid gap-4" onSubmit={submitJoin}>
                <div className="grid gap-2">
                  <Label htmlFor="room-id" className="text-[var(--sea-ink)]">
                    房间 ID / 链接
                  </Label>
                  <Input
                    id="room-id"
                    value={roomIdInput}
                    onChange={(e) => {
                      setRoomIdInput(e.target.value);
                      if (joinError) setJoinError('');
                    }}
                    placeholder="例如：https://…/room/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    autoComplete="off"
                    autoFocus
                    aria-invalid={joinError ? true : undefined}
                    className="rounded-xl border-[var(--chip-line)] bg-white/70 text-[var(--sea-ink)]"
                  />
                  {joinError ? <p className="text-sm text-destructive">{joinError}</p> : null}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-[var(--chip-line)]"
                    onClick={() => setJoinOpen(false)}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-full bg-[var(--lagoon)] text-white hover:bg-[var(--lagoon-deep)]"
                  >
                    加入
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </main>
  );
}
