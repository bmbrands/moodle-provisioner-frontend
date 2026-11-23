import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { fetchPrivacyPage } from "../services/api";
import type { PrivacyPageData } from "../services/api";

/** Public page at /?privacy; readable without signing in. */
export function PrivacyPage() {
  const [page, setPage] = useState<PrivacyPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrivacyPage()
      .then(setPage)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <a href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to the Moodle Provisioner
        </a>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Data protection declaration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-destructive">{error}</p>
            ) : page === null ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : page.html ? (
              <>
                {/* The backend only stores a whitelist of simple tags. */}
                <div className="privacy-content" dangerouslySetInnerHTML={{ __html: page.html }} />
                {page.updated_at && (
                  <p className="mt-6 text-xs text-muted-foreground">
                    Last updated {new Date(page.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No data protection declaration has been published yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Address of the declaration; a query string needs no server configuration. */
export const PRIVACY_URL = "/?privacy";

/** Small link to the declaration, used below the login form and the app. */
export function PrivacyLink() {
  return (
    <a href={PRIVACY_URL} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
      Data protection declaration
    </a>
  );
}
