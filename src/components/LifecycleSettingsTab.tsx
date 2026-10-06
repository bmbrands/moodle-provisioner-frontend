import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import type { LifecyclePolicy } from "../services/api";

interface LifecycleSettingsTabProps {
  policy: LifecyclePolicy | null;
  onSave: (policy: LifecyclePolicy) => Promise<void>;
}

const defaultPolicy: LifecyclePolicy = {
  auto_stop_enabled: false,
  max_runtime_minutes: 480,
  daily_stop_time: "",
  auto_cleanup_enabled: false,
  stopped_retention_days: 7,
  cleanup_empty_infrastructures: true,
};

// "HH:MM" UTC -> "HH:MM" in the viewer's time zone (today's offset).
const utcToLocal = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

function SettingRow({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function LifecycleSettingsTab({ policy, onSave }: LifecycleSettingsTabProps) {
  const [draft, setDraft] = useState<LifecyclePolicy>(policy ?? defaultPolicy);
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync when the stored policy changes (initial load or after saving).
  useEffect(() => {
    if (policy) setDraft(policy);
  }, [policy]);

  const update = <K extends keyof LifecyclePolicy>(key: K, value: LifecyclePolicy[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const dailyStopEnabled = draft.daily_stop_time !== "";
  const isValid =
    draft.max_runtime_minutes >= 1 &&
    draft.stopped_retention_days >= 1 &&
    (!dailyStopEnabled || /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.daily_stop_time));
  const isDirty = JSON.stringify(draft) !== JSON.stringify(policy ?? defaultPolicy);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(draft);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-medium">Automatic stop</h3>
        <div className="divide-y">
          <SettingRow
            id="auto-stop"
            label="Stop long-running instances"
            description="Stopping keeps the instance's data; users can start it again."
          >
            <Switch
              id="auto-stop"
              checked={draft.auto_stop_enabled}
              onCheckedChange={(v) => update("auto_stop_enabled", v)}
            />
          </SettingRow>
          <SettingRow
            id="max-runtime"
            label="Maximum running time (minutes)"
            description="An instance is stopped this long after it was last started."
          >
            <Input
              id="max-runtime"
              type="number"
              min={1}
              className="w-28"
              disabled={!draft.auto_stop_enabled}
              value={draft.max_runtime_minutes}
              onChange={(e) => update("max_runtime_minutes", Number(e.target.value))}
            />
          </SettingRow>
          <SettingRow
            id="daily-stop"
            label="Daily stop time (UTC)"
            description={
              dailyStopEnabled && utcToLocal(draft.daily_stop_time)
                ? `Also stop everything once a day. ${draft.daily_stop_time} UTC is ${utcToLocal(draft.daily_stop_time)} your time.`
                : "Also stop everything once a day at a fixed time."
            }
          >
            <div className="flex items-center gap-2">
              <Switch
                id="daily-stop"
                checked={dailyStopEnabled}
                disabled={!draft.auto_stop_enabled}
                onCheckedChange={(v) => update("daily_stop_time", v ? "18:00" : "")}
              />
              <Input
                type="time"
                className="w-28"
                aria-label="Daily stop time (UTC)"
                disabled={!draft.auto_stop_enabled || !dailyStopEnabled}
                value={draft.daily_stop_time}
                onChange={(e) => update("daily_stop_time", e.target.value)}
              />
            </div>
          </SettingRow>
        </div>
      </section>

      <section>
        <h3 className="font-medium">Automatic cleanup</h3>
        <div className="divide-y">
          <SettingRow
            id="auto-cleanup"
            label="Delete idle instances"
            description="Deletes stopped (or never started) instances, including their data."
          >
            <Switch
              id="auto-cleanup"
              checked={draft.auto_cleanup_enabled}
              onCheckedChange={(v) => update("auto_cleanup_enabled", v)}
            />
          </SettingRow>
          <SettingRow
            id="retention"
            label="Delete after (days stopped)"
            description="Starting an instance again resets this timer."
          >
            <Input
              id="retention"
              type="number"
              min={1}
              className="w-28"
              disabled={!draft.auto_cleanup_enabled}
              value={draft.stopped_retention_days}
              onChange={(e) => update("stopped_retention_days", Number(e.target.value))}
            />
          </SettingRow>
          <SettingRow
            id="cleanup-empty"
            label="Remove empty environments"
            description="Tear down an environment once all of its instances are deleted."
          >
            <Switch
              id="cleanup-empty"
              checked={draft.cleanup_empty_infrastructures}
              disabled={!draft.auto_cleanup_enabled}
              onCheckedChange={(v) => update("cleanup_empty_infrastructures", v)}
            />
          </SettingRow>
        </div>
      </section>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">
          The check runs about every 15 minutes, so actions can happen a little after the time shown.
        </p>
        <Button onClick={handleSave} disabled={!isDirty || !isValid || isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
