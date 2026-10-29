import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { fetchMoodleVersionPolicy, updateMoodleVersionPolicy } from "../services/api";

interface MoodleVersionSettingsTabProps {
  onSaved?: (minimumVersion: string) => void;
}

const VERSION_PATTERN = /^\d{1,2}\.\d{1,2}(\.\d{1,3})?$/;

export function MoodleVersionSettingsTab({ onSaved }: MoodleVersionSettingsTabProps) {
  const [saved, setSaved] = useState<string | null>(null);
  const [minimum, setMinimum] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMoodleVersionPolicy()
      .then((p) => {
        setSaved(p.minimum_version);
        setMinimum(p.minimum_version);
      })
      .catch((err) => toast.error(`Failed to load Moodle version settings: ${err.message}`));
  }, []);

  if (saved === null) {
    return <div className="py-8 text-center text-muted-foreground">Loading Moodle version settings…</div>;
  }

  const isValid = minimum === "" || VERSION_PATTERN.test(minimum);
  const isDirty = minimum !== saved;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateMoodleVersionPolicy({ minimum_version: minimum });
      setSaved(result.minimum_version);
      toast.success(
        result.minimum_version
          ? `New environments now require Moodle ${result.minimum_version} or newer`
          : "Minimum Moodle version removed"
      );
      onSaved?.(result.minimum_version);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Moodle version settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <h3 className="font-medium">Minimum Moodle version</h3>
          <p className="text-sm text-muted-foreground">
            New environments (and containers added to existing ones) can only use this Moodle version or newer,
            for every plugin. Existing environments are not affected. Leave empty to allow all versions.
          </p>
        </div>
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-0.5">
            <Label htmlFor="minimum-moodle-version">Minimum version</Label>
            <p className="text-sm text-muted-foreground">
              For example <code>4.5</code> (includes 4.5.0 and newer) or <code>4.5.7</code>. See{" "}
              <a
                href="https://moodledev.io/general/releases#version-support"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Moodle version support
              </a>{" "}
              for which releases are still supported.
            </p>
            {!isValid && <p className="text-sm text-destructive">Use a version like 4.5 or 4.5.7.</p>}
          </div>
          <Input
            id="minimum-moodle-version"
            className="w-28 flex-shrink-0"
            placeholder="none"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value.trim())}
          />
        </div>
      </section>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={handleSave} disabled={!isDirty || !isValid || isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
