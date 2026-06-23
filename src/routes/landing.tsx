import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { I18nProvider, useI18n, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CartSheet, type CartItem } from "@/components/cart-sheet";
import { AgeGate } from "@/components/age-gate";
import { LegalModal, type LegalTab } from "@/components/legal-modal";
import { Logo, LogoIcon } from "@/components/logo";
import {
  ShoppingBag,
  PackageOpen,
  QrCode,
  Users,
  Mic,
  Trophy,
  EyeOff,
  Check,
  Lock,
  Sparkles,
  Play,
  Medal,
  Gift,
  Flame,
} from "lucide-react";
import { Reveal } from "@/components/reveal";
import heroVideoNew from "@/assets/hero-video-new.mp4.asset.json";
import packWineloverImg from "@/assets/pack-winelover.jpg";
import packEnologyImg from "@/assets/pack-enology.jpg";
import packDeluxeImg from "@/assets/pack-deluxe.jpg";
import productBox from "@/assets/product-box.jpg";
import productQr from "@/assets/product-qr.jpg";
import productFriends from "@/assets/product-friends.jpg";
import winner1 from "@/assets/winner-1.jpg";
import winner2 from "@/assets/winner-2.jpg";
import winner3 from "@/assets/winner-3.jpg";
import tastingTableImg from "@/assets/tasting-table.jpg.asset.json";


export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "Tastia — Catas de vino con amigos, guiadas por un sommelier de IA" },
      {
        name: "description",
        content:
          "Pide tu pack Tastia, escanea el QR y un sommelier de IA con cara y voz guía una cata a ciegas con amigos. Sin registros.",
      },
    ],
  }),
  component: () => (
    <I18nProvider>
      <Landing />
    </I18nProvider>
  ),
});

