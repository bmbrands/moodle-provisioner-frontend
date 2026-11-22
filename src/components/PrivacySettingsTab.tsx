import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Bold, Heading2, Heading3, Italic, Link, List, ListOrdered, Pilcrow, Underline, Unlink, ExternalLink,
} from "lucide-react";
import { Button } from "./ui/button";
import { fetchPrivacyPage, updatePrivacyPage } from "../services/api";
import type { PrivacyPageData } from "../services/api";

interface PrivacySettingsTabProps {
  onSaved?: (page: PrivacyPageData) => void;
}

// Minimal editor: browser editing commands for a handful of formats. Whatever
// it produces is reduced to simple tags by the backend on save.
function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      title={label}
      aria-label={label}
      // Keep the selection in the editor.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function PrivacySettingsTab({ onSaved }: PrivacySettingsTabProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<PrivacyPageData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPrivacyPage()
      .then(setPage)
      .catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
  }, []);

  // Load the stored HTML into the editor once it is available.
  useEffect(() => {
    if (page && editorRef.current && !isDirty) {
      editorRef.current.innerHTML = page.html;
    }
  }, [page, isDirty]);

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setIsDirty(true);
  };

  const addLink = () => {
    const url = window.prompt("Link address (https://… or mailto:…)", "https://");
    if (url && /^(https?:\/\/|mailto:)/i.test(url.trim())) {
      exec("createLink", url.trim());
    } else if (url) {
      toast.error("Use a link starting with https://, http:// or mailto:");
    }
  };

  const handleSave = async () => {
    if (!editorRef.current) return;
    setIsSaving(true);
    try {
      const saved = await updatePrivacyPage(editorRef.current.innerHTML);
      editorRef.current.innerHTML = saved.html; // show what was actually stored
      setPage(saved);
      setIsDirty(false);
      toast.success("Data protection declaration saved");
      onSaved?.(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (page === null) {
    return <div className="py-8 text-center text-muted-foreground">Loading data protection declaration…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">Data protection declaration</h3>
          <p className="text-sm text-muted-foreground">
            Shown on the public page <code>/privacy</code>, linked below the login form and at the bottom of the
            application. Only headings, paragraphs, bold, italic, underline, lists and links are kept.
          </p>
        </div>
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-shrink-0 items-center gap-1 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          View page
        </a>
      </div>

      <div className="rounded-md border">
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1">
          <ToolbarButton label="Paragraph" onClick={() => exec("formatBlock", "<p>")}><Pilcrow className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Heading" onClick={() => exec("formatBlock", "<h2>")}><Heading2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Subheading" onClick={() => exec("formatBlock", "<h3>")}><Heading3 className="h-4 w-4" /></ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Bold" onClick={() => exec("bold")}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => exec("italic")}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Underline" onClick={() => exec("underline")}><Underline className="h-4 w-4" /></ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Bulleted list" onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}><ListOrdered className="h-4 w-4" /></ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Add link" onClick={addLink}><Link className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton label="Remove link" onClick={() => exec("unlink")}><Unlink className="h-4 w-4" /></ToolbarButton>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Data protection declaration"
          className="privacy-content min-h-[18rem] max-h-[50vh] overflow-y-auto p-4 text-sm outline-none"
          onInput={() => setIsDirty(true)}
          onPaste={(e) => {
            // Paste as plain text so formatting from Word or websites does not leak in.
            e.preventDefault();
            document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
          }}
        />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">
          {page.updated_at
            ? `Last saved ${new Date(page.updated_at).toLocaleString("en-GB")}${page.updated_by ? ` by ${page.updated_by}` : ""}`
            : "Not published yet"}
        </p>
        <Button onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
