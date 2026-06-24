import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CartSheet, type CartItem } from "@/components/cart-sheet";
import { AgeGate } from "@/components/age-gate";
import { LegalModal, type LegalTab } from "@/components/legal-modal";
import { Logo, LogoIcon } from "@/components/logo";
import {
  Settings,
  ShoppingBag,
  PackageOpen,
  QrCode,
  Users,
  Mic,
  Trophy,
  EyeOff,
  Check,
  Lock,
  Play,
  Medal,
  Gift,
  Flame,
  Wine,
  BottleWine,
} from "lucide-react";
import { useGsapScene, gsap } from "@/hooks/use-gsap";
import heroPoster from "@/assets/hero-poster.jpg";
import heroVideo from "@/assets/tastIA_hero_vid.mp4";
import packWineloverImg from "@/assets/tastIA_winelover.jpeg";
import packEnologyImg from "@/assets/tastIA_enology.jpeg";
import packDeluxeImg from "@/assets/tastIA_deluxe.jpeg";
import winner1 from "@/assets/winner-1.jpg";
import winner2 from "@/assets/winner-2.jpg";
import winner3 from "@/assets/winner-3.jpg";
import tastingTableImg from "@/assets/tasting-table.png";

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

function LangToggle({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useI18n();
  const isEn = lang === "en";
  const toggle = () => setLang(isEn ? "es" : "en");
  const active = light ? "text-cream" : "text-foreground";
  const dim = light ? "text-cream/40" : "text-foreground/40";
  const trackBg = light ? "bg-cream/25" : "bg-foreground/20";
  return (
    <div className="inline-flex items-center gap-2 text-sm font-semibold">
      <span className={isEn ? dim : active}>ES</span>
      <button
        type="button"
        role="switch"
        aria-checked={isEn}
        aria-label="Toggle language"
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full ${trackBg} transition-colors data-[on=true]:bg-primary`}
        data-on={isEn}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
            isEn ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className={isEn ? active : dim}>EN</span>
    </div>
  );
}

function Header({ onCta: _onCta }: { onCta: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-cream/80 backdrop-blur-md border-b border-border/40" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 grid grid-cols-3 items-center gap-3">
        <div className="justify-self-start">
          <a
            href="/admin"
            aria-label="Admin"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
              scrolled
                ? "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                : "text-cream/85 hover:text-cream hover:bg-cream/10"
            }`}
          >
            <Settings className="h-5 w-5" />
          </a>
        </div>
        <div className={`justify-self-center ${scrolled ? "" : "text-cream"}`}>
          <Logo light={!scrolled} />
        </div>
        <div className="justify-self-end">
          <LangToggle light={!scrolled} />
        </div>
      </div>
    </header>
  );
}

