import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PERF_TARGETS, perfMonitor } from '#/features/perf/perfMonitor';
import { useRoomSettingsStore, type WeakNetMode } from '#/features/room/roomSettingsStore';

function MetricRow({
  label,
  value,
  target,
  unit,
  pass,
}: {
  label: string;
  value: string;
  target?: string;
  unit?: string;
  pass?: boolean | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-[var(--sea-ink-soft)]">{label}</span>
      <span
        className={
          pass === true
            ? 'font-mono font-semibold text-[var(--lagoon-deep)]'
            : pass === false
              ? 'font-mono font-semibold text-amber-700'
              : 'font-mono font-semibold text-[var(--sea-ink)]'
        }
      >
        {value}
        {unit ? <span className="ml-0.5 font-normal text-[var(--sea-ink-soft)]">{unit}</span> : null}
        {target ? <span className="ml-1 font-normal text-[var(--sea-ink-soft)]">/ {target}</span> : null}
      </span>
    </div>
  );
}

export default function PerfDevPanel() {
  const open = useRoomSettingsStore((s) => s.perfPanelOpen);
  const setOpen = useRoomSettingsStore((s) => s.setPerfPanelOpen);
  const showTrails = useRoomSettingsStore((s) => s.showTrails);
  const setShowTrails = useRoomSettingsStore((s) => s.setShowTrails);
  const weakNetMode = useRoomSettingsStore((s) => s.weakNetMode);
  const setWeakNetMode = useRoomSettingsStore((s) => s.setWeakNetMode);

  const [collapsed, setCollapsed] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-4 right-4 z-30 rounded-full border border-[var(--chip-line)] bg-[var(--surface-strong)]/95 px-3 py-2 text-xs font-semibold text-[var(--sea-ink)] shadow-lg backdrop-blur-sm"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        性能面板
      </button>
    );
  }

  const locHz = perfMonitor.getLocationHz();
  const mapFps = perfMonitor.getMapFps();
  const firstMs = perfMonitor.firstRemoteMs;
  const rtt = perfMonitor.getRttAvg();

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(perfMonitor.exportJson(), null, 2));
      toast.success('性能数据已复制');
    } catch {
      toast.error('复制失败');
    }
  };

  const cycleWeak = () => {
    const order: WeakNetMode[] = ['auto', 'on', 'off'];
    const i = order.indexOf(weakNetMode);
    const next = order[(i + 1) % order.length] ?? 'auto';
    setWeakNetMode(next);
  };

  return (
    <aside
      className="pointer-events-auto fixed bottom-4 right-4 z-30 w-[min(100%,20rem)] rounded-2xl border border-[var(--chip-line)] bg-[var(--surface-strong)]/95 p-3 shadow-xl backdrop-blur-md"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="island-kicker m-0">性能监控</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg px-2 py-1 text-xs text-[var(--sea-ink-soft)] hover:bg-[var(--chip-bg)]"
          >
            {collapsed ? '展开' : '收起'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-2 py-1 text-xs text-[var(--sea-ink-soft)] hover:bg-[var(--chip-bg)]"
          >
            关闭
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="space-y-1.5 border-b border-[var(--line)] pb-2">
            <MetricRow
              label="位置发送"
              value={String(locHz)}
              target={`≥${PERF_TARGETS.locationHz}`}
              unit="Hz"
              pass={locHz >= PERF_TARGETS.locationHz - 1}
            />
            <MetricRow
              label="地图渲染"
              value={String(mapFps)}
              target={`≥${PERF_TARGETS.mapFps}`}
              unit="fps"
              pass={mapFps >= PERF_TARGETS.mapFps}
            />
            <MetricRow
              label="首屏他人"
              value={firstMs != null ? String(firstMs) : '—'}
              target={`≤${PERF_TARGETS.firstRemoteMs}`}
              unit="ms"
              pass={firstMs != null ? firstMs <= PERF_TARGETS.firstRemoteMs : null}
            />
            <MetricRow label="RTT 均值" value={rtt != null ? String(rtt) : '—'} unit="ms" />
            <MetricRow label="P2P 链路" value={String(perfMonitor.peerLinkCount)} />
            <MetricRow
              label="DC 收发"
              value={`${(perfMonitor.dcBytesSent / 1024).toFixed(1)} / ${(perfMonitor.dcBytesRecv / 1024).toFixed(1)}`}
              unit="KB"
            />
            <MetricRow
              label="弱网降级"
              value={perfMonitor.weakNetActive ? '生效' : '关闭'}
              pass={perfMonitor.weakNetActive ? null : true}
            />
            {perfMonitor.effectiveType && <MetricRow label="网络类型" value={perfMonitor.effectiveType} />}
            <MetricRow label="跳过发送" value={String(perfMonitor.locationSkippedTotal)} unit="次" />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowTrails(!showTrails)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${showTrails ? 'bg-[var(--lagoon)] text-white' : 'border border-[var(--chip-line)] text-[var(--sea-ink)]'}`}
            >
              轨迹 {showTrails ? '开' : '关'}
            </button>
            <button
              type="button"
              onClick={cycleWeak}
              className="rounded-full border border-[var(--chip-line)] px-3 py-1.5 text-xs font-semibold text-[var(--sea-ink)]"
            >
              弱网: {weakNetMode}
            </button>
            <button
              type="button"
              onClick={() => void copyReport()}
              className="rounded-full border border-[var(--chip-line)] px-3 py-1.5 text-xs font-semibold text-[var(--sea-ink)]"
            >
              导出 JSON
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
