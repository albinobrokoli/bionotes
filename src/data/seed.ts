import type { PartialBlock } from '@blocknote/core';
import type { Space, Category, Page } from '../store/app';

/* -------- helpers -------- */
const h = (text: string, level: 1 | 2 | 3 = 1): PartialBlock<any, any, any> => ({
  type: 'heading',
  props: { level },
  content: text,
});
const p = (text: string): PartialBlock<any, any, any> => ({ type: 'paragraph', content: text });
const bullet = (items: string[]): PartialBlock<any, any, any>[] =>
  items.map((t) => ({ type: 'bulletListItem', content: t }));
const numbered = (items: string[]): PartialBlock<any, any, any>[] =>
  items.map((t) => ({ type: 'numberedListItem', content: t }));
const quote = (text: string): PartialBlock<any, any, any> => ({
  type: 'paragraph',
  content: [{ type: 'text', text, styles: { italic: true } }],
});
const code = (text: string, lang = 'text'): PartialBlock<any, any, any> => ({
  type: 'codeBlock',
  props: { language: lang },
  content: text,
});

/* -------- spaces -------- */
const spaces: Space[] = [
  {
    id: 'sp_neuro',
    name: 'Nörobiyoloji',
    icon: 'brain',
    color: '#A78BFA',
    categoryIds: ['cat_hippocampus', 'cat_synapse', 'cat_plasticity'],
    expanded: true,
  },
  {
    id: 'sp_mol',
    name: 'Moleküler Biyoloji',
    icon: 'dna',
    color: '#34D399',
    categoryIds: ['cat_dna_rep', 'cat_transcription', 'cat_translation'],
    expanded: false,
  },
  {
    id: 'sp_cell',
    name: 'Hücre Biyolojisi',
    icon: 'cell',
    color: '#60A5FA',
    categoryIds: ['cat_membrane', 'cat_organelles', 'cat_division'],
    expanded: false,
  },
  {
    id: 'sp_eco',
    name: 'Ekoloji & Evrim',
    icon: 'leaf',
    color: '#F59E0B',
    categoryIds: ['cat_population', 'cat_selection'],
    expanded: false,
  },
];

/* -------- categories -------- */
const categories: Category[] = [
  { id: 'cat_hippocampus', spaceId: 'sp_neuro', name: 'Hipokampüs', pageIds: ['pg_ltp', 'pg_hm', 'pg_place_cells'], expanded: true },
  { id: 'cat_synapse', spaceId: 'sp_neuro', name: 'Sinaptik İletim', pageIds: ['pg_nmda', 'pg_ampa'], expanded: false },
  { id: 'cat_plasticity', spaceId: 'sp_neuro', name: 'Nöroplastisite', pageIds: ['pg_plasticity_intro'], expanded: false },

  { id: 'cat_dna_rep', spaceId: 'sp_mol', name: 'DNA Replikasyonu', pageIds: ['pg_replication'], expanded: false },
  { id: 'cat_transcription', spaceId: 'sp_mol', name: 'Transkripsiyon', pageIds: ['pg_rna_pol'], expanded: false },
  { id: 'cat_translation', spaceId: 'sp_mol', name: 'Translasyon', pageIds: ['pg_ribosome'], expanded: false },

  { id: 'cat_membrane', spaceId: 'sp_cell', name: 'Membran Taşınımı', pageIds: ['pg_naK'], expanded: false },
  { id: 'cat_organelles', spaceId: 'sp_cell', name: 'Organeller', pageIds: ['pg_mitochondria'], expanded: false },
  { id: 'cat_division', spaceId: 'sp_cell', name: 'Hücre Bölünmesi', pageIds: ['pg_mitosis'], expanded: false },

  { id: 'cat_population', spaceId: 'sp_eco', name: 'Popülasyon Dinamiği', pageIds: ['pg_logistic'], expanded: false },
  { id: 'cat_selection', spaceId: 'sp_eco', name: 'Doğal Seçilim', pageIds: ['pg_finches'], expanded: false },
];

/* -------- pages -------- */
const now = Date.now();
const mkPage = (
  id: string,
  categoryId: string,
  title: string,
  favorite: boolean,
  tags: string[],
  content: PartialBlock<any, any, any>[],
): Page => ({
  id,
  categoryId,
  title,
  favorite,
  tags,
  content,
  createdAt: now,
  updatedAt: now,
  pdfPath: null,
  pdfFileName: null,
});

