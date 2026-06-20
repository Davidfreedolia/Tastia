-- Tastia · 0010 — Seed de vinos reales + notas de cata (§5.6a / FR-12/13)
-- Catálogo de 12 vinos españoles REALES de catálogo público (web), para la demo. NO es la
-- tarifa privada del distribuidor (esa se cargará luego con scripts/import-wines.mjs).
--
-- Precios (§5.6a, copy honesto → orientativos): PVP medio de tiendas online a 2026-06.
--   bottle_price_cents = PVP × 100
--   cost_cents         = round(PVP × 100 × 0.40)   (PVP − 60%)
-- price_band según rangos de los packs (migración 0003): básico ≤25€, normal 25–40€, premium >40€.
-- wine_type / classification: SIEMPRE miembros de WINE_TAXONOMY (src/lib/taxonomy.ts, §5.7).
--
-- El JUEGO NO usa estos datos aún (sigue sobre DEMO_WINES); servirlos sin la respuesta +
-- scoring en backend + cablear el juego es §5.6b.
--
-- Idempotente: `on conflict (sku) do nothing` en wines y `on conflict (wine_id) do nothing`
-- en tasting_notes (PK = wine_id) → reaplicar no duplica.
--
-- Fuentes (catálogo público, precios y notas orientativos a 2026-06):
--   Honoro Vera Monastrell ........ tomevinos.com, vinissimus.com
--   Ramón Bilbao Crianza .......... vinissimus.com, tomevinos.com, idealo.es
--   Protos Roble .................. vinissimus.com, bodegasprotos.com
--   Marqués de Murrieta Reserva ... vinosyaguardientes.com, unvino.es
--   Viña Tondonia Gran Reserva .... wine-searcher.com, lopezdeheredia.com
--   Marqués de Cáceres Verdejo .... elcorteingles.es, bodeboca.com
--   Naia Verdejo .................. taninowines.com, devinoavino.es
--   Pazo de Señorans Albariño ..... carrefour.es, bebevino.es
--   Mar de Frades Albariño ........ vinissimus.com, bebevino.es
--   Pago de Cirsus Rosé Gran Cuvée  elcorteingles.es, quierovinos.com
--   Juvé y Camps Reserva Familia .. shop.juveycamps.com, decanter.com
--   Raventós i Blanc Blanc de Blancs wine-searcher.com, raventos.com

-- ========== Vinos ==========
insert into wines
  (sku, name, bodega, region_es, region_en, grape, vintage,
   wine_type, classification, bottle_price_cents, cost_cents, price_band, active)
values
  ('TAS-W-HONOROVERA',  'Honoro Vera Monastrell',          'Bodegas Juan Gil',        'Jumilla',           'Jumilla',           'Monastrell',                       2023, 'tinto',    'joven',        700,  280,  'basico',  true),
  ('TAS-W-RB-CRIANZA',  'Ramón Bilbao Crianza',            'Bodegas Ramón Bilbao',    'Rioja',             'Rioja',             'Tempranillo',                      2020, 'tinto',    'crianza',     1030,  412,  'basico',  true),
  ('TAS-W-PROTOS-RBL',  'Protos Roble',                    'Bodegas Protos',          'Ribera del Duero',  'Ribera del Duero',  'Tempranillo',                      2023, 'tinto',    'roble',        950,  380,  'basico',  true),
  ('TAS-W-MURRIETA-RV', 'Marqués de Murrieta Reserva',     'Marqués de Murrieta',     'Rioja',             'Rioja',             'Tempranillo, Garnacha, Mazuelo',   2017, 'tinto',    'reserva',     2450,  980,  'basico',  true),
  ('TAS-W-TONDONIA-GR', 'Viña Tondonia Gran Reserva',      'R. López de Heredia',     'Rioja',             'Rioja',             'Tempranillo, Garnacho, Mazuelo',   2012, 'tinto',    'gran reserva',8000, 3200,  'premium', true),
  ('TAS-W-MC-VERDEJO',  'Marqués de Cáceres Verdejo',      'Marqués de Cáceres',      'Rueda',             'Rueda',             'Verdejo',                          2023, 'blanco',   'joven',        500,  200,  'basico',  true),
  ('TAS-W-NAIA-VERD',   'Naia Verdejo',                    'Bodegas Naia',            'Rueda',             'Rueda',             'Verdejo',                          2024, 'blanco',   'sobre lías',   885,  354,  'basico',  true),
  ('TAS-W-SENORANS',    'Pazo de Señorans Albariño',       'Pazo de Señorans',        'Rías Baixas',       'Rías Baixas',       'Albariño',                         2024, 'blanco',   'sobre lías',  1480,  592,  'basico',  true),
  ('TAS-W-MARFRADES',   'Mar de Frades Albariño',          'Mar de Frades',           'Rías Baixas',       'Rías Baixas',       'Albariño',                         2024, 'blanco',   'depósito inerte',1705,682, 'basico',  true),
  ('TAS-W-CIRSUS-ROSE', 'Pago de Cirsus Rosé Gran Cuvée',  'Pago de Cirsus',          'Navarra',           'Navarra',           'Garnacha',                         2024, 'rosado',   'roble',        800,  320,  'basico',  true),
  ('TAS-W-JUVE-RF',     'Juvé y Camps Reserva de la Familia','Juvé y Camps',          'Cava',              'Cava',              'Macabeo, Xarel·lo, Parellada',     2019, 'cava',     'brut nature', 1890,  756,  'basico',  true),
  ('TAS-W-RAVENTOS-BB', 'Raventós i Blanc Blanc de Blancs','Raventós i Blanc',        'Conca del Riu Anoia','Conca del Riu Anoia','Macabeo, Xarel·lo, Parellada',    2022, 'espumoso', 'blanco',      3000, 1200,  'normal',  true)
