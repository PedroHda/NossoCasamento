export interface PriceOffer {
  model: string;
  store: string;
  amount: number;
  url: string;
  condition: string;
}
export interface ResearchedItem {
  key: string;
  name: string;
  aliases: string[];
  quantity: number;
  room: string;
  category: string;
  reference: string;
  notes: string;
  offers: PriceOffer[];
}
export const HOUSEHOLD_RESEARCH_ID = "casa-2026-11-26";
export const HOUSEHOLD_RESEARCH_DATE = "2026-11-26";
const havan = (category: string) => `https://www.havan.com.br/${category}/`;
const offer = (
  model: string,
  amount: number,
  url: string,
  store = "Havan",
  condition = "Preço anunciado; confirmar variante e estoque.",
): PriceOffer => ({ model, amount, url, store, condition });
const ml = (
  model: string,
  amount: number,
  url: string,
  condition = "Preço anunciado consultado no índice de busca; conferir vendedor, estoque e tensão.",
) => offer(model, amount, url, "Mercado Livre", condition);
const blender = havan("eletro/eletroportateis/liquidificadores");
const mixer = havan("eletro/eletroportateis/mixers");
const beater = havan("eletro/eletroportateis/batedeiras");
const iron = havan("eletro/eletroportateis/ferros");
const microwave = havan("eletro/eletrodomesticos/micro-ondas");
const oven = havan("eletro/eletrodomesticos/fornos-de-bancada");
const rug = havan("decoracao/tapetes/tapete-para-quarto-e-sala");
const furniture = "https://www.artevelha.com.br/armarios-e-cristaleiras";
const ac =
  "https://www.midea.com.br/produtos-conectados?facets=productclusterids%2Cfuzzy%2Coperator&fuzzy=0&operator=and&page=2&productclusterids=174&sort=score_desc";

