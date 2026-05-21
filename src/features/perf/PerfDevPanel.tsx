import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
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
      <span className="text-sea-ink-soft">{label}</span>
      <span
        className={
          pass === true
            ? 'font-mono font-semibold text-lagoon-deep'
            : pass === false
              ? 'font-mono font-semibold text-amber-700'
              : 'font-mono font-semibold text-sea-ink'
        }
      >
        {value}
        {unit ? <span className="ml-0.5 font-normal text-sea-ink-soft">{unit}</span> : null}
        {target ? <span className="ml-1 font-normal text-sea-ink-soft">/ {target}</span> : null}
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
      <Button
        type="button"
        variant="surface"
        size="pill"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-4 right-4 z-30 bg-surface-strong/95 backdrop-blur-sm"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        性能面板
      </Button>
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
      className="pointer-events-auto fixed bottom-4 right-4 z-30 w-[min(100%,20rem)] rounded-2xl border border-chip-line bg-surface-strong/95 p-3 shadow-xl backdrop-blur-md"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="island-kicker m-0">性能监控</p>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="pill" onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? '展开' : '收起'}
          </Button>
          <Button type="button" variant="ghost" size="pill" onClick={() => setOpen(false)}>
            关闭
          </Button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="space-y-1.5 border-b border-line pb-2">
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
            <Button
              type="button"
              variant={showTrails ? 'pillActive' : 'pill'}
              onClick={() => setShowTrails(!showTrails)}
            >
              轨迹 {showTrails ? '开' : '关'}
            </Button>
            <Button type="button" variant="pill" onClick={cycleWeak}>
              弱网: {weakNetMode}
            </Button>
            <Button type="button" variant="pill" onClick={() => void copyReport()}>
              导出 JSON
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