function Hero({ onCta }: { onCta: () => void }) {
  const { t } = useI18n();

  const sceneRef = useGsapScene<HTMLElement>(({ scope, reduced, desktop }) => {
    const poster = scope.querySelector<HTMLElement>(".hero-poster");
    const overlay = scope.querySelector<HTMLElement>(".hero-overlay");
    const block = scope.querySelector<HTMLElement>(".hero-block");
    const lines = scope.querySelectorAll<HTMLElement>(".hero-line");
    const cta = scope.querySelector<HTMLElement>(".hero-cta");
    const ticks = scope.querySelectorAll<HTMLElement>(".hero-tick");

    if (reduced) {
      gsap.set([poster, overlay, block, lines, cta, ticks], { clearProps: "all" });
      return;
    }

    if (!desktop) {
      gsap.from(block, { y: 24, opacity: 0, duration: 0.8, ease: "power2.out" });
      gsap.from(lines, {
        y: 20,
        opacity: 0,
        stagger: 0.12,
        duration: 0.7,
        ease: "power2.out",
        delay: 0.15,
      });
      gsap.from(cta, { opacity: 0, duration: 0.6, delay: 0.6 });
      return;
    }

    const pinTarget = scope.querySelector<HTMLElement>(".hero-pin");
    if (!pinTarget) return;

    gsap.set(poster, { scale: 1.18, filter: "brightness(0.55)" });
    gsap.set(overlay, { opacity: 1 });
    gsap.set(block, { clipPath: "inset(0 100% 0 0)" });
    gsap.set(lines, { yPercent: 60, opacity: 0 });
    gsap.set(cta, { opacity: 0, y: 10 });
    gsap.set(ticks, { scaleX: 0, transformOrigin: "left center" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pinTarget,
        start: "top top",
        end: "+=120%",
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
      },
    });

    tl.to(poster, { scale: 1, filter: "brightness(1)", ease: "power2.out", duration: 1 }, 0)
      .to(overlay, { opacity: 0.7, duration: 1, ease: "power1.out" }, 0)
      .to(block, { clipPath: "inset(0 0% 0 0)", ease: "expo.out", duration: 0.9 }, 0)
      .to(ticks, { scaleX: 1, ease: "power2.out", duration: 0.5, stagger: 0.06 }, 0.1)
      .to(lines, { yPercent: 0, opacity: 1, ease: "expo.out", duration: 0.8, stagger: 0.15 }, 0.15)
      .to(cta, { opacity: 1, y: 0, ease: "power2.out", duration: 0.5 }, 0.5);

    // Subtle ambient float on the wine block (independent of scroll)
    gsap.to(block, {
      y: "+=6",
      duration: 3.2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }, []);

  return (
    <section ref={sceneRef} id="top" className="relative">
      <div className="hero-pin relative h-screen min-h-[560px] overflow-hidden bg-ink">
        <video
          src={heroVideo}
          poster={heroPoster}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
          ref={(el) => {
            if (!el) return;
            el.playbackRate = 0.75;
            const FADE = 0.6;
            let raf = 0;
            const tick = () => {
              const d = el.duration;
              if (d) {
                const remain = d - el.currentTime;
                let o = 1;
                if (remain < FADE) o = Math.max(0, remain / FADE);
                else if (el.currentTime < FADE) o = Math.min(1, el.currentTime / FADE);
                el.style.opacity = String(o);
              }
              raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
            return () => cancelAnimationFrame(raf);
          }}
          className="hero-poster absolute inset-0 h-full w-full object-cover will-change-transform transition-opacity duration-200"
        />
        <div
          aria-hidden
          className="hero-overlay absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/35"
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 h-full flex items-center">
          <div className="max-w-2xl">
            <div className="hero-block relative rounded-none bg-wine p-8 sm:p-10 md:p-12 flex flex-col justify-center will-change-transform">
              <h1 className="serif text-5xl sm:text-6xl md:text-[4.5rem] leading-[0.95] font-bold tracking-tight text-ink overflow-hidden">
                <span className="hero-line block">{t("hero_h1_line1")}</span>
                <span className="hero-line block mt-2 italic font-bold text-cream">
                  {(() => {
                    const text = t("hero_h1_line2");
                    const idx = text.indexOf(",");
                    if (idx === -1) return text;
                    return (
                      <>
                        {text.slice(0, idx + 1)}
                        <br />
                        {text.slice(idx + 1).trimStart()}
                      </>
                    );
                  })()}
                </span>
              </h1>
              <button
                onClick={onCta}
                className="hero-cta mt-8 self-start text-[11px] tracking-[0.3em] uppercase font-bold text-ink border-b border-ink/50 pb-1 hover:border-ink hover:text-ink transition-colors"
              >
                {t("hero_cta")}
              </button>
              <div aria-hidden className="absolute -top-1 left-6 flex gap-1.5">
                <span className="hero-tick block h-1.5 w-10 rounded-none bg-olive" />
                <span className="hero-tick block h-1.5 w-6 rounded-none bg-ink" />
                <span className="hero-tick block h-1.5 w-8 rounded-none bg-gold" />
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

function MarqueeStrip() {
  const { t } = useI18n();
  const items = [
    t("strip_1"),
    t("strip_2"),
    t("strip_3"),
    t("strip_4"),
    t("strip_5"),
    t("strip_6"),
  ];
  const row = [...items, ...items];
  return (
    <div className="relative bg-primary text-primary-foreground overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-primary to-transparent z-10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-primary to-transparent z-10"
      />
      <div className="flex w-max marquee py-3">
        {row.map((label, i) => (
          <span
            key={i}
            className="flex items-center gap-3 px-6 serif text-base sm:text-lg italic whitespace-nowrap"
          >
            {label}
            <span aria-hidden className="h-1.5 w-1.5 rounded-none bg-accent" />
          </span>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { icons: [ShoppingBag], t: t("how_1_t"), d: t("how_1_d"), highlight: true },
    { icons: [PackageOpen], t: t("how_2_t"), d: t("how_2_d") },
    { icons: [QrCode], t: t("how_3_t"), d: t("how_3_d") },
    { icons: [BottleWine], t: t("how_4_t"), d: t("how_4_d") },
  ];

  const sceneRef = useGsapScene<HTMLElement>(({ scope, reduced, desktop }) => {
    const header = scope.querySelector<HTMLElement>(".how-header");
    const items = scope.querySelectorAll<HTMLElement>(".step-item");
    const numbers = scope.querySelectorAll<HTMLElement>(".step-number");
    const watermarks = scope.querySelectorAll<HTMLElement>(".step-watermark-icon");
    const pillars = scope.querySelectorAll<HTMLElement>(".pillar");

    if (reduced) return;

    if (!desktop) {
      gsap.set(watermarks, { opacity: 0.32 });
      gsap.from(header, { y: 24, opacity: 0, duration: 0.7, ease: "power2.out" });
      gsap.from(items, {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.2,
      });
      gsap.from(pillars, {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.5,
      });
      return;
    }

    const pin = scope.querySelector<HTMLElement>(".how-pin");
    if (!pin) return;

    gsap.set(header, { y: 40, opacity: 0 });
    gsap.set(items, { y: 60, opacity: 0 });
    gsap.set(numbers, { scale: 0.5, opacity: 0 });
    gsap.set(watermarks, { opacity: 0, scale: 0.7 });
    gsap.set(pillars, { y: 50, opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        start: "top 5%",
        end: "+=200%",
        pin: true,
        pinSpacing: true,
        scrub: 0.6,
        anticipatePin: 1,
      },
    });

    tl.to(header, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, 0)
      .to(items, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.35 }, 0.4)
      .to(
        numbers,
        { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.6)", stagger: 0.35 },
        0.55,
      )
      .to(
        watermarks,
        { opacity: 0.32, scale: 1, duration: 1, ease: "power2.out", stagger: 0.35 },
        0.55,
      )
      .to(pillars, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.25 }, 2.0);

    // Ambient: slow rotation of watermark icons
    watermarks.forEach((el, i) => {
      gsap.to(el, {
        rotation: i % 2 === 0 ? 8 : -8,
        duration: 4 + i * 0.3,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    });
  }, []);

  return (
    <section ref={sceneRef} id="how" className="bg-background">
      <div className="how-pin min-h-[95vh] flex flex-col justify-center py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 w-full">
          <div className="how-header max-w-2xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">{t("how_title")}</h2>
            <p className="mt-3 text-foreground/70">{t("how_sub")}</p>
          </div>

          <ol className="steps-list grid gap-24 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 mt-10">
            {steps.map((s, i) => {
              const Icons = s.icons;
              return (
                <li key={i} data-step={i} className="step-item lg:-ml-2 first:lg:ml-0">
                  <div className="step-card group relative h-full p-6 pl-7 lg:pl-10 lg:pr-9 transition-transform duration-300 hover:-translate-y-1">
                    <div className="step-card-body relative flex flex-col items-center text-center">
                      {/* Watermark icon(s) — sits behind number + text */}
                      <div
                        aria-hidden
                        data-step={i}
                        className="step-watermark absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-2 pointer-events-none z-0"
                      >
                        {Icons.map((IconCmp, idx) => (
                          <IconCmp key={idx} className="step-watermark-icon h-40 w-40" />
                        ))}
                      </div>

                      {/* Number in rounded wrapper */}
                      <span
                        data-step={i}
                        className="step-number relative z-10 grid place-items-center rounded-full serif font-bold transition-transform group-hover:scale-105"
                      >
                        {i + 1}
                      </span>

                      <h3 className="step-title relative z-10 mt-5 font-semibold">{s.t}</h3>
                      <p className="step-desc relative z-10 mt-2 text-sm leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <article className="pillar lg:col-span-2 rounded-none bg-primary text-primary-foreground p-8 md:p-10 shadow-card overflow-hidden relative">
              <Mic className="h-14 w-14 text-white" aria-hidden />
              <h3 className="pillar-title mt-5 serif font-bold">{t("why_1_t")}</h3>
              <p className="mt-3 text-primary-foreground/85 text-base sm:text-lg max-w-xl">
                {t("why_1_d")}
              </p>
            </article>

            <article className="pillar rounded-none bg-card p-8 shadow-soft">
              <Trophy className="h-14 w-14 text-foreground" aria-hidden />
              <h3 className="pillar-title pillar-title--tight mt-5 serif font-bold">
                {t("why_2_t")}
              </h3>
              <p className="mt-2 text-sm text-foreground/70">{t("why_2_d")}</p>
            </article>

            <article className="pillar pillar-blush lg:col-span-3 rounded-none p-8 shadow-soft flex flex-col sm:flex-row gap-6 sm:items-center">
              <EyeOff className="h-14 w-14 text-primary shrink-0" aria-hidden />
              <div>
                <h3 className="pillar-title serif font-bold">{t("why_3_t")}</h3>
                <p className="mt-2 text-sm text-foreground/70 max-w-2xl">{t("why_3_d")}</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

function FriendsTasting() {
  const { t } = useI18n();

  const sceneRef = useGsapScene<HTMLElement>(({ scope, reduced, desktop }) => {
    const image = scope.querySelector<HTMLElement>(".friends-image");
    const img = scope.querySelector<HTMLElement>(".friends-image img");
    const tag = scope.querySelector<HTMLElement>(".friends-tag");
    const title = scope.querySelector<HTMLElement>(".friends-title");
    const items = scope.querySelectorAll<HTMLElement>(".friends-item");

    if (reduced) return;

    if (!desktop) {
      gsap.from([tag, title], {
        y: 24,
        opacity: 0,
        stagger: 0.12,
        duration: 0.7,
        ease: "power2.out",
      });
      gsap.from(items, {
        x: -20,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.4,
      });
      return;
    }

    const pin = scope.querySelector<HTMLElement>(".friends-pin");
    if (!pin || !image) return;

    gsap.set(image, { clipPath: "circle(0% at 20% 50%)" });
    gsap.set(img, { scale: 1.25 });
    gsap.set([tag, title], { y: 40, opacity: 0 });
    gsap.set(items, { x: -30, opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        start: "top 5%",
        end: "+=160%",
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
      },
    });

    tl.to(image, { clipPath: "circle(100% at 20% 50%)", ease: "expo.out", duration: 1.4 }, 0)
      .to(img, { scale: 1, ease: "power2.out", duration: 1.4 }, 0)
      .to(tag, { y: 0, opacity: 1, ease: "power2.out", duration: 0.6 }, 0.5)
      .to(title, { y: 0, opacity: 1, ease: "expo.out", duration: 0.9 }, 0.65)
      .to(items, { x: 0, opacity: 1, ease: "power2.out", duration: 0.6, stagger: 0.2 }, 0.95);

    // Ambient: gentle parallax drift on the image
    gsap.to(img, {
      y: -8,
      duration: 4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }, []);

  return (
    <section ref={sceneRef} className="relative overflow-hidden bg-gold">
      <div className="friends-pin relative md:min-h-[95vh] flex items-start md:items-center pt-0 pb-14 md:py-20">
        {/* Desktop: full-height rounded image, left-aligned with 5vw overflow past viewport */}
        <div className="friends-image hidden md:block absolute inset-y-0 rounded-r-full rounded-l-none overflow-hidden pointer-events-none">
          <img
            src={tastingTableImg}
            alt="Amigos en una cata a ciegas con Tastia"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 w-full">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            {/* Mobile-only inline image */}
            <div className="md:hidden min-w-0 overflow-hidden -mx-4 sm:-mx-6 -mt-14">
              <div className="friends-image-mobile relative overflow-hidden h-[48vh]">
                <img
                  src={tastingTableImg}
                  alt="Amigos en una cata a ciegas con Tastia"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
            {/* Desktop spacer keeping right column aligned */}
            <div className="hidden md:block" aria-hidden />
            <div className="flex flex-col justify-center min-w-0">
              <span className="friends-tag text-[11px] tracking-[0.25em] uppercase font-bold text-ink/70">
                {t("friends_tag")}
              </span>
              <h2 className="friends-title mt-3 serif text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.05] font-bold text-ink">
                {t("friends_title")}
              </h2>
              <ul className="mt-6 space-y-3">
                {[t("friends_item_1"), t("friends_item_2"), t("friends_item_3")].map((item) => (
                  <li
                    key={item}
                    className="friends-item flex items-start gap-3 text-base text-ink/80 min-w-0 w-full"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-olive text-cream mt-0.5">
                      <Check className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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

  const sceneRef = useGsapScene<HTMLElement>(({ scope, reduced, desktop }) => {
    const header = scope.querySelector<HTMLElement>(".packs-header");
    const cards = scope.querySelectorAll<HTMLElement>(".pack-card");
    const popular = scope.querySelector<HTMLElement>(".pack-card.is-popular");
    const soon = scope.querySelector<HTMLElement>(".packs-soon");

    if (reduced) return;

    if (!desktop) {
      gsap.from(header, { y: 24, opacity: 0, duration: 0.7, ease: "power2.out" });
      gsap.from(cards, {
        y: 30,
        opacity: 0,
        stagger: 0.12,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.2,
      });
      gsap.from(soon, { opacity: 0, duration: 0.5, delay: 0.8 });
      return;
    }

    const pin = scope.querySelector<HTMLElement>(".packs-pin");
    if (!pin) return;

    gsap.set(header, { y: 40, opacity: 0 });
    gsap.set(cards, {
      y: 80,
      opacity: 0,
      rotationX: -12,
      transformPerspective: 900,
      transformOrigin: "center bottom",
    });
    gsap.set(soon, { opacity: 0, y: 10 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        start: "top 5%",
        end: "+=180%",
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
      },
    });

    tl.to(header, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, 0)
      .to(
        cards,
        { y: 0, opacity: 1, rotationX: 0, duration: 1.1, ease: "expo.out", stagger: 0.25 },
        0.4,
      )
      .to(
        popular,
        {
          scale: 1.03,
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.25)",
          duration: 0.8,
          ease: "power2.out",
        },
        1.6,
      )
      .to(soon, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, 2.1);
  }, []);

  return (
    <section ref={sceneRef} id="packs" className="scroll-mt-24 bg-secondary/40">
      <div className="packs-pin min-h-[95vh] flex flex-col justify-center py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 w-full">
          <div className="packs-header max-w-2xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">{t("packs_title")}</h2>
            <p className="mt-3 text-foreground/70">{t("packs_sub")}</p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((p) => (
              <Card
                key={p.name}
                className={`pack-card relative flex h-full flex-col overflow-hidden rounded-none border bg-card will-change-transform ${
                  p.popular
                    ? "is-popular border-primary shadow-card ring-1 ring-primary/40"
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
                    className="pack-buy-btn mt-auto w-full"
                  >
                    {t("packs_buy")} · {p.price}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="packs-soon mt-8 text-center text-sm text-foreground/60 italic">
            {t("packs_soon")}
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer({ onOpenLegal }: { onOpenLegal: (tab: LegalTab) => void }) {
  const { t } = useI18n();
  const linkCls = "text-sm text-foreground/75 hover:text-foreground py-1 text-left";
  return (
    <footer className="border-t border-border/60 bg-white">
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
            <span
              aria-label="Visa"
              className="inline-flex items-center justify-center h-10 w-16 rounded-none border border-border bg-background"
            >
              <svg viewBox="0 0 48 16" className="h-5" aria-hidden>
                <text
                  x="24"
                  y="13"
                  textAnchor="middle"
                  fontFamily="Helvetica, Arial, sans-serif"
                  fontWeight="900"
                  fontSize="14"
                  fontStyle="italic"
                  fill="#1A1F71"
                >
                  VISA
                </text>
              </svg>
            </span>
            <span
              aria-label="Mastercard"
              className="inline-flex items-center justify-center h-10 w-16 rounded-none border border-border bg-background"
            >
              <svg viewBox="0 0 32 20" className="h-6" aria-hidden>
                <circle cx="12" cy="10" r="7" fill="#EB001B" />
                <circle cx="20" cy="10" r="7" fill="#F79E1B" />
                <path d="M16 4.6a7 7 0 0 1 0 10.8 7 7 0 0 1 0-10.8z" fill="#FF5F00" />
              </svg>
            </span>
            <span
              aria-label="PayPal"
              className="inline-flex items-center justify-center h-10 w-16 rounded-none border border-border bg-background"
            >
              <svg viewBox="0 0 64 16" className="h-4" aria-hidden>
                <text
                  x="32"
                  y="13"
                  textAnchor="middle"
                  fontFamily="Helvetica, Arial, sans-serif"
                  fontWeight="900"
                  fontSize="14"
                  fontStyle="italic"
                  fill="#003087"
                >
                  Pay<tspan fill="#009CDE">Pal</tspan>
                </text>
              </svg>
            </span>
          </div>
          <p className="text-sm text-foreground/65">{t("trust_ship")}</p>
          <span
            aria-hidden
            className="inline-flex items-center justify-center h-9 min-w-12 border-2 border-foreground/80 px-2 text-xs font-black tracking-wider"
          >
            +18
          </span>
        </div>

        <nav className="flex flex-col gap-1 md:items-start" aria-label="Footer legal">
          <a href="mailto:hola@tastia.org" className={linkCls}>
            {t("link_contact")}
          </a>
          <button type="button" onClick={() => onOpenLegal("terms")} className={linkCls}>
            {t("link_terms")}
          </button>
          <button type="button" onClick={() => onOpenLegal("privacy")} className={linkCls}>
            {t("link_privacy")}
          </button>
          <button type="button" onClick={() => onOpenLegal("cookies")} className={linkCls}>
            {t("link_cookies")}
          </button>
          <button type="button" onClick={() => onOpenLegal("legal")} className={linkCls}>
            {t("link_legal")}
          </button>
          <button type="button" onClick={() => onOpenLegal("shipping")} className={linkCls}>
            {t("link_shipping")}
          </button>
        </nav>
      </div>
    </footer>
  );
}

function Ranking({ onCta: _onCta }: { onCta: () => void }) {
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
      bg: "bg-olive text-cream",
      accent: "from-ink/30",
      height: "md:h-64",
      medal: "🥉",
    },
  ];

  return (
    <section
      id="ranking"
      className="scroll-mt-24 relative overflow-hidden bg-wine text-wine-foreground"
    >
      <div className="relative flex flex-col py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute top-8 right-4 sm:right-10 opacity-10 select-none rotate-[30deg] origin-center"
        >
          <LogoIcon className="h-[28rem] w-[28rem] md:h-[36rem] md:w-[36rem]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-10 h-96 w-96 rounded-none bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-10 h-96 w-96 rounded-none bg-accent/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 w-full">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h2 className="serif text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.02]">
                {t("rank_title")}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-wine-foreground/75 max-w-xl">
                {t("rank_sub")}
              </p>
            </div>
          </div>

          {/* Podium */}
          <ol className="mt-14 grid gap-6 md:grid-cols-3 md:items-end">
            {podium.map((p) => {
              return (
                <li
                  key={p.place}
                  data-place={p.place}
                  className={`podium-card relative overflow-hidden border border-wine-foreground/10 ${p.bg} ${p.height} ${p.place === 1 ? "order-1" : p.place === 2 ? "order-2" : "order-3"} md:order-none flex flex-col`}
                >
                  <div className="relative h-54 md:h-54 overflow-hidden">
                    <img
                      src={p.img}
                      alt={p.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                    <div
                      aria-hidden
                      className={`absolute inset-0 bg-gradient-to-t ${p.accent} to-transparent`}
                    />
                    <span
                      data-place={p.place}
                      className="podium-place absolute top-3 left-3 serif font-bold"
                    >
                      #{p.place}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="serif text-2xl font-bold leading-tight">{p.name}</h3>
                      <span className="serif text-xl font-bold">
                        <span>{new Intl.NumberFormat("es-ES").format(p.pts)}</span>
                        <span className="ml-1 text-[10px] uppercase tracking-wider opacity-70">
                          {t("rank_pts")}
                        </span>
                      </span>
                    </div>
                    <div className="text-xs uppercase tracking-[0.18em] opacity-70">{p.city}</div>
                    <div className="mt-auto inline-flex items-start gap-2 rounded-none bg-black/15 px-3 py-2 text-sm">
                      <Gift className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                      <span>{p.prize}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Rules + CTA */}
          <div className="rules-wrapper relative mt-12">
            <div
              className="rules-bg absolute inset-y-0 left-1/2 -translate-x-1/2 w-full"
              aria-hidden
            />
            <div className="rules-card relative p-6 md:p-8">
              <div className="text-center">
                <h3 className="rules-title serif font-bold">{t("rank_rules_title")}</h3>
              </div>
              <div className="rules-list flex flex-col gap-[5vh]">
                {[
                  [t("rank_rule_1"), t("rank_rule_2"), t("rank_rule_3")],
                  [t("rank_rule_4"), t("rank_rule_5"), t("rank_rule_6"), t("rank_rule_7")],
                ].map((row, rowIdx) => (
                  <ul
                    key={rowIdx}
                    className="flex flex-wrap justify-center gap-4"
                  >
                    {row.map((r) => {
                      const [pts, ...rest] = r.split(" · ");
                      const text = rest.join(" · ").replace(/\bacertar\s+/gi, "");
                      return (
                        <li
                          key={r}
                          className="rules-item text-ink text-center basis-[calc(50%-0.5rem)] md:basis-[calc(25%-0.75rem)] grow-0 shrink-0 rounded-2xl px-4 py-4 bg-[color-mix(in_oklab,var(--input)_35%,transparent)]"
                        >
                          <h3 className="rules-pts serif font-bold leading-none">{pts}</h3>
                          <p className="rules-text mt-2 flex items-center justify-center gap-2 text-ink/85">
                            <Check className="h-4 w-4 text-primary shrink-0" aria-hidden />
                            <span>{text}</span>
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ))}
              </div>
            </div>
          </div>
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
  const openLegal = (tab: LegalTab) => {
    setLegalTab(tab);
    setLegalOpen(true);
  };

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
        <Packs onBuy={handleBuy} />
        <Ranking onCta={handleHeaderCta} />
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

      <LegalModal
        open={legalOpen}
        onOpenChange={setLegalOpen}
        tab={legalTab}
        onTabChange={setLegalTab}
      />
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