export const HOUSEHOLD_RESEARCH: ResearchedItem[] = [
  {
    key: "liquidificador",
    name: "Liquidificador",
    aliases: ["liquidificador"],
    quantity: 1,
    room: "Cozinha",
    category: "Eletroportáteis",
    reference: "Copo de 2,3 a 3,3 L; procurar a versão 220 V.",
    notes:
      "Referência de uso doméstico, sem liquidificador portátil ou profissional.",
    offers: [
      offer("Oster OLIQ450", 229.9, blender),
      offer("Arno LN66", 299.9, blender),
      offer("Britânia BLQ14A", 329.9, blender),
    ],
  },
  {
    key: "batedeira",
    name: "Batedeira",
    aliases: ["batedeira"],
    quantity: 1,
    room: "Cozinha",
    category: "Eletroportáteis",
    reference: "Batedeira comum com base, 500–550 W, 220 V.",
    notes:
      "Não é planetária. Modelos planetários da mesma pesquisa estavam próximos de R$ 500–550 e não entram nesta média.",
    offers: [
      offer("Philco Paris Duo 500 W", 229.9, beater),
      offer("Philco Crome Case 550 W", 219.9, beater),
      offer("Britânia Pérola 550", 199.9, beater),
    ],
  },
  {
    key: "ferro",
    name: "Ferro de passar",
    aliases: ["ferro de passar", "ferro passar"],
    quantity: 1,
    room: "Lavanderia",
    category: "Eletroportáteis",
    reference: "Ferro a vapor doméstico, 220 V.",
    notes: "Sem estação de vapor profissional.",
    offers: [
      offer("Black+Decker FX2250", 129.9, iron),
      offer("Klicke a vapor", 179.9, iron),
      offer("Electrolux ESI51", 199.9, iron),
    ],
  },
  {
    key: "microondas",
    name: "Micro-ondas",
    aliases: ["micro ondas", "microondas"],
    quantity: 1,
    room: "Cozinha",
    category: "Eletrodomésticos",
    reference: "Modelo de bancada, 28–32 L, 220 V.",
    notes: "Não inclui modelos de embutir.",
    offers: [
      offer("Philco PMO31E 28 L", 799.9, microwave),
      offer("LG MS3043BR 30 L", 749.9, microwave),
      offer("Consul CMS46AR 32 L", 699.9, microwave),
    ],
  },
  {
    key: "filtro",
    name: "Filtro de água / purificador",
    aliases: ["filtro de agua", "purificador", "purificador de agua"],
    quantity: 1,
    room: "Cozinha",
    category: "Eletrodomésticos",
    reference:
      "Purificador Electrolux PE12, com água natural e gelada, bivolt.",
    notes:
      "A referência inclui refrigeração eletrônica. Filtro simples sem refrigeração custa menos. Refil e instalação não estão incluídos.",
    offers: [
      ml(
        "Electrolux PE12G",
        649.9,
        "https://www.mercadolivre.com.br/purificador-de-agua-gelada-fria-e-natural-eletrico-compacto-eletronico-placa-filtro-refil-6-meses-ou-3000l-painel-touch-bivolt-cinza-pe12g-electrolux/p/MLB24804661",
      ),
      ml(
        "PE12G, oferta Dimm",
        683.99,
        "https://www.mercadolivre.com.br/purificador-de-agua-electrolux-natural-fria-pe12g-dimm/p/MLB45409677",
      ),
      ml(
        "PE12G Pure 4x",
        591.41,
        "https://www.mercadolivre.com.br/purificador-de-agua-electrolux-pe12g-pure-4x-cinza-110v220v/up/MLBU3281546811",
        "Preço à vista anunciado; outros meios: R$ 649,90. Confirmar condições.",
      ),
    ],
  },
  {
    key: "lixeira",
    name: "Lixeira inteligente para banheiro",
    aliases: ["lixeira", "lixeira banheiro"],
    quantity: 1,
    room: "Banheiro",
    category: "Organização",
    reference: "Lixeira de 12 L com abertura por sensor.",
    notes:
      "Pode usar pilhas ou USB, conforme o modelo. Não precisa ser conectada à internet.",
    offers: [
      ml(
        "Vittak 12 L",
        67.9,
        "https://www.mercadolivre.com.br/vittak-lixeira-inteligente-12l-sensor-automatico-banheiro-cozinha-cor-branco-escritorio-comercial-com-pilhas-inclusas/p/MLB63587462",
      ),
      ml(
        "Vie Idéale 12 L",
        78,
        "https://lista.mercadolivre.com.br/lixeira-inteligente-sensor-12l",
      ),
      ml(
        "Tutti 12 L",
        121,
        "https://www.mercadolivre.com.br/lixeira-automatica-com-sensor-cozinha-banheiro-12-litros/up/MLBU4667855023",
      ),
    ],
  },
  {
    key: "cortinas",
    name: "Cortinas — sala, 2 quartos e corredor",
    aliases: ["cortina", "cortinas"],
    quantity: 4,
    room: "Sala e quartos",
    category: "Decoração",
    reference:
      "4 conjuntos de cortina com cerca de 4 m de tecido na largura × 3 m de altura.",
    notes:
      "Um conjunto para a sala, um para cada quarto e um para o corredor. Janela informada: cerca de 1,2 m. A largura do tecido permite franzir; conferir vão, trilho e medida pronta com o vendedor. Amostra de blackout em tecido, com/sem voil. Trilhos, varões e instalação separados.",
    offers: [
      ml(
        "MDM blackout 4 × 3 m",
        259.58,
        "https://produto.mercadolivre.com.br/MLB-5092980020-cortina-blackout-tecido-para-sala-400-largura-x-300-altura-_JM",
        "Pix; outros meios: R$ 273,24.",
      ),
      ml(
        "Doce Lar blackout + voil 4 × 3 m",
        378.16,
        "https://lista.mercadolivre.com.br/cortina-sala-4%2C00-x-3%2C00",
        "À vista; outros meios: R$ 398,06.",
      ),
      ml(
        "GM Decorações blackout + voil 4 × 3 m",
        461.47,
        "https://lista.mercadolivre.com.br/cortina-4m-de-largura-por-3m-de-altura",
      ),
    ],
  },
  {
    key: "forno",
    name: "Forno elétrico",
    aliases: ["forno eletrico"],
    quantity: 1,
    room: "Cozinha",
    category: "Eletrodomésticos",
    reference: "Forno de bancada de 44–50 L, 220 V.",
    notes: "Não inclui embutimento ou instalação elétrica.",
    offers: [
      offer("Philco PFE52P 50 L", 599.9, oven),
      offer("Mueller Sapore 44 L", 699.9, oven),
      offer("Fischer Pop Grill 44 L", 799.9, oven),
    ],
  },
  {
    key: "tapete",
    name: "Tapete",
    aliases: ["tapete"],
    quantity: 1,
    room: "Sala",
    category: "Decoração",
    reference: "Tapete de sala com aproximadamente 1,40 × 2,00 m.",
    notes:
      "Preferir pelo baixo e sem franjas para facilitar a limpeza pelo robô. Confirmar material e altura antes de escolher.",
    offers: [
      offer("Havan Casa Livorno 1,4 × 2 m", 299.9, rug),
      offer("Havan Casa Ibiza 1,4 × 2 m", 449.9, rug),
      offer("Havan Casa Amalfi 1,4 × 2 m", 499.9, rug),
    ],
  },
  {
    key: "mixer",
    name: "Mixer 3 em 1",
    aliases: ["mixer"],
    quantity: 1,
    room: "Cozinha",
    category: "Eletroportáteis",
    reference: "Mixer com triturador e batedor, 220 V.",
    notes: "Sem mini mixer de bebidas e sem misturar modelos 2 em 1 na média.",
    offers: [
      offer("Britânia BMX400P", 199.9, mixer),
      offer("Oster OMIX570", 299.9, mixer),
      offer("Electrolux EIB10", 329.9, mixer),
    ],
  },
  {
    key: "armario",
    name: "Armário de mantimentos — Arte Velha",
    aliases: [
      "armario de compras",
      "armario de mantimentos",
      "armario mantimentos",
      "armario arte velha",
      "armario de madeira",
      "armario madeira macica",
    ],
    quantity: 1,
    room: "Cozinha",
    category: "Móveis",
    reference:
      "Madeira maciça da Arte Velha; amostra de louceiros de 80, 100 e 120 cm.",
    notes:
      "Referência principal: louceiro de 100 cm de largura × 40 cm de profundidade × 200 cm de altura, quatro portas. Preço do modelo 100 cm: R$ 2.257,50 ou R$ 2.144,63 no Pix. A média usa três tamanhos próximos da própria loja. Confirmar estoque, entrega e preço com a unidade de SJC; não é orçamento enviado pela loja.",
    offers: [
      offer(
        "Arte Velha louceiro 80 cm",
        1976.8,
        furniture,
        "Arte Velha",
        "Preço sem desconto Pix.",
      ),
      offer(
        "Arte Velha louceiro 100 cm",
        2257.5,
        "https://www.artevelha.com.br/armario-louceiro-de-madeira-100-cm-com-4-portas",
        "Arte Velha",
        "Preço sem desconto Pix; Pix R$ 2.144,63.",
      ),
      offer(
        "Arte Velha louceiro 120 cm",
        2709,
        furniture,
        "Arte Velha",
        "Preço sem desconto Pix.",
      ),
    ],
  },
  {
    key: "gas",
    name: "Botijão de gás completo P13",
    aliases: ["botijao", "botijao de gas"],
    quantity: 1,
    room: "Cozinha",
    category: "Utilidades",
    reference: "Primeira compra: vasilhame + carga de 13 kg.",
    notes:
      "Não é somente recarga. Referências regionais fora de SJC; confirmar a revenda local. Regulador, mangueira e eventual adaptação do cooktop não estão incluídos.",
    offers: [
      offer(
        "Catapreta P13 completo",
        295,
        "https://www.catapretagas.com.br/pagina/Produtos",
        "Catapreta Gás",
        "Preço anunciado para entrega em Santo André; não é frete para SJC.",
      ),
      offer(
        "Aliggaz casco + carga P13",
        325,
        "https://aliggaz.com/gas-de-cozinha/",
        "Aliggaz",
        "Soma dos preços anunciados: casco R$ 210 + carga R$ 115.",
      ),
    ],
  },
  {
    key: "lustres",
    name: "Lustres modernos de fácil limpeza",
    aliases: ["lustre", "lustres", "plafon", "plafons"],
    quantity: 3,
    room: "Sala e quartos",
    category: "Iluminação",
    reference:
      "3 plafons de sobrepor, cerca de 40 cm, LED e difusor fechado/liso.",
    notes:
      "Escolha de referência para limpeza simples: formato sem cristais, pingentes ou muitas peças. Opções redondas pretas ou amadeiradas. São plafons modernos, não lustres pendentes de cristal; conferir aparência e luminosidade de cada ambiente. Instalação separada.",
    offers: [
      ml(
        "Franci Orbital 40 cm",
        172.79,
        "https://www.mercadolivre.com.br/plafon-led-redondo-de-40cm-preto-com-luz-quente-neutra-e-fria/p/MLB65918696",
      ),
      ml(
        "Azy redondo amadeirado 40 cm",
        186.27,
        "https://lista.mercadolivre.com.br/plafon-redondo-amadeirado",
      ),
      ml(
        "Blumenau Ian 40 cm",
        210,
        "https://lista.mercadolivre.com.br/plafon-redondo-40cm",
      ),
    ],
  },
  {
    key: "robo",
    name: "Robô aspirador com mapeamento",
    aliases: ["robo aspirador", "robo aspirados", "aspirador robo"],
    quantity: 1,
    room: "Casa",
    category: "Limpeza",
    reference:
      "Xiaomi S40 com navegação laser LDS, mapa pelo app e versão para 220 V/bivolt.",
    notes:
      "Base de recarga simples; não inclui estação de esvaziamento automático. Confirmar tensão da fonte, versão regional, garantia e vendedor. Anúncios novos; modelos sem mapeamento e usados foram excluídos.",
    offers: [
      ml(
        "Xiaomi S40 LDS",
        1400.89,
        "https://www.mercadolivre.com.br/robo-aspirador-xiaomi-s40-inteligente-aspira-passa-pano-app-branco/p/MLB62162344",
        "Oferta anunciada com versões 127/220 V e 220 V; confirmar SKU.",
      ),
      ml(
        "Xiaomi S40 bivolt",
        1390,
        "https://www.mercadolivre.com.br/robo-aspirador-xiaomi-s40-10000pa-ultra-potente-bivolt-branco/p/MLB70064958",
      ),
    ],
  },
  {
    key: "depurador",
    name: "Depurador Suggar para cooktop de 5 bocas",
    aliases: ["depurador", "sugar", "suggar"],
    quantity: 1,
    room: "Cozinha",
    category: "Eletrodomésticos",
    reference: "Suggar Slim DPS182PT, 80 cm, 220 V.",
    notes:
      "Na Suggar, a referência encontrada foi o Slim de 80 cm. Antes de comprar, conferir a largura do modelo Electrolux de cinco bocas e as exigências de seu manual. Se precisar de 90 cm ou coifa, recotar; não foi incluído um modelo de 60 cm.",
    offers: [
      offer(
        "Suggar DPS182PT",
        422.1,
        "https://www.suggar.com.br/produto/depurador-de-ar-slim-80-cm-preto-suggar-64230",
        "Suggar oficial",
        "Pix; preço no cartão R$ 469.",
      ),
      offer(
        "DPS182PT 220 V",
        449.62,
        "https://www.millenamoveiseeletro.com.br/depuradoresdear/depurador-de-ar-suggar-slim-80-cm-220v-dps182---preto/21909.html",
        "Millena",
        "Pix; preço no cartão R$ 473,29.",
      ),
      ml(
        "DPS182PT 220 V",
        549.9,
        "https://lista.mercadolivre.com.br/depurador-de-ar-slim-220v",
      ),
    ],
  },
  {
    key: "ar",
    name: "Ar-condicionado inverter smart 12.000 BTU",
    aliases: ["ar condicionado", "arcondicionado"],
    quantity: 1,
    room: "A definir",
    category: "Climatização",
    reference:
      "Split inverter 12.000 BTU, frio, Wi-Fi, 220 V, conjunto completo.",
    notes:
      "Apenas aparelho; instalação, tubulação, dreno, suportes e adequação elétrica separados. Conferir dimensionamento para o ambiente; não é previsão de instalação nem consumo de energia.",
    offers: [
      offer(
        "Midea AI Ecomaster frio",
        2439,
        ac,
        "Midea oficial",
        "Preço anunciado, sem aplicar cupom.",
      ),
      offer(
        "Midea AI AirVolution frio",
        2469,
        ac,
        "Midea oficial",
        "Preço anunciado, sem aplicar cupom.",
      ),
      ml(
        "Samsung WindFree AI frio",
        2399,
        "https://www.mercadolivre.com.br/ar-condicionado-split-samsung-inverter-windfree-ai-12000-btus-frio-sem-vento-ar12dyfaawknaz/p/MLB42440842",
      ),
    ],
  },
];

/** Mean of the observed comparable offers, rounded up to the next R$ 10. */
export function researchPrice(item: ResearchedItem) {
  const prices = item.offers.map((q) => Math.round(q.amount * 100));
  const meanCents = Math.round(
    prices.reduce((s, p) => s + p, 0) / prices.length,
  );
  return {
    mean: meanCents / 100,
    unit: Math.ceil(meanCents / 1000) * 10,
    min: Math.min(...prices) / 100,
    max: Math.max(...prices) / 100,
  };
}
export const researchTotal = () =>
  HOUSEHOLD_RESEARCH.reduce(
    (sum, item) => sum + researchPrice(item).unit * item.quantity,
    0,
  );
