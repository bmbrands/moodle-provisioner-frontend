import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Download,
  RefreshCw,
  Search,
  Trash2,
  Pause,
  Play,
  ArrowDownToLine,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchServerLogs,
  clearServerLogs,
  type ServerLogLine,
} from "../services/api";

const LEVEL_COLOR: Record<string, string> = {
  CRITICAL: "text-red-400",
  ERROR: "text-red-400",
  WARNING: "text-yellow-400",
  SUCCESS: "text-green-400",
  INFO: "text-sky-300",
  DEBUG: "text-muted-foreground",
};

const POLL_INTERVAL_MS = 3000;

interface ServerLogsPanelProps {
  /** Whether the parent modal is open; polling only runs while open. */
  active: boolean;
}

export function ServerLogsPanel({ active }: ServerLogsPanelProps) {
  const [lines, setLines] = useState<ServerLogLine[]>([]);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);
  const lastIdRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      if (reset) {
        lastIdRef.current = 0;
      }
      const fetched = await fetchServerLogs(2000, reset ? undefined : lastIdRef.current || undefined);
      if (fetched.length > 0) {
        lastIdRef.current = fetched[fetched.length - 1].id;
      }
      setLines((prev) => {
        const base = reset ? [] : prev;
        const merged = [...base, ...fetched];
        // Cap client-side history so the DOM stays manageable.
        return merged.slice(-2000);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load server logs");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load when the panel becomes active.
  useEffect(() => {
    if (active) {
      refresh(true);
    }
  }, [active, refresh]);

  // Polling.
  useEffect(() => {
    if (!active || !autoRefresh) return;
    const handle = setInterval(() => refresh(false), POLL_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [active, autoRefresh, refresh]);

  // Auto-scroll to bottom on new lines.
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const filtered = useMemo(() => {
    if (!search.trim()) return lines;
    const q = search.toLowerCase();
    return lines.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        l.level.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q)
    );
  }, [lines, search]);

  const handleClear = async () => {
    try {
      await clearServerLogs();
      setLines([]);
      lastIdRef.current = 0;
      toast.success("Server log buffer cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear logs");
    }
  };

  const handleExport = () => {
    const text = filtered
      .map((l) => `${l.timestamp} [${l.level}] ${l.source} - ${l.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `server-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString("en-US", { hour12: false });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter server logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            className="flex items-center gap-2"
          >
            {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {autoRefresh ? "Pause" : "Resume"}
          </Button>
          <Button
            variant={autoScroll ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoScroll((v) => !v)}
            className="flex items-center gap-2"
            title="Auto-scroll to newest"
          >
            <ArrowDownToLine className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh(false)}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="flex items-center gap-2 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">
          {filtered.length} line{filtered.length === 1 ? "" : "s"}
        </Badge>
        <span>
          {autoRefresh
            ? `Auto-refreshing every ${POLL_INTERVAL_MS / 1000}s`
            : "Auto-refresh paused"}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="h-[60vh] overflow-auto rounded-md border bg-zinc-950 p-3 font-mono text-xs leading-relaxed"
      >
        {filtered.length === 0 ? (
          <div className="text-muted-foreground p-4 text-center">
            No log output captured yet.
          </div>
        ) : (
          filtered.map((line) => (
            <div key={line.id} className="whitespace-pre-wrap break-words flex gap-2">
              <span className="text-zinc-500 shrink-0">{formatTime(line.timestamp)}</span>
              <span className={`shrink-0 w-16 ${LEVEL_COLOR[line.level] ?? "text-zinc-300"}`}>
                {line.level}
              </span>
              <span className="text-zinc-200">{line.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
