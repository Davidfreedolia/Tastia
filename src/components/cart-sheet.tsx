import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { createCheckout } from "@/lib/checkout.server";
import { ShoppingBag, Trash2, Minus, Plus, Lock, Clock, ArrowLeft } from "lucide-react";

export type CartItem = {
  id: string;
  name: string;
  tag: string;
  price: number; // in EUR
  image: string;
  qty: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  onOpenLegal?: (tab: "terms" | "privacy" | "cookies" | "legal" | "shipping") => void;
};

export function CartSheet({ open, onOpenChange, items, setQty, remove, clear, onOpenLegal }: Props) {
  const { t } = useI18n();
  // "soon" replaces the old fake "done": when Stripe isn't configured we show
  // an honest "Próximamente" state — we never fake a confirmed order here.
  const [step, setStep] = useState<"cart" | "checkout" | "soon">("cart");
  const [ageOk, setAgeOk] = useState(false);
  const [termsOk, setTermsOk] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const subtotal = items.reduce((acc, it) => acc + it.price * it.qty, 0);
  const shipping = subtotal > 0 ? 0 : 0; // always free (promo)
  const total = subtotal + shipping;

  const canPay = ageOk && termsOk && !paying;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPay) return;
    setPayError(null);
    setPaying(true);
    try {
      // Server recomputes the amount from the trusted catalog (id + qty only).
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await createCheckout({
        data: {
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
          origin,
        },
      });
      if (!res.configured) {
        // Honest fallback — no Stripe key configured. No charge, no order.
        setStep("soon");
        return;
      }
      if ("error" in res) {
        setPayError(t("cart_pay_error"));
        return;
      }
      if (res.url) {
        window.location.href = res.url; // redirect to Stripe Checkout (test)
        return;
      }
      setPayError(t("cart_pay_error"));
    } catch {
      setPayError(t("cart_pay_error"));
    } finally {
      setPaying(false);
    }
  };

  const closeSoon = () => {
    setStep("cart");
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o && step === "soon") closeSoon();
        else onOpenChange(o);
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-card border-l border-border/60"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 text-left">
          <SheetTitle className="serif text-2xl flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" aria-hidden />
            {step === "soon" ? t("cart_soon_title") : t("cart_title")}
          </SheetTitle>
          <SheetDescription className="text-xs uppercase tracking-[0.18em] text-foreground/60">
            {t("cart_subtitle")}
          </SheetDescription>
        </SheetHeader>

        {step === "soon" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-5">
            <div className="grid h-16 w-16 place-items-center rounded-none bg-primary/10 text-primary">
              <Clock className="h-8 w-8" aria-hidden />
            </div>
            <h3 className="serif text-2xl font-bold">{t("cart_soon_title")}</h3>
            <p className="text-sm text-foreground/70 max-w-xs">{t("cart_soon_body")}</p>
            <Button variant="wine" size="lg" onClick={closeSoon} className="mt-2 rounded-none">
              {t("cart_soon_close")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-none bg-secondary text-foreground/50">
              <ShoppingBag className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="serif text-xl font-bold">{t("cart_empty")}</h3>
            <p className="text-sm text-foreground/65">{t("cart_empty_hint")}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {step === "cart" ? (
                items.map((it) => (
                  <div
                    key={it.id}
                    className="flex gap-3 rounded-none border border-border/60 bg-background p-3"
                  >
                    <img
                      src={it.image}
                      alt={it.name}
                      className="h-20 w-20 rounded-none object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="serif text-base font-bold truncate">{it.name}</h4>
                          <p className="text-xs text-foreground/60 truncate">{it.tag}</p>
                        </div>
                        <button
                          onClick={() => remove(it.id)}
                          aria-label={t("cart_remove")}
                          className="text-foreground/50 hover:text-primary p-1 -m-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-none border border-border bg-card">
                          <button
                            onClick={() => setQty(it.id, Math.max(1, it.qty - 1))}
                            aria-label="−"
                            className="grid h-8 w-8 place-items-center text-foreground/70 hover:text-foreground"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-6 text-center text-sm font-semibold">{it.qty}</span>
                          <button
                            onClick={() => setQty(it.id, it.qty + 1)}
                            aria-label="+"
                            className="grid h-8 w-8 place-items-center text-foreground/70 hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="serif text-lg font-bold text-primary">
                          {(it.price * it.qty).toFixed(0)}€
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <form id="checkout-form" onSubmit={handlePay} className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setStep("cart")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/70 hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> {t("cart_title")}
                  </button>
                  <h3 className="serif text-lg font-bold pt-1">{t("cart_checkout_title")}</h3>
                  <Input required placeholder={t("cart_name")} autoComplete="name" />
                  <Input required type="email" placeholder={t("cart_email")} autoComplete="email" />
                  <Input required placeholder={t("cart_address")} autoComplete="street-address" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input required placeholder={t("cart_city")} autoComplete="address-level2" />
                    <Input required placeholder={t("cart_zip")} autoComplete="postal-code" inputMode="numeric" />
                  </div>
                  <div className="rounded-none border border-border bg-secondary/50 p-3 text-xs text-foreground/70 inline-flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-primary" /> {t("cart_pay_secure")}
                  </div>

                  <label className="flex items-start gap-2 text-xs text-foreground/80 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={ageOk}
                      onChange={(e) => setAgeOk(e.target.checked)}
                      required
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span>{t("cart_consent_age")}</span>
                  </label>
                  <label className="flex items-start gap-2 text-xs text-foreground/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsOk}
                      onChange={(e) => setTermsOk(e.target.checked)}
                      required
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span>
                      {t("cart_consent_terms")}{" "}
                      {onOpenLegal && (
                        <>
                          (
                          <button type="button" onClick={() => onOpenLegal("terms")} className="underline hover:text-primary">
                            {t("link_terms")}
                          </button>
                          {" · "}
                          <button type="button" onClick={() => onOpenLegal("privacy")} className="underline hover:text-primary">
                            {t("link_privacy")}
                          </button>
                          )
                        </>
                      )}
                    </span>
                  </label>
                  <p className="text-[11px] text-foreground/55 leading-relaxed">{t("cart_id_notice")}</p>
                  {payError && (
                    <p role="alert" className="text-xs font-semibold text-destructive">
                      {payError}
                    </p>
                  )}
                </form>
              )}
            </div>

            <div className="border-t border-border/60 bg-background px-6 py-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/70">{t("cart_subtotal")}</span>
                <span className="font-semibold">{subtotal.toFixed(0)}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/70">{t("cart_shipping")}</span>
                <span className="font-semibold text-primary">{t("cart_shipping_free")}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-border/60">
                <span className="serif text-base font-bold">{t("cart_total")}</span>
                <span className="serif text-2xl font-bold text-primary">{total.toFixed(0)}€</span>
              </div>
              {step === "cart" ? (
                <Button
                  variant="wine"
                  size="lg"
                  className="w-full rounded-none"
                  onClick={() => setStep("checkout")}
                >
                  <Lock className="h-4 w-4" aria-hidden /> {t("cart_pay")} · {total.toFixed(0)}€
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="checkout-form"
                  variant="wine"
                  size="lg"
                  className="w-full rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canPay}
                >
                  <Lock className="h-4 w-4" aria-hidden /> {t("cart_pay")} · {total.toFixed(0)}€
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