function LangToggle() {
  const { lang, setLang } = useI18n();
  const opt = (l: Lang, label: string) => (
    <button
      key={l}
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      aria-label={`Switch language to ${label}`}
      className={`min-h-[44px] min-w-[44px] px-3 py-1 text-sm font-semibold rounded-none transition ${
        lang === l
          ? "bg-foreground text-background"
          : "text-foreground/70 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-none border border-border/70 bg-background/70 p-1"
    >
      {opt("es", "ES")}
      <span aria-hidden className="text-foreground/30">|</span>
      {opt("en", "EN")}
    </div>
  );
}

function Header({ onCta }: { onCta: () => void }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/75 border-b border-border/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-4">
          <a
            href="#packs"
            className="hidden sm:inline text-sm font-medium text-foreground/80 hover:text-foreground px-2 py-2"
          >
            {t("nav_packs")}
          </a>
          <a
            href="#how"
            className="hidden md:inline text-sm font-medium text-foreground/80 hover:text-foreground px-2 py-2"
          >
            {t("nav_how")}
          </a>
          <a
            href="#ranking"
            className="hidden md:inline text-sm font-medium text-foreground/80 hover:text-foreground px-2 py-2"
          >
            {t("nav_ranking")}
          </a>
          <a
            href="/admin"
            className="hidden sm:inline text-sm font-semibold text-primary hover:underline px-2 py-2"
          >
            Admin
          </a>
          <LangToggle />
          <Button variant="wine" size="sm" onClick={onCta} className="hidden sm:inline-flex">
            {t("nav_cta")}
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Hero({ onCta }: { onCta: () => void }) {
  const { t } = useI18n();
  return (
    <section id="top" className="relative min-h-[520px] md:min-h-[640px] overflow-hidden">
      {/* Full-width video background */}
      <video
        key={heroVideoNew.url}
        src={heroVideoNew.url}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="Experiencia Tastia"
      />
      {/* Gradient overlay for readability */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/35" />

      {/* Content overlaid on video */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 md:py-24 h-full flex items-center">
        <Reveal className="max-w-lg">
          <div className="relative rounded-none bg-wine p-8 sm:p-10 md:p-12 flex flex-col justify-center">
            <span aria-hidden className="block text-ink/40 mb-4 text-xl leading-none">·</span>
            <h1 className="serif text-5xl sm:text-6xl md:text-[4.5rem] leading-[0.95] font-bold tracking-tight text-ink">
              {t("hero_h1_line1")}
              <span className="block mt-2 italic font-bold text-cream">
                {t("hero_h1_line2")}
              </span>
            </h1>
            <button
              onClick={onCta}
              className="mt-8 self-start text-[11px] tracking-[0.3em] uppercase font-bold text-ink border-b border-ink/50 pb-1 hover:border-ink hover:text-ink transition-colors"
            >
              {t("hero_cta")}
            </button>
            {/* Decorative top color ticks */}
            <div aria-hidden className="absolute -top-1 left-6 flex gap-1.5">
              <span className="block h-1.5 w-10 rounded-none bg-olive" />
              <span className="block h-1.5 w-6 rounded-none bg-ink" />
              <span className="block h-1.5 w-8 rounded-none bg-gold" />
            </div>
          </div>
        </Reveal>
      </div>

      {/* Icon strip */}
      <div className="relative">
        <IconStrip />
      </div>
    </section>
  );
}

function IconStrip() {
  const items = [
    { Icon: Sparkles, label: "Sin protocolos" },
    { Icon: EyeOff, label: "A ciegas" },
    { Icon: Mic, label: "Sommelier IA" },
    { Icon: Trophy, label: "Ranking mensual" },
    { Icon: Lock, label: "Sin registro" },
  ];
  return (
    <div className="bg-olive">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-3 gap-x-6 items-center">
          {items.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm font-semibold text-cream">
              <Icon className="h-4 w-4 text-gold shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarqueeStrip() {
  const { t } = useI18n();
  const items = [t("strip_1"), t("strip_2"), t("strip_3"), t("strip_4"), t("strip_5"), t("strip_6")];
  const row = [...items, ...items];
  return (
    <div className="relative bg-primary text-primary-foreground overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-primary to-transparent z-10" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-primary to-transparent z-10" />
      <div className="flex w-max marquee py-3">
        {row.map((label, i) => (
          <span key={i} className="flex items-center gap-3 px-6 serif text-base sm:text-lg italic whitespace-nowrap">
            {label}
            <span aria-hidden className="h-1.5 w-1.5 rounded-none bg-accent" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Bento() {
  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Row 1 */}
        <div className="grid gap-3 md:grid-cols-12 md:gap-4">
          <Reveal className="md:col-span-4">
            <div className="relative h-72 md:h-96 overflow-hidden rounded-none">
              <img src={winner1} alt="Brindis" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </Reveal>
          <Reveal delay={120} className="md:col-span-4">
            <div className="h-72 md:h-96 rounded-none bg-card border border-border/60 p-6 sm:p-8 flex flex-col items-center justify-center text-center">
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                {[
                  { bg: "color-mix(in oklab, var(--olive) 28%, var(--card))", label: "Vino" },
                  { bg: "color-mix(in oklab, var(--primary) 28%, var(--card))", label: "Copa" },
                  { bg: "color-mix(in oklab, var(--accent) 45%, var(--card))", label: "Amigos" },
                ].map((c) => (
                  <div key={c.label} className="flex flex-col items-center gap-3">
                    <div
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-none"
                      style={{ background: c.bg }}
                      aria-hidden
                    />
                    <span className="text-xs sm:text-sm font-medium text-foreground/80">{c.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-8 serif italic text-sm text-foreground/60">Tres ingredientes. Una experiencia.</p>
            </div>
          </Reveal>
          <Reveal delay={240} className="md:col-span-4">
            <div className="h-72 md:h-96 rounded-none bg-accent text-accent-foreground p-7 sm:p-9 flex flex-col justify-center">
              <p className="serif text-xl sm:text-2xl leading-snug font-semibold">
                &ldquo;Cataron 4 vinos a ciegas y la del Priorat acabó ganando. Risas garantizadas.&rdquo;
              </p>
              <p className="mt-5 text-xs uppercase tracking-[0.25em] font-bold">— Marta · Barcelona</p>
            </div>
          </Reveal>
        </div>

        {/* Row 2 */}
        <div className="grid gap-3 md:grid-cols-12 md:gap-4 mt-3 md:mt-4">
          <Reveal className="md:col-span-4">
            <div className="relative h-64 md:h-80 rounded-none bg-primary text-primary-foreground overflow-hidden flex items-center justify-center">
              <div aria-hidden className="absolute -bottom-10 -left-10 h-40 w-40 rounded-none bg-accent/40 blur-2xl" />
              <div className="relative text-center px-6 flex flex-col items-center">
                <LogoIcon className="h-24 w-24 text-ink" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={120} className="md:col-span-8">
            <div className="relative h-64 md:h-80 rounded-none overflow-hidden">
              <img src={winner2} alt="Cata Tastia" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
              <div className="absolute bottom-5 right-5 text-right text-[color:var(--cream)]">
                <h3 className="serif text-2xl sm:text-3xl font-bold">Pack Winelover</h3>
                <p className="text-xs sm:text-sm opacity-85">4 vinos · cata online · sin registro</p>
                <p className="serif text-xl mt-1">80€</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Values() {
  const items = [
    { src: productBox, label: "Cuidado en cada detalle", bg: "bg-secondary" },
    { src: productQr, label: "QR sin instalación", bg: "bg-primary text-primary-foreground" },
    { src: productFriends, label: "Pensado para amigos", bg: "bg-olive text-cream" },
  ];
  return (
    <section className="py-14 md:py-20 bg-gold">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-none bg-card p-6 sm:p-10 md:p-12">
          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            {items.map((it, i) => (
              <Reveal key={it.label} delay={i * 120}>
                <figure className={`relative h-80 rounded-none overflow-hidden ${it.bg}`}>
                  <div className="absolute inset-x-6 top-6 bottom-20 overflow-hidden" style={{ borderRadius: "9999px 9999px 8px 8px" }}>
                    <img src={it.src} alt={it.label} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                  <figcaption className="absolute bottom-5 left-5 right-5">
                    <span className="inline-block bg-olive text-cream px-4 py-2.5 serif text-sm font-semibold rounded-none">
                      {it.label}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>


        </div>
      </div>
    </section>
  );
}




function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { icon: ShoppingBag, t: t("how_1_t"), d: t("how_1_d"), highlight: true },
    { icon: PackageOpen, t: t("how_2_t"), d: t("how_2_d") },
    { icon: QrCode, t: t("how_3_t"), d: t("how_3_d") },
    { icon: Users, t: t("how_4_t"), d: t("how_4_d") },
  ];

  // Subtle gradient stops: cream → burdeos a lo largo de los 4 pasos
  const tints = [
    "color-mix(in oklab, var(--primary) 5%, var(--card))",
    "color-mix(in oklab, var(--primary) 14%, var(--card))",
    "var(--gold)",
    "var(--primary)",
  ];

  return (
    <section id="how" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">{t("how_title")}</h2>
            <p className="mt-3 text-foreground/70">{t("how_sub")}</p>
          </div>
        </Reveal>

        <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isLast = i === steps.length - 1;
            const isFirst = i === 0;
            const isDark = i >= 2;
            // Horizontal arrow shape (lg+): notch on the left (except first), point on the right (except last)
            const clip = isFirst && isLast
              ? "none"
              : isFirst
              ? "polygon(0 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 0 100%)"
              : isLast
              ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 22px 50%)"
              : "polygon(0 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 0 100%, 22px 50%)";

            return (
              <Reveal
                key={i}
                as="li"
                delay={i * 110}
                className="relative lg:-ml-2 first:lg:ml-0"
                style={{ zIndex: steps.length - i }}
              >
                <div
                  className="group relative h-full p-6 pl-7 lg:pl-10 lg:pr-9 transition-transform duration-300 hover:-translate-y-1"
                  style={{ minHeight: "210px" }}
                >
                  {/* desktop chevron */}
                  <div
                    aria-hidden
                    className="hidden lg:block absolute inset-0"
                    style={{
                      background: tints[i],
                      clipPath: clip,
                      boxShadow: "0 8px 24px -16px rgba(0,0,0,0.25)",
                    }}
                  />
                  {/* mobile card */}
                  <div
                    aria-hidden
                    className="lg:hidden absolute inset-0 rounded-none border border-border/60 shadow-soft"
                    style={{ background: tints[i] }}
                  />

                  <div
                    className="relative"
                    style={{ color: isDark ? "var(--primary-foreground)" : "var(--foreground)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="grid h-11 w-11 place-items-center rounded-none transition-transform group-hover:scale-110"
                        style={{
                          background: isDark
                            ? "color-mix(in oklab, white 18%, transparent)"
                            : "color-mix(in oklab, var(--primary) 14%, transparent)",
                          color: isDark ? "var(--primary-foreground)" : "var(--primary)",
                        }}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span
                        className="serif text-2xl font-bold"
                        style={{
                          color: isDark
                            ? "color-mix(in oklab, white 60%, transparent)"
                            : "color-mix(in oklab, var(--foreground) 30%, transparent)",
                        }}
                      >
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold">{s.t}</h3>
                    <p
                      className="mt-2 text-sm leading-relaxed"
                      style={{
                        color: isDark
                          ? "color-mix(in oklab, white 85%, transparent)"
                          : "color-mix(in oklab, var(--foreground) 72%, transparent)",
                      }}
                    >
                      {s.d}
                    </p>
                    {s.highlight && (
                      <span className="mt-4 inline-flex items-center gap-1.5 rounded-none bg-accent/25 text-accent-foreground px-2.5 py-1 text-xs font-semibold">
                        <Check className="h-3.5 w-3.5" aria-hidden /> {t("how_no_signup")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile down-arrow connector between steps */}
                {!isLast && (
                  <div
                    aria-hidden
                    className="lg:hidden flex justify-center"
                    style={{ color: tints[i + 1], marginTop: "-2px", marginBottom: "-2px" }}
                  >
                    <svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor">
                      <polygon points="0,0 22,0 11,14" />
                    </svg>
                  </div>
                )}
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function FriendsTasting() {
  const { t } = useI18n();
  return (
    <section className="py-14 md:py-20 bg-gold">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <Reveal>
            <div className="relative rounded-none overflow-hidden">
              <img
                src={tastingTableImg.url}
                alt="Amigos en una cata a ciegas con Tastia"
                loading="lazy"
                className="w-full h-auto object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex flex-col justify-center">
              <span className="text-[11px] tracking-[0.25em] uppercase font-bold text-ink/70">
                {t("friends_tag")}
              </span>
              <h2 className="mt-3 serif text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.05] font-bold text-ink">
                {t("friends_title")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink/80 max-w-md">
                {t("friends_desc")}
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  t("friends_item_1"),
                  t("friends_item_2"),
                  t("friends_item_3"),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-ink/80">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-none bg-olive text-cream mt-0.5">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

type PackInfo = {
  id: string;
  name: string;
  tag: string;
  price: string;
  priceNum: number;
  long: string;
  features: string[];
  image: string;
  popular: boolean;
};

function Packs({ onBuy }: { onBuy: (p: PackInfo) => void }) {
  const { t } = useI18n();
  const packs: PackInfo[] = [
    {
      id: "winelover",
      name: t("pack1_name"),
      tag: t("pack1_tag"),
      price: t("pack1_price"),
      priceNum: 80,
      long: t("pack1_long"),
      features: t("pack1_features").split("|"),
      image: packWineloverImg,
      popular: false,
    },
    {
      id: "enology",
      name: t("pack2_name"),
      tag: t("pack2_tag"),
      price: t("pack2_price"),
      priceNum: 120,
      long: t("pack2_long"),
      features: t("pack2_features").split("|"),
      image: packEnologyImg,
      popular: true,
    },
    {
      id: "deluxe",
      name: t("pack3_name"),
      tag: t("pack3_tag"),
      price: t("pack3_price"),
      priceNum: 160,
      long: t("pack3_long"),
      features: t("pack3_features").split("|"),
      image: packDeluxeImg,
      popular: false,
    },
  ];

  return (
    <section id="packs" className="scroll-mt-24 py-20 md:py-28 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">{t("packs_title")}</h2>
          <p className="mt-3 text-foreground/70">{t("packs_sub")}</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((p, i) => (
            <Reveal key={p.name} delay={i * 130}>
              <Card
                className={`relative flex h-full flex-col overflow-hidden rounded-none border bg-card hover-lift ${
                  p.popular
                    ? "border-primary shadow-card ring-1 ring-primary/40"
                    : "border-border/70 shadow-soft"
                }`}
              >
                {p.popular && (
                  <Badge
                    variant="gold"
                    className="absolute top-4 right-4 z-10 px-3 py-1 text-xs font-bold tracking-wider uppercase shadow-soft"
                  >
                    {t("packs_popular")}
                  </Badge>
                )}

                <div className="relative aspect-[4/3] overflow-hidden bg-secondary/60">
                  <img
                    src={p.image}
                    alt={`Pack Tastia ${p.name}`}
                    width={1024}
                    height={768}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.04]"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
                </div>

                <CardHeader className="pt-6">
                  <h3 className="serif text-2xl font-bold">{p.name}</h3>
                  <p className="text-sm text-foreground/65">{p.tag}</p>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-xs uppercase tracking-wider text-foreground/55">
                      {t("packs_from")}
                    </span>
                    <span className="serif text-4xl font-bold text-primary">{p.price}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <p className="text-sm text-foreground/75 leading-relaxed">{p.long}</p>
                  <ul className="space-y-2.5 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" aria-hidden />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => onBuy(p)}
                    variant={p.popular ? "wine" : "outlineWine"}
                    size="lg"
                    className="mt-auto w-full"
                  >
                    {p.popular && <Sparkles className="h-4 w-4" aria-hidden />}
                    {t("packs_buy")} · {p.price}
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}

        </div>

        <p className="mt-8 text-center text-sm text-foreground/60 italic">{t("packs_soon")}</p>
      </div>
    </section>
  );
}

function Why() {
  const { t } = useI18n();
  return (
    <section className="py-20 md:py-28 bg-green">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">{t("why_title")}</h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <article className="lg:col-span-2 rounded-none bg-primary text-primary-foreground p-8 md:p-10 shadow-card overflow-hidden relative">
            <div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 rounded-none bg-accent/30 blur-2xl" />
            <span className="inline-grid h-12 w-12 place-items-center rounded-none bg-accent text-accent-foreground">
              <Mic className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="mt-5 serif text-2xl sm:text-3xl font-bold">{t("why_1_t")}</h3>
            <p className="mt-3 text-primary-foreground/85 text-base sm:text-lg max-w-xl">
              {t("why_1_d")}
            </p>
          </article>

          <article className="rounded-none bg-card border border-border/70 p-8 shadow-soft">
            <span className="inline-grid h-11 w-11 place-items-center rounded-none bg-accent/20 text-foreground">
              <Trophy className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-5 serif text-xl font-bold">{t("why_2_t")}</h3>
            <p className="mt-2 text-sm text-foreground/70">{t("why_2_d")}</p>
          </article>

          <article className="lg:col-span-3 rounded-none bg-gold p-8 shadow-soft flex flex-col sm:flex-row gap-6 sm:items-center">
            <span className="inline-grid h-11 w-11 place-items-center rounded-none bg-primary/10 text-primary shrink-0">
              <EyeOff className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="serif text-xl font-bold">{t("why_3_t")}</h3>
              <p className="mt-2 text-sm text-foreground/70 max-w-2xl">{t("why_3_d")}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Footer({ onOpenLegal }: { onOpenLegal: (tab: LegalTab) => void }) {
  const { t } = useI18n();
  const linkCls = "text-sm text-foreground/75 hover:text-foreground py-1 text-left";
  return (
    <footer className="border-t border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 text-sm text-foreground/65 max-w-md">{t("footer_rights")}</p>
          <p className="mt-3 text-xs text-foreground/55 max-w-md leading-relaxed">
            {t("footer_age_warning")}
          </p>
          <p className="mt-3 text-[11px] text-foreground/55">{t("footer_company")}</p>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <Lock className="h-4 w-4 text-primary" aria-hidden />
            {t("trust_pay")}
          </div>
          <div className="flex items-center gap-2" aria-label="Payment methods">
            {["VISA", "MC", "Pay"].map((m) => (
              <span
                key={m}
                aria-hidden
                className="inline-flex items-center justify-center h-7 min-w-12 rounded-none border border-border bg-background px-2 text-[10px] font-bold tracking-wider text-foreground/70"
              >
                {m}
              </span>
            ))}
          </div>
          <p className="text-sm text-foreground/65">{t("trust_ship")}</p>
          <span aria-hidden className="inline-flex items-center justify-center h-9 min-w-12 border-2 border-foreground/80 px-2 text-xs font-black tracking-wider">
            +18
          </span>
        </div>

        <nav className="flex flex-col gap-1 md:items-start" aria-label="Footer legal">
          <a href="mailto:hola@tastia.org" className={linkCls}>{t("link_contact")}</a>
          <button type="button" onClick={() => onOpenLegal("terms")} className={linkCls}>{t("link_terms")}</button>
          <button type="button" onClick={() => onOpenLegal("privacy")} className={linkCls}>{t("link_privacy")}</button>
          <button type="button" onClick={() => onOpenLegal("cookies")} className={linkCls}>{t("link_cookies")}</button>
          <button type="button" onClick={() => onOpenLegal("legal")} className={linkCls}>{t("link_legal")}</button>
          <button type="button" onClick={() => onOpenLegal("shipping")} className={linkCls}>{t("link_shipping")}</button>
        </nav>
      </div>
    </footer>
  );
}

function Ranking({ onCta }: { onCta: () => void }) {
  const { t } = useI18n();
  const podium = [
    {
      place: 2,
      name: t("rank_p2_name"),
      city: t("rank_p2_city"),
      pts: 1840,
      prize: t("rank_p2_prize"),
      img: winner2,
      bg: "bg-[color:var(--blush)]",
      accent: "from-foreground/10",
      height: "md:h-72",
      medal: "🥈",
    },
    {
      place: 1,
      name: t("rank_p1_name"),
      city: t("rank_p1_city"),
      pts: 2410,
      prize: t("rank_p1_prize"),
      img: winner1,
      bg: "bg-gold text-ink",
      accent: "from-ink/40",
      height: "md:h-96",
      medal: "🥇",
    },
    {
      place: 3,
      name: t("rank_p3_name"),
      city: t("rank_p3_city"),
      pts: 1520,
      prize: t("rank_p3_prize"),
      img: winner3,
      bg: "bg-[color:var(--blush)]",
      accent: "from-ink/30",
      height: "md:h-64",
      medal: "🥉",
    },
  ];

  return (
    <section id="ranking" className="scroll-mt-24 relative overflow-hidden py-20 md:py-28 bg-wine text-wine-foreground">
      <div aria-hidden className="pointer-events-none absolute -top-32 right-10 h-96 w-96 rounded-none bg-primary/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-10 h-96 w-96 rounded-none bg-accent/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-none border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5" aria-hidden /> {t("rank_eyebrow")}
              </span>
              <h2 className="mt-5 serif text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.02]">
                {t("rank_title")}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-wine-foreground/75 max-w-xl">
                {t("rank_sub")}
              </p>
            </div>
            <div className="rounded-none bg-olive px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-cream/60">
                {t("rank_month")}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="serif text-3xl font-bold text-accent">12</span>
                <span className="text-xs text-cream/70">{t("rank_days_left")}</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Podium */}
        <ol className="mt-14 grid gap-6 md:grid-cols-3 md:items-end">
          {podium.map((p, i) => (
            <Reveal as="li" key={p.place} delay={i * 140} className={`relative rounded-none overflow-hidden border border-wine-foreground/10 ${p.bg} ${p.height} flex flex-col`}>
              <div className="relative h-44 md:h-48 overflow-hidden">
                <img src={p.img} alt={p.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div aria-hidden className={`absolute inset-0 bg-gradient-to-t ${p.accent} to-transparent`} />
                <span className="absolute top-3 left-3 grid h-11 w-11 place-items-center rounded-none bg-background text-foreground serif text-xl font-bold shadow-soft">
                  #{p.place}
                </span>
                <span className="absolute top-3 right-3 text-2xl" aria-hidden>{p.medal}</span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="serif text-2xl font-bold leading-tight">{p.name}</h3>
                  <span className="serif text-xl font-bold">{new Intl.NumberFormat('es-ES').format(p.pts)}<span className="ml-1 text-[10px] uppercase tracking-wider opacity-70">{t("rank_pts")}</span></span>
                </div>
                <div className="text-xs uppercase tracking-[0.18em] opacity-70">{p.city}</div>
                <div className="mt-auto inline-flex items-start gap-2 rounded-none bg-black/15 px-3 py-2 text-sm">
                  <Gift className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                  <span>{p.prize}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>

        {/* Rules + CTA */}
        <div className="mt-12 grid gap-6 md:grid-cols-5">
          <Reveal className="md:col-span-3 rounded-none bg-olive p-6 md:p-8">
            <div className="flex items-center gap-2 text-accent">
              <Medal className="h-5 w-5" aria-hidden />
              <h3 className="serif text-xl font-bold text-cream">{t("rank_rules_title")}</h3>
            </div>
            <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[t("rank_rule_1"), t("rank_rule_2"), t("rank_rule_3"), t("rank_rule_4"), t("rank_rule_5")].map((r) => (
                <li key={r} className="flex items-start gap-2 text-cream/85">
                  <Check className="mt-0.5 h-4 w-4 text-accent shrink-0" aria-hidden />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120} className="md:col-span-2 rounded-none bg-accent text-accent-foreground p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="serif italic text-sm">{t("rank_eyebrow")}</div>
              <p className="mt-2 serif text-2xl leading-snug font-bold">{t("rank_disclaimer")}</p>
            </div>
            <Button variant="wine" size="lg" onClick={onCta} className="mt-6 w-full rounded-none">
              <Trophy className="h-4 w-4" aria-hidden /> {t("rank_cta")}
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Landing() {
  const { t } = useI18n();
  const [cartOpen, setCartOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>("terms");
  const [testPaidOpen, setTestPaidOpen] = useState(false);
  const openLegal = (tab: LegalTab) => { setLegalTab(tab); setLegalOpen(true); };

  // Handle the return from Stripe Checkout (?checkout=success|cancel). This is
  // an HONEST test-mode confirmation only — the durable order is §Stripe-B.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      setTestPaidOpen(true);
    } else if (checkout === "cancel") {
      setCartOpen(true); // reopen the cart, without faking any purchase
    } else {
      return;
    }
    // Clean the query param so a refresh doesn't re-trigger it.
    params.delete("checkout");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
    );
  }, []);

  const handleBuy = (p: PackInfo) => {
    setItems((prev) => {
      const found = prev.find((it) => it.id === p.id);
      if (found) return prev.map((it) => (it.id === p.id ? { ...it, qty: it.qty + 1 } : it));
      return [
        ...prev,
        { id: p.id, name: p.name, tag: p.tag, price: p.priceNum, image: p.image, qty: 1 },
      ];
    });
    setCartOpen(true);
  };

  const setQty = (id: string, qty: number) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty } : it)));
  const remove = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));
  const clear = () => setItems([]);

  const handleHeaderCta = () => {
    if (typeof document !== "undefined") {
      document.getElementById("packs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const count = items.reduce((acc, it) => acc + it.qty, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCta={handleHeaderCta} />
      <main className="flex-1">
        <Hero onCta={handleHeaderCta} />
        <HowItWorks />
        <FriendsTasting />
        <Bento />
        <Packs onBuy={handleBuy} />
        <Values />
        <Ranking onCta={handleHeaderCta} />

        <Why />
      </main>
      <Footer onOpenLegal={openLegal} />

      {/* Floating cart launcher */}
      {count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          aria-label={t("cart_open")}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-none bg-primary text-primary-foreground px-5 py-3 shadow-card hover:scale-[1.03] transition-transform"
        >
          <ShoppingBag className="h-5 w-5" aria-hidden />
          <span className="serif text-sm font-bold">{t("cart_open")}</span>
          <span className="grid h-6 min-w-6 px-1.5 place-items-center rounded-none bg-accent text-accent-foreground text-xs font-bold">
            {count}
          </span>
        </button>
      )}

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={items}
        setQty={setQty}
        remove={remove}
        clear={clear}
        onOpenLegal={openLegal}
      />

      <LegalModal open={legalOpen} onOpenChange={setLegalOpen} tab={legalTab} onTabChange={setLegalTab} />
      <AgeGate />

      <Dialog open={testPaidOpen} onOpenChange={setTestPaidOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle className="serif text-2xl">{t("checkout_test_title")}</DialogTitle>
            <DialogDescription>{t("checkout_test_body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="wine" className="rounded-none" onClick={() => setTestPaidOpen(false)}>
              {t("checkout_test_close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
