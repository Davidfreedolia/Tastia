import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useI18n, type strings } from "@/lib/i18n";

export type LegalTab = "terms" | "privacy" | "cookies" | "legal" | "shipping";

const TABS: { id: LegalTab; titleKey: keyof typeof strings; bodyKey: keyof typeof strings }[] = [
  { id: "terms", titleKey: "link_terms", bodyKey: "legal_terms_body" },
  { id: "privacy", titleKey: "link_privacy", bodyKey: "legal_privacy_body" },
  { id: "cookies", titleKey: "link_cookies", bodyKey: "legal_cookies_body" },
  { id: "legal", titleKey: "link_legal", bodyKey: "legal_legal_body" },
  { id: "shipping", titleKey: "link_shipping", bodyKey: "legal_shipping_body" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: LegalTab;
  onTabChange: (tab: LegalTab) => void;
};

export function LegalModal({ open, onOpenChange, tab, onTabChange }: Props) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-none p-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/60 text-left">
          <DialogTitle className="serif text-2xl">{t(TABS.find((x) => x.id === tab)!.titleKey)}</DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-[0.18em] text-foreground/60">
            {t("legal_updated")}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as LegalTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-3 rounded-none flex-wrap h-auto justify-start gap-1 bg-secondary/60 p-1">
            {TABS.map((x) => (
              <TabsTrigger key={x.id} value={x.id} className="rounded-none text-xs">
                {t(x.titleKey)}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((x) => (
            <TabsContent
              key={x.id}
              value={x.id}
              className="flex-1 overflow-y-auto px-6 py-5 text-sm text-foreground/80 leading-relaxed whitespace-pre-line"
            >
              {t(x.bodyKey)}
            </TabsContent>
          ))}
        </Tabs>
        <div className="px-6 py-3 border-t border-border/60 text-[11px] text-foreground/60">
          {t("footer_company")}
        </div>
      </DialogContent>
    </Dialog>
  );
}
