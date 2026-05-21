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
import { createRoomId, persistDisplayName, readStoredDisplayName } from '#/lib/config';

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
    setDisplayName(readStoredDisplayName());
  }, []);

  const persistNameAndNavigate = (roomId: string) => {
    const name = persistDisplayName(displayName);
    setDisplayName(name);
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
    <main className="mx-auto w-[min(1080px,calc(100%-2rem))] px-4 pb-8 pt-6 sm:pt-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-line bg-[linear-gradient(165deg,var(--surface-strong),var(--surface))] px-6 py-10 shadow-[0_1px_0_var(--inset-glint)_inset,0_22px_44px_rgba(30,90,72,0.1),0_6px_18px_rgba(23,58,64,0.08)] backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <p className="mb-3 text-[0.69rem] font-bold tracking-[0.16em] text-kicker uppercase">LocateRoom Lite</p>
        <h1 className="font-display mb-5 max-w-3xl text-[1.75rem] leading-snug font-bold tracking-tight text-balance text-sea-ink sm:text-5xl sm:leading-[1.02]">
          实时位置共享小房间
        </h1>
        <p className="mb-8 max-w-2xl text-base text-sea-ink-soft sm:text-lg">
          最多 4 人，通过 WebRTC DataChannel P2P 共享位置，信令仅用于建连，不转发坐标。
        </p>

        <div className="grid max-w-md gap-2">
          <Label htmlFor="display-name">昵称</Label>
          <Input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例如：小明"
            className="rounded-xl border border-chip-line bg-white/70 text-sea-ink"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={startRoom}>
            创建房间
          </Button>

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
              <Button type="button" variant="outline">
                加入房间
              </Button>
            </DialogTrigger>
            <DialogContent className="gap-5 rounded-2xl border border-chip-line bg-surface-strong sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sea-ink">加入房间</DialogTitle>
                <DialogDescription className="text-sea-ink-soft">
                  填写昵称与房间信息；未填昵称将自动生成。
                </DialogDescription>
              </DialogHeader>

              <form className="grid gap-4" onSubmit={submitJoin}>
                <div className="grid gap-2">
                  <Label htmlFor="join-display-name">昵称</Label>
                  <Input
                    id="join-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="例如：小明（可选）"
                    autoComplete="nickname"
                    className="rounded-xl border border-chip-line bg-white/70 text-sea-ink"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="room-id">房间 ID / 链接</Label>
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
                    className="rounded-xl border border-chip-line bg-white/70 text-sea-ink"
                  />
                  {joinError ? <p className="text-sm text-destructive">{joinError}</p> : null}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <Button type="button" variant="outline" onClick={() => setJoinOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit">加入</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </main>
  );
}