const pages: Page[] = [
  mkPage(
    'pg_ltp',
    'cat_hippocampus',
    'Uzun Süreli Potansiyasyon (LTP)',
    true,
    ['plasticity', 'NMDA', 'memory'],
    [
      h('Uzun Süreli Potansiyasyon (LTP)'),
      p(
        'LTP, iki nöron arasındaki sinaptik iletişimin uzun süreli olarak güçlenmesidir. Bellek oluşumu ve öğrenmenin moleküler temeli olarak kabul edilir.',
      ),
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Örnek (satır içi): ', styles: {} },
          { type: 'inlineLatex', props: { latex: '\\alpha' } },
          {
            type: 'text',
            text: ' gibi semboller NMDA ve plastisite notlarında sık geçer.',
            styles: {},
          },
        ],
      },
      h('Temel Mekanizma', 2),
      ...numbered([
        'Yüksek frekanslı tetanik uyarı presinaptik terminalden glutamat salınımını artırır.',
        'Postsinaptik AMPA reseptörleri depolarize olur; Mg²⁺ bloğu NMDA reseptöründen uzaklaşır.',
        'NMDA reseptörü Ca²⁺ akışına izin verir.',
        'Ca²⁺ → CaMKII aktivasyonu → AMPA reseptör trafiği & fosforilasyon.',
        'Geç faz LTP: yeni protein sentezi (CREB, BDNF).',
      ]),
      h('Anahtar Moleküller', 2),
      ...bullet([
        'NMDA reseptörü (koinsident dedektör)',
        'AMPA reseptörü (GluA1, GluA2)',
        'CaMKII — otofosforilasyon',
        'BDNF — geç faz LTP',
      ]),
      quote(
        '"Neurons that fire together, wire together." — Donald Hebb (1949)',
      ),
      {
        type: 'latex',
        props: {
          latex: String.raw`\Delta w_{ij} \;=\; \eta \, x_i \, x_j \qquad \text{(Hebb kuralı)}`,
          display: true,
        },
      },
    ],
  ),

  mkPage(
    'pg_hm',
    'cat_hippocampus',
    'Hipokampal Lezyon — H.M. Vakası',
    true,
    ['case-study', 'memory', 'history'],
    [
      h('Henry Molaison (H.M.)'),
      p(
        'Bilateral medial temporal lob rezeksiyonu (1953) sonrası anterograd amnezi geliştiren, modern bellek araştırmasının en önemli vakası.',
      ),
      h('Operasyon Sonrası Bulgular', 2),
      ...bullet([
        'Anterograd amnezi: yeni deklaratif anıları oluşturamıyor.',
        'Retrograd amnezi (operasyondan ~2 yıl öncesini kapsıyor).',
        'İşlem belleği ve prosedürel bellek korunmuş.',
        'IQ ve dil yetenekleri etkilenmemiş.',
      ]),
      h('Teorik Önem', 2),
      p(
        'Deklaratif (bilinçli) ve prosedürel (bilinçsiz) bellek sistemlerinin ayrı olduğunu gösteren ilk vaka. Hipokampüsün bellek konsolidasyonundaki rolünü ortaya koydu.',
      ),
      quote('Scoville & Milner, 1957 — "Loss of recent memory after bilateral hippocampal lesions."'),
    ],
  ),

  mkPage(
    'pg_place_cells',
    'cat_hippocampus',
    'Yer Hücreleri (Place Cells)',
    false,
    ['spatial', 'navigation'],
    [
      h('Yer Hücreleri'),
      p(
        "O'Keefe ve Dostrovsky (1971) tarafından keşfedilen, hipokampüs CA1/CA3'te bulunan ve belirli bir uzamsal konumda ateşlenen piramidal nöronlar.",
      ),
      h('Özellikler', 2),
      ...bullet([
        'Yer alanı (place field): nöronun aktif olduğu uzamsal bölge.',
        'Bağlamsal kodlama: çevre değişirse yer haritası yeniden düzenlenir (remapping).',
        "Grid hücreleri (entorhinal korteks) ile birlikte navigasyon sistemi oluşturur.",
      ]),
      h('Nobel Ödülü', 2),
      p("May-Britt Moser, Edvard Moser ve John O'Keefe — 2014 Fizyoloji/Tıp Nobel Ödülü."),
    ],
  ),

  mkPage(
    'pg_nmda',
    'cat_synapse',
    'NMDA Reseptör Kinetiği',
    false,
    ['NMDA', 'receptor'],
    [
      h('NMDA Reseptörü'),
      p(
        'Glutamat reseptör ailesinin iyonotropik üyesi. Hem ligand hem voltaj bağımlı kapılanma gösterir — bu özelliği onu "koinsident dedektör" yapar.',
      ),
      h('Subünit Yapısı', 2),
      ...bullet([
        'GluN1 — her kompleksde bulunur, glisin bağlar.',
        'GluN2A–D — glutamat bağlar, kinetik farklılık yaratır.',
        'GluN3A–B — düzenleyici rol.',
      ]),
      h('Önemli Özellikler', 2),
      ...bullet([
        'Mg²⁺ bloğu istirahat potansiyelinde (−70 mV) kanalı tıkar.',
        'Depolarizasyon Mg²⁺ bloğunu kaldırır.',
        'Ca²⁺ geçirgenliği yüksek — sinyal kaskadları için kritik.',
      ]),
      code('Nernst denklemi:\nE_ion = (RT/zF) · ln([out]/[in])', 'text'),
    ],
  ),

  mkPage(
    'pg_ampa',
    'cat_synapse',
    'AMPA Reseptörü',
    false,
    ['AMPA', 'receptor'],
    [
      h('AMPA Reseptörü'),
      p(
        'Hızlı eksitatör sinaptik iletimin ana aracısı. GluA1–GluA4 subünitlerinden oluşur, Na⁺/K⁺ geçirgendir.',
      ),
      p(
        'LTP sırasında AMPA reseptörlerinin postsinaptik membrana eklenmesi (trafiklenmesi), sinaptik güçlenmenin ana mekanizmasıdır.',
      ),
    ],
  ),

  mkPage(
    'pg_plasticity_intro',
    'cat_plasticity',
    'Nöroplastisiteye Giriş',
    false,
    ['plasticity'],
    [
      h('Nöroplastisite'),
      p(
        'Sinir sisteminin deneyime yanıt olarak yapı ve fonksiyonunu değiştirme yeteneği. Hem gelişim hem yetişkin yaşam boyunca aktiftir.',
      ),
      h('Türleri', 2),
      ...bullet([
        'Sinaptik plastisite (LTP, LTD)',
        'Yapısal plastisite (spine dinamikleri)',
        'Nörojenez (subventriküler zon, dentat girus)',
        'Fonksiyonel haritalama değişimi',
      ]),
    ],
  ),

  mkPage(
    'pg_replication',
    'cat_dna_rep',
    'DNA Replikasyonu',
    false,
    ['DNA', 'replication'],
    [
      h('DNA Replikasyonu'),
      p(
        'Yarı-korunumlu bir süreç: her yavru çift sarmal, bir eski ve bir yeni ipliğe sahiptir (Meselson-Stahl, 1958).',
      ),
      {
        type: 'latex',
        props: {
          latex: String.raw`h \approx 0.34\,\text{nm/bp} \quad (\text{B-DNA helikal adımı})`,
          display: true,
        },
      },
      h('Baz Eşleşmesi Örneği', 2),
      {
        type: 'chemistry',
        props: {
          label: 'Adenin',
          smiles: 'Nc1ncnc2ncnc12',
        },
      },
      {
        type: 'chemistry',
        props: {
          label: 'Timin',
          smiles: 'CC1=CN(C(=O)NC1=O)',
        },
      },
      h('Temel Enzimler', 2),
      ...bullet([
        'Helikaz — çift sarmalı açar',
        'Primaz — RNA primer sentezi',
        'DNA polimeraz III — ana sentez',
        'DNA polimeraz I — primer değişimi',
        'Ligaz — Okazaki fragmanlarını birleştirir',
      ]),
    ],
  ),

  mkPage(
    'pg_rna_pol',
    'cat_transcription',
    'RNA Polimeraz II',
    false,
    ['transcription'],
    [
      h('RNA Polimeraz II'),
      p(
        'Ökaryotik hücrelerde mRNA sentezinden sorumlu enzim. Genel transkripsiyon faktörleri (TFIIA–H) ile başlatma kompleksi oluşturur.',
      ),
    ],
  ),

  mkPage(
    'pg_ribosome',
    'cat_translation',
    'Ribozom ve Translasyon',
    false,
    ['translation', 'ribosome'],
    [
      h('Ribozom'),
      p(
        'Prokaryotlarda 70S (50S + 30S), ökaryotlarda 80S (60S + 40S). A, P ve E bölgeleri tRNA bağlanmasını koordine eder.',
      ),
      ...bullet([
        'İnisiyasyon — başlangıç kodonu (AUG) ve Met-tRNA',
        'Elongasyon — peptid bağı oluşumu, translokasyon',
        'Terminasyon — stop kodon + salınım faktörleri',
      ]),
    ],
  ),

  mkPage(
    'pg_naK',
    'cat_membrane',
    'Na⁺/K⁺ ATPase',
    false,
    ['transport', 'ATPase'],
    [
      h('Sodyum-Potasyum Pompası'),
      p(
        'Her ATP döngüsünde 3 Na⁺ hücreden dışarı, 2 K⁺ içeri taşır. Dinlenim membran potansiyelini korur, sekonder aktif taşıma için iyon gradyeni sağlar.',
      ),
    ],
  ),

  mkPage(
    'pg_mitochondria',
    'cat_organelles',
    'Mitokondri',
    false,
    ['organelle', 'energy'],
    [
      h('Mitokondri'),
      p(
        "Hücrenin enerji santrali. Çift membranlı yapısı, kendi DNA'sı (mtDNA) ve ribozomları endosimbiyotik kökeni destekler.",
      ),
      ...bullet([
        'Dış membran — porinler (VDAC)',
        'İç membran — elektron taşıma zinciri',
        'Matris — Krebs döngüsü, mtDNA',
      ]),
    ],
  ),

  mkPage(
    'pg_mitosis',
    'cat_division',
    'Mitoz',
    false,
    ['cell-cycle'],
    [
      h('Mitoz'),
      p('Somatik hücrelerde gerçekleşen, kromozom sayısını koruyan bölünme.'),
      ...numbered([
        'Profaz — kromatin yoğunlaşması, iğ ipliği oluşumu',
        'Prometafaz — nükleer zar dağılımı',
        'Metafaz — ekvatoryal düzlem',
        'Anafaz — kardeş kromatit ayrımı',
        'Telofaz — yeni çekirdek zarları',
        'Sitokinez — sitoplazma bölünmesi',
      ]),
    ],
  ),

  mkPage(
    'pg_logistic',
    'cat_population',
    'Lojistik Büyüme Modeli',
    false,
    ['population', 'model'],
    [
      h('Lojistik Büyüme'),
      p('Çevresel taşıma kapasitesini (K) dikkate alan popülasyon modeli.'),
      code('dN/dt = r · N · (1 - N/K)', 'text'),
      p('N = popülasyon boyutu, r = içsel büyüme hızı, K = taşıma kapasitesi.'),
    ],
  ),

  mkPage(
    'pg_finches',
    'cat_selection',
    "Darwin'in İspinozları",
    false,
    ['evolution', 'selection', 'case-study'],
    [
      h("Galápagos İspinozları"),
      p(
        'Peter & Rosemary Grant (1970s–2010s): Daphne Major adasında 40+ yıllık saha çalışması, doğal seçilimin gerçek zamanlı gözlemini sağladı.',
      ),
      ...bullet([
        '1977 kuraklığı: büyük tohumlar avantajlı → gaga büyüklüğü arttı.',
        '1983 El Niño: küçük tohumlar bolluk → seçilim tersine döndü.',
        'Gaga şekil/boyut varyasyonunun kalıtsal olduğu doğrulandı.',
      ]),
      quote('"Evolution is not only happening, it is observable." — Jonathan Weiner, The Beak of the Finch'),
    ],
  ),
];

export const SEED_DATA = {
  spaces,
  categories,
  pages,
};
