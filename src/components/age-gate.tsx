import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

const KEY = "tastia.age18";

export function AgeGate() {
  const { t } = useI18n();
  const [state, setState] = useState<"hidden" | "ask" | "blocked">("hidden");

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "yes") setState("hidden");
      else if (v === "no") setState("blocked");
      else setState("ask");
    } catch {
      setState("ask");
    }
  }, []);

  if (state === "hidden") return null;

  const confirm = () => {
    try { localStorage.setItem(KEY, "yes"); } catch {}
    setState("hidden");
  };
  const reject = () => {
    try { localStorage.setItem(KEY, "no"); } catch {}
    setState("blocked");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-title"
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <div className="max-w-md w-full bg-card border border-border shadow-card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center bg-primary/10 text-primary mb-4">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        {state === "ask" ? (
          <>
            <h2 id="age-title" className="serif text-2xl font-bold">{t("age_title")}</h2>
            <p className="mt-3 text-sm text-foreground/70">{t("age_body")}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="wine" size="lg" onClick={confirm} className="rounded-none">
                {t("age_yes")}
              </Button>
              <Button variant="outline" size="lg" onClick={reject} className="rounded-none">
                {t("age_no")}
              </Button>
            </div>
            <p className="mt-5 text-[11px] text-foreground/55 leading-relaxed">
              {t("footer_age_warning")}
            </p>
          </>
        ) : (
          <>
            <h2 id="age-title" className="serif text-2xl font-bold">{t("age_blocked_title")}</h2>
            <p className="mt-3 text-sm text-foreground/70">{t("age_blocked_body")}</p>
          </>
        )}
      </div>
    </div>
  );
}
