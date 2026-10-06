import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Mail, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  fetchEmailSettings,
  previewEmail,
  sendTestEmail,
  updateEmailSettings,
} from "../services/api";
import type { EmailSettingsForm, EmailSettingsResponse, SmtpSecurity } from "../services/api";

interface EmailSettingsTabProps {
  currentUserEmail?: string;
  onSaved?: (settings: EmailSettingsResponse) => void;
}

const DEFAULT_PORTS: Record<SmtpSecurity, number> = { none: 25, starttls: 587, ssl: 465 };

const toForm = (s: EmailSettingsResponse): EmailSettingsForm => ({
  smtp: {
    host: s.smtp.host,
    port: s.smtp.port,
    security: s.smtp.security,
    username: s.smtp.username,
    password: null,
    from_address: s.smtp.from_address,
    from_name: s.smtp.from_name,
  },
  portal_url: s.portal_url,
  timezone: s.timezone,
  deletion_warning: { ...s.deletion_warning },
});

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmailSettingsTab({ currentUserEmail = "", onSaved }: EmailSettingsTabProps) {
  const [loaded, setLoaded] = useState<EmailSettingsResponse | null>(null);
  const [form, setForm] = useState<EmailSettingsForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testTo, setTestTo] = useState(currentUserEmail);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchEmailSettings()
      .then((s) => {
        setLoaded(s);
        setForm(toForm(s));
      })
      .catch((err) => toast.error(`Failed to load email settings: ${err.message}`));
  }, []);

  useEffect(() => setTestTo((prev) => prev || currentUserEmail), [currentUserEmail]);

  // Live preview with sample data; also surfaces template errors while typing.
  const subject = form?.deletion_warning.subject ?? "";
  const body = form?.deletion_warning.body ?? "";
  useEffect(() => {
    if (!form) return;
    const timer = setTimeout(() => {
      previewEmail(subject, body)
        .then((p) => {
          setPreview(p);
          setPreviewError(null);
        })
        .catch((err) => setPreviewError(err.message));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, body, form !== null]);

  if (!form || !loaded) {
    return <div className="py-8 text-center text-muted-foreground">Loading email settings…</div>;
  }

  const setSmtp = <K extends keyof EmailSettingsForm["smtp"]>(key: K, value: EmailSettingsForm["smtp"][K]) =>
    setForm((f) => (f ? { ...f, smtp: { ...f.smtp, [key]: value } } : f));
  const setWarning = <K extends keyof EmailSettingsForm["deletion_warning"]>(
    key: K,
    value: EmailSettingsForm["deletion_warning"][K]
  ) => setForm((f) => (f ? { ...f, deletion_warning: { ...f.deletion_warning, [key]: value } } : f));

  const changeSecurity = (security: SmtpSecurity) => {
    // Follow the conventional port unless the admin chose a custom one.
    const isDefaultPort = Object.values(DEFAULT_PORTS).includes(form.smtp.port);
    setForm({
      ...form,
      smtp: { ...form.smtp, security, port: isDefaultPort ? DEFAULT_PORTS[security] : form.smtp.port },
    });
  };

  const insertVariable = (name: string) => {
    const placeholder = `{{ ${name} }}`;
    const el = bodyRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setWarning("body", body.slice(0, start) + placeholder + body.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + placeholder.length, start + placeholder.length);
    });
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(toForm(loaded));
  const smtpReady = form.smtp.host !== "" && form.smtp.from_address !== "";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await updateEmailSettings(form);
      setLoaded(saved);
      setForm(toForm(saved));
      toast.success("Email settings saved");
      onSaved?.(saved);
    } catch (err) {
      toast.error(`Failed to save email settings: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await sendTestEmail(testTo, form);
      toast.success(result.message);
    } catch (err) {
      toast.error(`Test email failed: ${err instanceof Error ? err.message : err}`, { duration: 10000 });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="font-medium">SMTP server</h3>
          <p className="text-sm text-muted-foreground">Used for all notification emails.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem_9rem]">
          <Field id="smtp-host" label="Host">
            <Input id="smtp-host" placeholder="smtp.example.org" value={form.smtp.host}
              onChange={(e) => setSmtp("host", e.target.value.trim())} />
          </Field>
          <Field id="smtp-port" label="Port">
            <Input id="smtp-port" type="number" min={1} max={65535} value={form.smtp.port}
              onChange={(e) => setSmtp("port", Number(e.target.value))} />
          </Field>
          <Field id="smtp-security" label="Security">
            <Select value={form.smtp.security} onValueChange={(v) => changeSecurity(v as SmtpSecurity)}>
              <SelectTrigger id="smtp-security"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starttls">STARTTLS</SelectItem>
                <SelectItem value="ssl">SSL/TLS</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="smtp-user" label="Username" hint="Leave empty if the server needs no login.">
            <Input id="smtp-user" autoComplete="off" value={form.smtp.username}
              onChange={(e) => setSmtp("username", e.target.value)} />
          </Field>
          <Field
            id="smtp-password"
            label="Password"
            hint={loaded.smtp.password_set && form.smtp.password === null ? "A password is stored. Type to replace it." : undefined}
          >
            <Input id="smtp-password" type="password" autoComplete="new-password"
              placeholder={loaded.smtp.password_set ? "••••••••" : ""}
              value={form.smtp.password ?? ""}
              onChange={(e) => setSmtp("password", e.target.value === "" && loaded.smtp.password_set ? null : e.target.value)} />
          </Field>
          <Field id="smtp-from" label="Sender address">
            <Input id="smtp-from" type="email" placeholder="noreply@example.org" value={form.smtp.from_address}
              onChange={(e) => setSmtp("from_address", e.target.value.trim())} />
          </Field>
          <Field id="smtp-from-name" label="Sender name">
            <Input id="smtp-from-name" value={form.smtp.from_name}
              onChange={(e) => setSmtp("from_name", e.target.value)} />
          </Field>
          <Field id="portal-url" label="Provisioner URL" hint={`Link used in emails. Empty uses ${loaded.default_portal_url || "the server's URL"}.`}>
            <Input id="portal-url" placeholder={loaded.default_portal_url} value={form.portal_url}
              onChange={(e) => setForm({ ...form, portal_url: e.target.value.trim() })} />
          </Field>
          <Field id="email-tz" label="Time zone for dates" hint="IANA name, e.g. Europe/Berlin.">
            <Input id="email-tz" value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value.trim() })} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="font-medium">Deletion warning</h3>
            <p className="text-sm text-muted-foreground">
              Emails the owner of a stopped instance before it is deleted automatically (Lifecycle tab).
            </p>
          </div>
          <Switch aria-label="Send deletion warnings" checked={form.deletion_warning.enabled}
            onCheckedChange={(v) => setWarning("enabled", v)} />
        </div>
        <Field id="warn-hours" label="Send warning (hours before deletion)"
          hint="If the deletion is closer than this when an instance is stopped, the warning is sent right away.">
          <Input id="warn-hours" type="number" min={0} className="w-28" value={form.deletion_warning.hours_before}
            onChange={(e) => setWarning("hours_before", Number(e.target.value))} />
        </Field>
        <Field id="warn-subject" label="Subject">
          <Input id="warn-subject" value={subject} onChange={(e) => setWarning("subject", e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_15rem]">
          <Field id="warn-body" label="Message">
            <Textarea id="warn-body" ref={bodyRef} rows={14} className="font-mono text-xs" value={body}
              onChange={(e) => setWarning("body", e.target.value)} />
          </Field>
          <div className="space-y-1.5">
            <Label>Variables</Label>
            <p className="text-xs text-muted-foreground">Click to insert at the cursor.</p>
            <ul className="space-y-1">
              {loaded.variables.map((v) => (
                <li key={v.name}>
                  <button type="button" title={`${v.description} (e.g. ${v.example})`}
                    onClick={() => insertVariable(v.name)}
                    className="text-left text-xs font-mono text-primary hover:underline">
                    {`{{ ${v.name} }}`}
                  </button>
                  <span className="block text-xs text-muted-foreground">{v.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setForm({
            ...form,
            deletion_warning: { ...form.deletion_warning, subject: loaded.defaults.subject, body: loaded.defaults.body },
          })}>
            <RotateCcw className="h-4 w-4" />
            Reset text to default
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>Preview (sample data)</Label>
          {previewError ? (
            <p className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">{previewError}</p>
          ) : preview ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{preview.subject}</p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-muted-foreground">{preview.body}</pre>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
        <div className="flex items-end gap-2">
          <Field id="test-to" label="Send a test email to">
            <Input id="test-to" type="email" className="w-64" value={testTo} onChange={(e) => setTestTo(e.target.value.trim())} />
          </Field>
          <Button variant="outline" onClick={handleTest} disabled={!smtpReady || !testTo || isTesting || previewError !== null}>
            {isTesting ? <Mail className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            {isTesting ? "Sending…" : "Send test"}
          </Button>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || isSaving || previewError !== null}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
