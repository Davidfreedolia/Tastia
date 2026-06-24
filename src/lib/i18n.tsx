import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

type Dict = Record<string, { es: string; en: string }>;

export const strings = {
  nav_packs: { es: "Packs", en: "Packs" },
  nav_how: { es: "Cómo funciona", en: "How it works" },
  nav_ranking: { es: "Ranking", en: "Ranking" },
  nav_cta: { es: "Elegir mi pack", en: "Choose my pack" },

  hero_video_caption: { es: "60 segundos de cata", en: "60 seconds of tasting" },
  hero_play: { es: "Ver experiencia", en: "Watch experience" },

  hero_h1_line1: { es: "Catas de vino con tus amigos y un sommelier IA.", en: "Wine tastings with your friends and an AI sommelier." },
  hero_h1_line2: { es: "Sin protocolos, sin tonterías.", en: "No protocols, no fuss." },
  hero_sub: {
    es: "Pides tu pack, te llega a casa, escaneáis un QR y un sommelier con voz y cara os guía en una cata a ciegas. Sin registros, sin exámenes, sin tonterías.",
    en: "Order your pack, it arrives home, you scan a QR, and a sommelier with a face and voice guides you through a blind tasting. No sign-ups, no exams, no nonsense.",
  },
  hero_cta: { es: "Elige tu pack", en: "Choose your pack" },
  hero_micro: {
    es: "Pago en 1 clic · Sin cuenta · Recibo por email",
    en: "1-click payment · No account · Email receipt",
  },
  hero_badge_live: { es: "EN DIRECTO", en: "LIVE" },
  hero_badge_speaking: { es: "Sommelier hablando…", en: "Sommelier speaking…" },

  how_title: { es: "Cómo funciona", en: "How it works" },
  how_sub: {
    es: "Cuatro pasos, cero fricción.",
    en: "Four steps, zero friction.",
  },
  how_1_t: { es: "Cómpralo", en: "Buy it" },
  how_1_d: { es: "1 clic, sin registro.", en: "1 click, no sign-up." },
  how_2_t: { es: "Recíbelo en casa", en: "Get it at home" },
  how_2_d: {
    es: "4 vinos, fundas de cata, QRs de acceso y sacacorchos.* *Sólo en primeros pedidos.",
    en: "4 wines, tasting sleeves, access QRs and a corkscrew.* *First orders only.",
  },
  how_3_t: { es: "Escanea los QR", en: "Scan the QRs" },
  how_3_d: {
    es: "Acceso directo, sin instalar nada.",
    en: "Direct access, nothing to install.",
  },
  how_4_t: { es: "¡Empieza la cata!", en: "Start the tasting!" },
  how_4_d: {
    es: "El sommelier IA os guía en directo.",
    en: "The AI sommelier hosts you live.",
  },
  how_no_signup: { es: "Sin registros", en: "No sign-ups" },

  friends_tag: { es: "Cata en grupo", en: "Group tasting" },
  friends_title: { es: "El vino con amigos, sin barreras", en: "Wine with friends, no barriers" },
  friends_desc: {
    es: "Hasta 8 jugadores en la misma sala, desde casa o incluso en remoto. El sommelier de IA guía la cata a ciegas, con apuestas, puntuaciones y ranking en tiempo real.",
    en: "Up to 8 players in the same room, from home or even remotely. The AI sommelier hosts the blind tasting with bets, scores and a live ranking.",
  },
  friends_item_1: {
    es: "Hasta 8 jugadores en la misma sala, desde casa o incluso en remoto",
    en: "Up to 8 players in the same room, from home or even remotely",
  },
  friends_item_2: {
    es: "El sommelier IA guía la cata",
    en: "The AI sommelier hosts the tasting",
  },
  friends_item_3: {
    es: "Apuestas, puntuaciones y ranking en tiempo real",
    en: "Bets, scores and live ranking",
  },

  packs_title: { es: "Elige tu pack", en: "Choose your pack" },
  packs_sub: {
    es: "Todos incluyen la cata online con el sommelier de IA. Envío a península.",
    en: "All include the online tasting with the AI sommelier. Shipping within mainland Spain.",
  },
  packs_popular: { es: "Más elegido", en: "Most popular" },
  packs_buy: { es: "Comprar", en: "Buy" },
  packs_from: { es: "Desde", en: "From" },
  packs_soon: {
    es: "Los primeros 100 pedidos recibirán un sacacorchos profesional Coravin.",
    en: "The first 100 orders will receive a professional Coravin corkscrew.",
  },

  pack1_name: { es: "Winelover", en: "Winelover" },
  pack1_tag: { es: "Perfecto para iniciarse", en: "Perfect to get started" },
  pack1_price: { es: "80€", en: "€80" },
  pack1_inc: {
    es: "4 vinos (10-25€/botella), fundas para cata a ciegas, acceso a la cata online, QR de instrucciones, sacacorchos (solo 1er pedido).",
    en: "4 wines (€10-25/bottle), blind-tasting sleeves, online tasting access, instructions QR, corkscrew (first order only).",
  },
  pack1_long: {
    es: "Cuatro vinos accesibles y muy distintos entre sí para que las diferencias salten a la copa, sin tecnicismos.",
    en: "Four accessible wines, very different from each other, so the contrasts jump out in the glass — no jargon.",
  },
  pack1_features: {
    es: "4 vinos gama media (10-25€)|Fundas opacas numeradas|2 QRs de acceso (sala de cata y app del jugador)|Cata online con sommelier IA",
    en: "4 mid-range wines (€10-25)|Numbered opaque sleeves|2 access QRs (tasting room and player app)|Online tasting with AI sommelier",
  },

  pack2_name: { es: "Enology", en: "Enology" },
  pack2_tag: { es: "El salto de nivel", en: "The level-up" },
  pack2_price: { es: "120€", en: "€120" },
  pack2_inc: {
    es: "4 vinos (25-40€/botella) + todo lo anterior.",
    en: "4 wines (€25-40/bottle) + everything above.",
  },
  pack2_long: {
    es: "El listón sube con una selección de vinos de calidad reconocida, que convertirán la cata en una verdadera masterclass.",
    en: "The bar rises with a selection of wines of recognised quality that will turn the tasting into a true masterclass.",
  },
  pack2_features: {
    es: "4 vinos gama media-alta (25-40€)|Fundas opacas numeradas|2 QRs de acceso (sala de cata y app del jugador)|Cata online con sommelier IA",
    en: "4 mid-to-high-range wines (€25-40)|Numbered opaque sleeves|2 access QRs (tasting room and player app)|Online tasting with AI sommelier",
  },

  pack3_name: { es: "Deluxe", en: "Deluxe" },
  pack3_tag: {
    es: "Los mimados del viñedo",
    en: "The vineyard's darlings",
  },
  pack3_price: { es: "160€", en: "€160" },
  pack3_inc: {
    es: "4 vinos premium (>40€/botella) + todo lo anterior.",
    en: "4 premium wines (>€40/bottle) + everything above.",
  },
  pack3_long: {
    es: "Vinos de autor hechos para disfrutar. Bodegas de prestigio y ediciones especiales conseguirán un rato inolvidable.",
    en: "Signature wines made to be enjoyed. Prestige wineries and special editions for an unforgettable evening.",
  },
  pack3_features: {
    es: "4 vinos de autor (>40€)|Fundas opacas numeradas|2 QRs de acceso (sala de cata y app del jugador)|Cata online con sommelier IA",
    en: "4 signature wines (>€40)|Numbered opaque sleeves|2 access QRs (tasting room and player app)|Online tasting with AI sommelier",
  },


  why_title: { es: "Por qué engancha", en: "Why it hooks you" },
  why_1_t: {
    es: "Sommelier basado en IA",
    en: "AI-powered sommelier",
  },
  why_1_d: {
    es: "Un experto en vinos os acompañará a lo largo de la cata, adaptándose a vuestro nivel con un punto ácido.",
    en: "A wine expert hosts the tasting, adapts to your level and teases you a little.",
  },
  why_2_t: { es: "No es sólo un juego.", en: "It's not just a game." },
  why_2_d: {
    es: "Apuestas de cata, puntuaciones y ranking en vivo.",
    en: "Tasting bets, scores and a live ranking.",
  },
  why_3_t: { es: "Experiencia de cata a ciegas real", en: "A real blind tasting experience" },
  why_3_d: {
    es: "Las reglas se basan en la misma normativa que emplean los profesionales del sector.",
    en: "The rules follow the same standards used by industry professionals.",
  },

  modal_title: {
    es: "Próximamente: pago con Stripe",
    en: "Coming soon: payment with Stripe",
  },
  modal_body: {
    es: "Estamos puliendo el checkout. Déjanos un email y te avisamos en cuanto puedas reservar tu pack.",
    en: "We're polishing checkout. Leave us an email and we'll let you know the moment you can reserve your pack.",
  },
  modal_close: { es: "Cerrar", en: "Close" },

  // Cart
  cart_title: { es: "Tu cata", en: "Your tasting" },
  cart_subtitle: { es: "Sin salir de la web · Pago seguro", en: "Without leaving the page · Secure checkout" },
  cart_empty: { es: "Tu carrito está vacío", en: "Your cart is empty" },
  cart_empty_hint: { es: "Elige un pack para empezar la cata.", en: "Pick a pack to start the tasting." },
  cart_qty: { es: "Cantidad", en: "Quantity" },
  cart_remove: { es: "Quitar", en: "Remove" },
  cart_subtotal: { es: "Subtotal", en: "Subtotal" },
  cart_shipping: { es: "Envío", en: "Shipping" },
  cart_shipping_free: { es: "Gratis", en: "Free" },
  cart_total: { es: "Total", en: "Total" },
  cart_checkout_title: { es: "Datos de envío", en: "Shipping details" },
  cart_name: { es: "Nombre completo", en: "Full name" },
  cart_email: { es: "Email", en: "Email" },
  cart_address: { es: "Dirección", en: "Address" },
  cart_city: { es: "Ciudad", en: "City" },
  cart_zip: { es: "Código postal", en: "Postal code" },
  cart_pay: { es: "Pagar", en: "Pay" },
  cart_pay_secure: { es: "Pago seguro · Sin abandonar la web", en: "Secure payment · Never leave this page" },
  cart_open: { es: "Ver carrito", en: "View cart" },
  // Stripe checkout — honest states (§Stripe-A)
  cart_soon_title: { es: "Próximamente: pago con Stripe", en: "Coming soon: payment with Stripe" },
  cart_soon_body: {
    es: "El pago con tarjeta aún no está activo. No se ha realizado ningún cobro ni reserva. Vuelve pronto.",
    en: "Card payment isn't live yet. No charge or order was made. Come back soon.",
  },
  cart_soon_close: { es: "Entendido", en: "Got it" },
  cart_pay_error: {
    es: "No se pudo iniciar el pago. Inténtalo de nuevo.",
    en: "We couldn't start the payment. Please try again.",
  },
  checkout_test_title: { es: "Pago de prueba recibido", en: "Test payment received" },
  checkout_test_body: {
    es: "Era un pago en modo de prueba de Stripe: no se ha cobrado dinero real ni se ha creado un pedido todavía.",
    en: "This was a Stripe test-mode payment: no real money was charged and no order has been created yet.",
  },
  checkout_test_close: { es: "Cerrar", en: "Close" },

  trust_pay: { es: "Pago seguro con Stripe", en: "Secure payment with Stripe" },
  trust_ship: { es: "Envío a península.", en: "Shipping within mainland Spain." },
  link_contact: { es: "Contacto", en: "Contact" },
  link_terms: { es: "Términos y condiciones", en: "Terms & conditions" },
  link_privacy: { es: "Política de privacidad", en: "Privacy policy" },
  link_cookies: { es: "Política de cookies", en: "Cookie policy" },
  link_legal: { es: "Aviso legal", en: "Legal notice" },
  link_shipping: { es: "Envíos y devoluciones", en: "Shipping & returns" },
  footer_rights: {
    es: "© 2026 TastIA.",
    en: "© 2026 TastIA.",
  },
  footer_age_warning: {
    es: "La venta de bebidas alcohólicas está prohibida a menores de 18 años (Ley 17/2022 y Ley 5/2002). El consumo excesivo es perjudicial para la salud. Bebe con moderación.",
    en: "The sale of alcoholic beverages is forbidden to under-18s (Law 17/2022 and Law 5/2002). Excessive consumption is harmful to health. Drink responsibly.",
  },
  footer_company: {
    es: "NCH Grupo 4 · hola@tastia.org",
    en: "NCH Grupo 4 · hola@tastia.org",
  },

  age_title: { es: "¿Eres mayor de 18 años?", en: "Are you over 18?" },
  age_body: {
    es: "Tastia vende bebidas alcohólicas. Para entrar en la web necesitamos confirmar que tienes la edad legal para consumir alcohol en tu país.",
    en: "Tastia sells alcoholic beverages. To enter the site we need to confirm you are of legal drinking age in your country.",
  },
  age_yes: { es: "Sí, soy mayor de 18", en: "Yes, I'm over 18" },
  age_no: { es: "No, soy menor", en: "No, I'm under age" },
  age_blocked_title: { es: "Lo sentimos", en: "We're sorry" },
  age_blocked_body: {
    es: "Por ley, no podemos mostrarte contenido sobre bebidas alcohólicas si no tienes la edad legal.",
    en: "By law, we can't show you content about alcoholic beverages if you are not of legal age.",
  },

  cart_consent_age: {
    es: "Confirmo que soy mayor de 18 años y que los datos facilitados son correctos.",
    en: "I confirm I am over 18 and that the data provided is correct.",
  },
  cart_consent_terms: {
    es: "He leído y acepto los Términos, la Política de privacidad y el Aviso legal.",
    en: "I have read and accept the Terms, Privacy Policy and Legal Notice.",
  },
  cart_id_notice: {
    es: "En la entrega podrá solicitarse un documento de identidad para verificar la mayoría de edad.",
    en: "ID may be requested on delivery to verify legal age.",
  },

  legal_close: { es: "Cerrar", en: "Close" },
  legal_updated: { es: "Última actualización: junio 2026", en: "Last updated: June 2026" },
  legal_terms_body: {
    es: "1. Objeto. Las presentes condiciones regulan la compra de packs de cata de vino y el acceso al servicio de cata online guiada por sommelier de IA prestado por David Castellà Gil\n\n2. Edad legal. La venta y entrega de productos está reservada a personas mayores de 18 años, de conformidad con la Ley 17/2022 y la Ley 5/2002 de prevención del consumo de bebidas alcohólicas en menores. Al realizar el pedido, el cliente declara bajo su responsabilidad ser mayor de edad. Tastia podrá exigir un documento identificativo en la entrega y rechazar la misma si no se acredita la mayoría de edad.\n\n3. Precio y pago. Los precios incluyen IVA. El pago se realiza online mediante pasarela segura (Stripe). El cargo se efectúa al confirmar el pedido.\n\n4. Envío. Envío a península en 24-72 h laborables. No se realizan envíos a menores ni a personas en evidente estado de embriaguez.\n\n5. Desistimiento. De acuerdo con el art. 103 del RD-Leg. 1/2007, no se admite el desistimiento sobre bebidas selladas que hayan sido abiertas tras la entrega. En el resto de casos, dispones de 14 días naturales escribiendo a hola@tastia.org.\n\n6. Responsabilidad. Tastia no se hace responsable del consumo irresponsable de los productos. El consumo excesivo de alcohol es perjudicial para la salud.\n\n7. Ley aplicable. Estas condiciones se rigen por la ley española. Las partes se someten a los Juzgados y Tribunales del domicilio del consumidor.",
    en: "1. Purpose. These terms govern the purchase of wine tasting packs and access to the AI-sommelier guided online tasting service provided by David Castellà Gil\n\n2. Legal age. Sale and delivery is restricted to persons over 18. By placing the order, the customer declares to be of legal age. Tastia may request ID on delivery and refuse delivery if legal age cannot be proven.\n\n3. Price & payment. Prices include VAT. Payment is processed online through a secure gateway (Stripe).\n\n4. Shipping. Mainland Spain delivery within 24-72 working hours. We do not deliver to minors or visibly intoxicated persons.\n\n5. Withdrawal. Under art. 103 RD-Leg. 1/2007, withdrawal is not accepted for sealed beverages opened after delivery. Otherwise you have 14 calendar days by writing to hola@tastia.org.\n\n6. Liability. Tastia is not liable for irresponsible consumption. Excessive alcohol consumption is harmful to health.\n\n7. Governing law. Spanish law applies.",
  },
  legal_privacy_body: {
    es: "Responsable: David Castellà Gil, NIF N52626358, C/ Exemple 1, 08001 Barcelona. Contacto: hola@tastia.org.\n\nDatos tratados: nombre, email, dirección de envío, datos de pago (procesados por Stripe) e interacciones con la cata.\n\nFinalidad: gestionar tu pedido, entregar el pack, prestar el servicio de cata online y enviar comunicaciones sobre tu pedido. Con tu consentimiento expreso, novedades.\n\nBase jurídica: ejecución del contrato, obligaciones legales y consentimiento.\n\nDestinatarios: proveedores de pago (Stripe), logística y email transaccional. No vendemos tus datos.\n\nConservación: el tiempo necesario y los plazos legales (6 años fiscales).\n\nDerechos: acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a hola@tastia.org. Reclamación ante la AEPD (www.aepd.es).",
    en: "Controller: David Castellà Gil, VAT N52626358, C/ Exemple 1, 08001 Barcelona. Contact: hola@tastia.org.\n\nData processed: name, email, shipping address, payment data (processed by Stripe) and tasting interactions.\n\nPurpose: manage your order, deliver the pack, provide the online tasting and send order communications. With your express consent, updates.\n\nLegal basis: contract performance, legal obligations and consent.\n\nRecipients: payment providers (Stripe), logistics and transactional email. We do not sell your data.\n\nRetention: as long as necessary and legal terms (6 fiscal years).\n\nRights: access, rectify, erase, object, restrict and port by writing to hola@tastia.org. Complaints to AEPD (www.aepd.es).",
  },
  legal_cookies_body: {
    es: "Tastia usa cookies técnicas estrictamente necesarias para el funcionamiento de la web (idioma, carrito, sesión). Estas cookies no requieren consentimiento.\n\nCon tu consentimiento previo podemos usar cookies analíticas anónimas y de pasarela de pago. No usamos cookies publicitarias de terceros.\n\nPuedes gestionar o eliminar las cookies desde la configuración de tu navegador en cualquier momento.",
    en: "Tastia uses strictly necessary technical cookies (language, cart, session). These do not require consent.\n\nWith your prior consent we may use anonymous analytics and payment gateway cookies. We do not use third-party advertising cookies.\n\nYou can manage or delete cookies from your browser settings at any time.",
  },
  legal_legal_body: {
    es: "Titular: David Castellà Gil · NIF: N52626358 · Domicilio: C/ Exemple 1, 08001 Barcelona · Email: hola@tastia.org · Inscrita en el Registro Mercantil de Barcelona.\n\nLa venta de bebidas alcohólicas a menores de 18 años está prohibida (Ley 17/2022, Ley 5/2002 y normativa autonómica aplicable). El consumo abusivo de alcohol es perjudicial para la salud.\n\nResolución de litigios en línea: plataforma de la Comisión Europea en https://ec.europa.eu/consumers/odr.",
    en: "Owner: David Castellà Gil · VAT: N52626358 · Address: C/ Exemple 1, 08001 Barcelona · Email: hola@tastia.org · Registered with the Barcelona Commercial Registry.\n\nThe sale of alcoholic beverages to minors under 18 is prohibited. Excessive alcohol consumption is harmful to health.\n\nOnline dispute resolution: European Commission platform at https://ec.europa.eu/consumers/odr.",
  },
  legal_shipping_body: {
    es: "Envíos a España península en 24-72 h laborables. Baleares 3-5 días. No enviamos a Canarias, Ceuta y Melilla por la normativa de productos alcohólicos.\n\nEn la entrega podrá solicitarse DNI o documento equivalente para verificar la mayoría de edad. Si el destinatario no acredita ser mayor de 18 años, el pedido será devuelto y se reembolsará el importe menos los gastos logísticos.\n\nDevoluciones: 14 días naturales desde la entrega, siempre que los productos no hayan sido abiertos ni desprecintados (art. 103 RD-Leg. 1/2007).",
    en: "Mainland Spain delivery within 24-72 working hours. Balearics 3-5 days. We do not ship to Canary Islands, Ceuta or Melilla due to alcohol regulations.\n\nID may be requested on delivery to verify legal age. If the recipient cannot prove being over 18, the order will be returned and refunded minus logistics costs.\n\nReturns: 14 calendar days from delivery, provided products have not been opened or unsealed.",
  },

  // Marquee strip
  strip_1: { es: "Cata a ciegas", en: "Blind tasting" },
  strip_2: { es: "Sin registros", en: "No sign-ups" },
  strip_3: { es: "Sommelier IA en directo", en: "Live AI sommelier" },
  strip_4: { es: "Pago en 1 clic", en: "1-click payment" },
  strip_5: { es: "Envío 48h", en: "48h shipping" },
  strip_6: { es: "Ranking en vivo", en: "Live leaderboard" },

  // Gallery section
  gallery_title: { es: "Lo que llega a casa", en: "What arrives at home" },
  gallery_sub: {
    es: "Un pack pensado para que solo tengáis que descorchar, escanear y pasarlo bien.",
    en: "A pack designed so all you have to do is uncork, scan, and have fun.",
  },
  gallery_1_t: { es: "El pack", en: "The pack" },
  gallery_1_d: {
    es: "4 vinos en fundas opacas, sacacorchos, QR y una tarjeta con instrucciones.",
    en: "4 wines in opaque sleeves, corkscrew, QR and an instructions card.",
  },
  gallery_2_t: { es: "Un QR, cero apps", en: "One QR, zero apps" },
  gallery_2_d: {
    es: "Escaneáis, entráis a la sala y empieza la cata. Funciona en cualquier móvil.",
    en: "Scan it, jump in the room and the tasting starts. Works on any phone.",
  },
  gallery_3_t: { es: "Con vuestra gente", en: "With your people" },
  gallery_3_d: {
    es: "Hasta 8 personas en la misma sala, en casa o entre ciudades.",
    en: "Up to 8 people in the same room, at home or between cities.",
  },

  // Ranking section
  rank_eyebrow: { es: "Ranking mensual · Premios reales", en: "Monthly ranking · Real prizes" },
  rank_title: {
    es: "El ranking de TastIA",
    en: "TastIA's ranking",
  },
  rank_sub: {
    es: "Vuestra cata suma puntos con premios asegurados. Cada mes, coronamos al TastIA Top 3 con espectaculares premios. Pero no será fácil… Tendréis que convertiros en verdaderos expertos del vino para haceros con ellos. ¡Buena cata!",
    en: "Every tasting adds points with guaranteed prizes. Each month we crown the TastIA Top 3 with spectacular rewards. But it won't be easy… You'll have to become true wine experts to claim them. Happy tasting!",
  },
  rank_month: { es: "Junio 2026 · en curso", en: "June 2026 · in progress" },
  rank_days_left: { es: "días restantes", en: "days left" },
  rank_p1_name: { es: "Lucía M.", en: "Lucía M." },
  rank_p1_city: { es: "Barcelona", en: "Barcelona" },
  rank_p1_prize: { es: "Pack Deluxe + caja de 6 botellas D.O.Ca. Rioja", en: "Deluxe Pack + 6-bottle D.O.Ca. Rioja case" },
  rank_p2_name: { es: "Marc V.", en: "Marc V." },
  rank_p2_city: { es: "Madrid", en: "Madrid" },
  rank_p2_prize: { es: "Pack Enology + cena maridaje para 2", en: "Enology Pack + pairing dinner for 2" },
  rank_p3_name: { es: "Aïda R.", en: "Aïda R." },
  rank_p3_city: { es: "València", en: "València" },
  rank_p3_prize: { es: "Pack Winelover + decantador de autor", en: "Winelover Pack + designer decanter" },
  rank_pts: { es: "pts", en: "pts" },
  rank_rules_title: { es: "Cómo se puntúa", en: "How scoring works" },
  rank_rule_1: { es: "+10 pts · Vista", en: "+10 pts · Sight" },
  rank_rule_2: { es: "+10 pts · Nariz", en: "+10 pts · Nose" },
  rank_rule_3: { es: "+10 pts · Gusto", en: "+10 pts · Taste" },
  rank_rule_4: { es: "+20 pts · Variedad de uva", en: "+20 pts · Grape variety" },
  rank_rule_5: { es: "+30 pts · D.O.", en: "+30 pts · Region (D.O.)" },
  rank_rule_6: { es: "+15 pts · Rango de precio", en: "+15 pts · Price range" },
  rank_rule_7: { es: "+25 pts · Rango de añada", en: "+25 pts · Vintage range" },
  rank_cta: { es: "Entrar al ranking", en: "Join the ranking" },
  rank_disclaimer_title: {
    es: "Cada pack jugado cuenta.",
    en: "Every pack played counts.",
  },
  rank_disclaimer_body: {
    es: "Premios enviados en los 7 días siguientes al cierre del mes.",
    en: "Prizes shipped within 7 days of month end.",
  },
} satisfies Dict;


type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof strings) => string };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tastia.lang") as Lang | null;
      if (saved === "es" || saved === "en") {
        setLangState(saved);
        return;
      }
      const nav = typeof navigator !== "undefined" ? navigator.language : "es";
      setLangState(nav.toLowerCase().startsWith("en") ? "en" : "es");
    } catch {
      // ignore
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("tastia.lang", l);
    } catch {
      // ignore
    }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  };

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const t = (k: keyof typeof strings) => strings[k][lang];
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