on conflict (sku) do nothing;

-- ========== Notas de cata (ES) — 1:1 con el vino (PK = wine_id) ==========
-- Notas breves y plausibles, fieles al estilo de cada vino (vista/nariz/boca + curiosidad).
-- `select ... from wines where sku = ...` enlaza por SKU; `on conflict (wine_id) do nothing` → idempotente.

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Rojo picota intenso con ribete violáceo.',
  'Fruta negra y roja madura, toques de violeta y un fondo mentolado.',
  'Potente y carnoso, con buena concentración frutal y un punto mineral.',
  'Monastrell de secano sobre suelos calizos y pobres, sin riego: enorme relación calidad-precio.'
from wines where sku = 'TAS-W-HONOROVERA'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Rojo granate de capa media, limpio y brillante.',
  'Fruta negra (mora, zarzamora), regaliz y dulces de crianza (vainilla, canela).',
  'Intenso, de acidez y cuerpo medios, con taninos bien integrados.',
  'El Rioja crianza de manual: 100% Tempranillo con paso por barrica de roble americano.'
from wines where sku = 'TAS-W-RB-CRIANZA'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Rojo cereza con ribete púrpura, limpio y brillante.',
  'Expresivo y potente: fruta fresca, bayas rojas y especias dulces.',
  'Sabroso y afrutado, con notas tostadas y taninos redondos.',
  'Roble joven de Ribera del Duero: 100% Tempranillo con unos meses en barrica americana.'
from wines where sku = 'TAS-W-PROTOS-RBL'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Rojo cereza picota de capa media.',
  'Frutos rojos maduros y notas especiadas, con elegante fondo de crianza.',
  'Elegante y profundo, equilibrado, de tanino redondo y larga persistencia.',
  'Coupage clásico de Rioja (Tempranillo con Garnacha y Mazuelo) con larga crianza en barrica.'
from wines where sku = 'TAS-W-MURRIETA-RV'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Rojo rubí evolucionado, con reflejos teja hacia el ribete.',
  'Compleja y tradicional: fruta seca, vainilla, especias dulces y notas balsámicas.',
  'Ligero y fresco en textura, muy seco y elegante, de tanino fino y final larguísimo.',
  'Ícono del Rioja tradicional: crianzas muy largas en barrica vieja antes de salir al mercado.'
from wines where sku = 'TAS-W-TONDONIA-GR'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Amarillo pajizo con reflejos verdosos, muy brillante.',
  'Muy varietal: anís y heno fresco del Verdejo, cítricos y flores silvestres.',
  'Buen ataque y amplitud, fruta viva y un fino toque amargo de pomelo.',
  'Verdejo joven de Rueda servido bien frío (7–10 °C): el blanco de aperitivo por excelencia.'
from wines where sku = 'TAS-W-MC-VERDEJO'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Amarillo pajizo limpio y brillante.',
  'Manzana verde y pera madura, fondo cítrico (pomelo, lima) y toque herbáceo.',
  'Fresco y sabroso, de entrada ligera y paso untuoso, con final ligeramente amargo.',
  'Verdejo con 4 meses sobre lías finas en acero: untuosidad sin perder frescor varietal.'
from wines where sku = 'TAS-W-NAIA-VERD'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Amarillo pálido con reflejos verdosos, brillante.',
  'Intensamente aromático: fruta blanca (manzana, pera), cítricos y toques florales.',
  'Vivo y fresco, de acidez equilibrada que realza la fruta.',
  'Albariño atlántico con crianza sobre lías: salino y longevo, sorprende a quien espera tinto.'
from wines where sku = 'TAS-W-SENORANS'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Amarillo limón con vislumbres dorados y reflejo verde.',
  'Fruta de pepita (manzana verde, pera blanquilla) con delicado fondo floral.',
  'Recorrido garboso y fresco, con final salino y notas minerales.',
  'Albariño 100% de Rías Baixas con elegantes recuerdos marinos; la botella vira de color al frío.'
from wines where sku = 'TAS-W-MARFRADES'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Rosa pálido con tonos fucsia.',
  'Fresa y frutos rojos, flores blancas y un sutil toque de vainilla del roble.',
  'Ligero y equilibrado, con buena tensión entre suavidad y acidez.',
  'Rosado de Navarra con fermentación en barrica de roble francés: más gastronómico que el rosado de aperitivo.'
from wines where sku = 'TAS-W-CIRSUS-ROSE'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Amarillo dorado pálido con burbuja fina y persistente.',
  'Fruta blanca madura (manzana, pera), cítricos y leves notas de pan tostado.',
  'Noble y amplio, fresco, con burbuja delicada y final de fruta madura.',
  'Cava Gran Reserva Brut Nature (sin azúcar añadido) con 36 meses de crianza: la trilogía Macabeo-Xarel·lo-Parellada.'
from wines where sku = 'TAS-W-JUVE-RF'
on conflict (wine_id) do nothing;

insert into tasting_notes (wine_id, vista_es, nariz_es, boca_es, curiosidad_es)
select id,
  'Amarillo pálido con reflejos dorados y burbuja muy fina.',
  'Cítricos confitados (limón, pomelo rosa), flores blancas, anís y un fondo mineral.',
  'Volumen y equilibrio, con frescura y un final largo y mineral.',
  'Espumoso de método tradicional: la familia Raventós dejó la D.O. Cava en 2012 por su propia Conca del Riu Anoia.'
from wines where sku = 'TAS-W-RAVENTOS-BB'
on conflict (wine_id) do nothing;
