// src/data/landingContent.ts
// Content config สำหรับ service & zone landing pages
// แต่ละหน้าโผล่เป็น Google rich snippet ของตัวเอง

export interface LandingPageConfig {
  slug: string;
  type: "service" | "area";
  // SEO
  title: string;
  description: string;
  keywords: string[];
  // Hero
  heroEyebrow: string; // small label above title
  heroTitle: string;
  heroSubtitle: string;
  // Body
  intro: string;
  highlights: { icon: string; text: string }[];
  faqs: { q: string; a: string }[];
  // For schema.org
  priceFrom?: number; // THB
  geo?: { lat: number; lng: number };
}

// ============ SERVICES ============
export const SERVICES: LandingPageConfig[] = [
  {
    slug: "thai-massage",
    type: "service",
    title: "Thai Traditional Massage Bangkok | Outcall to Hotel & Condo",
    description:
      "Authentic Thai traditional massage delivered to your hotel room or condo in Bangkok. Verified therapists, 30–60 min arrival. From ฿1,500.",
    keywords: [
      "Thai massage Bangkok",
      "outcall Thai massage",
      "Thai massage hotel",
      "traditional Thai massage Bangkok",
    ],
    heroEyebrow: "Authentic Service",
    heroTitle: "Thai Traditional Massage",
    heroSubtitle:
      "Stretching, acupressure, and energy line work — performed by certified Thai therapists, in your space.",
    intro:
      "Thai traditional massage is a 2,500-year-old practice that combines acupressure, assisted yoga postures, and energy line therapy. Our verified therapists bring the full experience to your hotel room or condo in central Bangkok — no need to leave your accommodation.",
    highlights: [
      { icon: "✋", text: "Ancient acupressure + stretching technique" },
      { icon: "🏆", text: "Therapists certified by Thai Ministry of Health" },
      { icon: "⏱", text: "60 / 90 / 120 minute sessions available" },
      { icon: "🏨", text: "Hotel-friendly — discreet arrival" },
    ],
    faqs: [
      {
        q: "Do I need to undress for Thai massage?",
        a: "No. Thai traditional massage is performed fully clothed in loose comfortable attire. We bring clean cotton outfits if needed.",
      },
      {
        q: "How long does it take?",
        a: "Sessions are 60, 90, or 120 minutes. We recommend 90 minutes for a complete experience.",
      },
      {
        q: "Is it suitable for first-timers?",
        a: "Yes. Our therapists adjust pressure to your comfort. Tell them your preference at the start.",
      },
    ],
    priceFrom: 1500,
  },
  {
    slug: "aromatherapy",
    type: "service",
    title: "Aromatherapy Massage Bangkok | Outcall to Hotel & Condo",
    description:
      "Premium essential-oil aromatherapy massage delivered to your room. Lavender, ylang-ylang, eucalyptus blends. Verified therapists, 30–60 min arrival.",
    keywords: [
      "aromatherapy Bangkok",
      "essential oil massage",
      "outcall aromatherapy",
      "spa massage hotel Bangkok",
    ],
    heroEyebrow: "Signature Service",
    heroTitle: "Aromatherapy Massage",
    heroSubtitle:
      "Premium essential oils, gentle Swedish technique, deep relaxation — delivered to you.",
    intro:
      "Our aromatherapy massage combines pure essential oils with gentle Swedish technique. Lavender for calm, ylang-ylang for romance, eucalyptus for clarity — choose your blend. Therapists arrive with all linens and oils, no setup needed on your side.",
    highlights: [
      { icon: "🌿", text: "Pure essential oils — no synthetic fragrance" },
      { icon: "💆", text: "Gentle Swedish stroke technique" },
      { icon: "🛏", text: "We bring fresh linens + oils to you" },
      { icon: "🕊", text: "Custom blend for stress / sleep / energy" },
    ],
    faqs: [
      {
        q: "Which oil blend should I choose?",
        a: "Lavender for sleep & stress · Ylang-ylang for relaxation · Eucalyptus for muscle tension · Tea tree for refresh.",
      },
      {
        q: "Will the oil stain my hotel linen?",
        a: "No. We bring our own waterproof sheet to protect your bedding. Therapist removes it after the session.",
      },
      {
        q: "Can two people get massage in the same room?",
        a: "Yes. Book two therapists for a couples session.",
      },
    ],
    priceFrom: 1800,
  },
  {
    slug: "oil-massage",
    type: "service",
    title: "Oil Massage Bangkok | Outcall Sensual & Therapeutic",
    description:
      "Smooth oil massage to your hotel room or condo in Bangkok. Verified therapists, premium organic oils, 30–60 min arrival. From ฿1,800.",
    keywords: [
      "oil massage Bangkok",
      "outcall oil massage",
      "sensual massage Bangkok",
      "Swedish oil massage",
    ],
    heroEyebrow: "Premium Service",
    heroTitle: "Oil Massage",
    heroSubtitle:
      "Smooth, flowing strokes with premium organic oils — total muscle release.",
    intro:
      "Oil massage uses long, flowing strokes with premium organic massage oil to release muscle tension and improve circulation. Perfect after a long flight, busy day, or simply to unwind. Our therapists are trained in Swedish, deep tissue, and Lomi Lomi techniques.",
    highlights: [
      { icon: "💧", text: "Premium organic massage oils" },
      { icon: "🤲", text: "Swedish · Deep tissue · Lomi Lomi options" },
      { icon: "🛏", text: "Fresh linens included" },
      { icon: "🚿", text: "Shower set provided after session" },
    ],
    faqs: [
      {
        q: "Do I undress completely?",
        a: "Therapists are professional — they cover with towels for modesty. You undress to your comfort level.",
      },
      {
        q: "Will I be greasy after?",
        a: "We use light oil that absorbs quickly. Therapist towel-dries before leaving.",
      },
      {
        q: "Is it safe / discreet at hotels?",
        a: "Yes. Therapists arrive professionally dressed with a discreet bag. Hotel staff see only a guest receiving spa service.",
      },
    ],
    priceFrom: 1800,
  },
  {
    slug: "foot-massage",
    type: "service",
    title: "Foot Reflexology Bangkok | Outcall to Hotel",
    description:
      "Authentic Thai foot reflexology delivered to your hotel. Pressure-point therapy for jet lag and tired legs. Verified therapists, from ฿1,200.",
    keywords: [
      "foot massage Bangkok",
      "reflexology Bangkok",
      "jet lag massage",
      "outcall foot massage",
    ],
    heroEyebrow: "Quick Reset",
    heroTitle: "Foot Reflexology",
    heroSubtitle:
      "Pressure-point therapy on feet — relieves jet lag, tired legs, headaches.",
    intro:
      "Thai foot reflexology applies pressure to specific points on the feet that correspond to organs throughout the body. Excellent for jet lag, tired legs after walking Bangkok, or headache relief. 60-minute session.",
    highlights: [
      { icon: "🦶", text: "Targeted pressure-point therapy" },
      { icon: "✈️", text: "Jet-lag remedy — perfect for travelers" },
      { icon: "🪑", text: "Done in chair or bed — minimal setup" },
      { icon: "🌡", text: "Warm towel + foot soak included" },
    ],
    faqs: [
      {
        q: "Just feet, or includes legs?",
        a: "Includes feet, ankles, calves up to the knees.",
      },
      {
        q: "I have ticklish feet — will it work?",
        a: "Yes. Therapists use firm pressure that's not ticklish.",
      },
    ],
    priceFrom: 1200,
  },
];

// ============ AREAS / ZONES ============
export const AREAS: LandingPageConfig[] = [
  {
    slug: "sukhumvit",
    type: "area",
    title: "Outcall Massage Sukhumvit | 30-min Delivery to Hotel",
    description:
      "Outcall massage delivered to Sukhumvit hotels and condos in 30 minutes. Marriott, Sheraton Grande, Hyatt, JW — all served. From ฿1,500.",
    keywords: [
      "Sukhumvit massage",
      "outcall massage Sukhumvit",
      "Sukhumvit hotel massage",
      "Asok massage",
    ],
    heroEyebrow: "Sukhumvit Coverage",
    heroTitle: "Sukhumvit Outcall Massage",
    heroSubtitle:
      "30-minute arrival to Sukhumvit hotels — Soi 1 to Soi 71. Marriott, Sheraton, Hyatt, JW Marriott served.",
    intro:
      "Sukhumvit is our most-served area. From Asok BTS to Phrom Phong, Thong Lo to Ekkamai — therapists can arrive in 30 minutes or less. We serve all major hotel brands including Marriott Sukhumvit, Sheraton Grande, Park Hyatt, JW Marriott, and luxury condos.",
    highlights: [
      { icon: "⚡", text: "30-minute arrival window for central Sukhumvit" },
      { icon: "🏨", text: "Hotels: Marriott, Sheraton, Hyatt, JW served" },
      { icon: "🏢", text: "Condos: ID-verified for security access" },
      { icon: "🚖", text: "Taxi cost shown upfront — no surprise" },
    ],
    faqs: [
      {
        q: "What's the latest hour you serve in Sukhumvit?",
        a: "We are 24/7. Late-night bookings (after midnight) take priority for therapists already in the area.",
      },
      {
        q: "Do you serve Soi Cowboy / Nana area?",
        a: "Yes. All Sukhumvit sois 1-71 covered.",
      },
      {
        q: "Will my condo security let the therapist in?",
        a: "Yes. Therapists carry ID and a SUNRED service card. Add their name to your guest list in advance.",
      },
    ],
    priceFrom: 1500,
    geo: { lat: 13.7398, lng: 100.5602 }, // Asok intersection
  },
  {
    slug: "silom",
    type: "area",
    title: "Outcall Massage Silom & Sathorn | Hotel Delivery",
    description:
      "Outcall massage to Silom & Sathorn hotels — Banyan Tree, Mandarin Oriental, So Sofitel, Lebua. 30-min arrival. From ฿1,500.",
    keywords: [
      "Silom massage",
      "Sathorn outcall massage",
      "Mandarin Oriental massage",
      "Banyan Tree Bangkok",
    ],
    heroEyebrow: "Silom & Sathorn",
    heroTitle: "Silom · Sathorn Outcall Massage",
    heroSubtitle:
      "Premium service to Silom & Sathorn 5-star hotels — Mandarin Oriental, Banyan Tree, So Sofitel, Lebua.",
    intro:
      "Silom & Sathorn is Bangkok's central business district and luxury hotel zone. We serve all major properties — Mandarin Oriental, Banyan Tree, So Sofitel Bangkok, Lebua at State Tower, Capella Bangkok, COMO Metropolitan. Therapists arrive within 30 minutes.",
    highlights: [
      { icon: "✨", text: "Mandarin Oriental, Banyan Tree, Lebua, Capella" },
      { icon: "💼", text: "Business district — therapist trained in workplace etiquette" },
      { icon: "⏰", text: "After-hours late check-in friendly" },
      { icon: "🇨🇳", text: "Chinese, Japanese, English-speaking therapists available" },
    ],
    faqs: [
      {
        q: "I'm at Mandarin Oriental — how do you arrive?",
        a: "Therapist arrives at lobby, calls you, and uses guest elevator. Hotel concierge already informed via our system.",
      },
      {
        q: "Do you cover Sathorn condos like The Met, Empire Tower?",
        a: "Yes. All Silom & Sathorn condos served.",
      },
    ],
    priceFrom: 1500,
    geo: { lat: 13.7244, lng: 100.5343 },
  },
  {
    slug: "asoke",
    type: "area",
    title: "Outcall Massage Asoke (Asok) | 24/7 Hotel Delivery",
    description:
      "Outcall massage to Asoke hotels and condos. Sheraton Grande, Westin Grande, Marriott, Sofitel So. 30-min arrival, 24/7. From ฿1,500.",
    keywords: [
      "Asoke massage",
      "Asok outcall",
      "Sheraton Grande massage",
      "Sukhumvit Asok massage",
    ],
    heroEyebrow: "Asoke Hub",
    heroTitle: "Asoke Outcall Massage",
    heroSubtitle:
      "Asoke BTS / MRT interchange — fastest area for outcall in Bangkok. 20-30 min arrival.",
    intro:
      "Asoke is the BTS/MRT interchange and one of our fastest-arrival zones. Therapists are usually within 2 km. We serve Sheraton Grande Sukhumvit, Westin Grande, Sofitel So Sukhumvit, Marriott Sukhumvit, and all condos in Soi 16-23.",
    highlights: [
      { icon: "⚡", text: "20-minute arrival typical (peak proximity)" },
      { icon: "🚇", text: "BTS Asok / MRT Sukhumvit interchange zone" },
      { icon: "🏨", text: "Sheraton, Westin, Sofitel, Marriott served" },
      { icon: "🌃", text: "24/7 — late-night ready" },
    ],
    faqs: [
      {
        q: "Fastest arrival time at Asoke?",
        a: "20 minutes typical. Sometimes faster if therapist is already in Sukhumvit.",
      },
    ],
    priceFrom: 1500,
    geo: { lat: 13.7373, lng: 100.5602 },
  },
];

// Combined for easy lookup
export const ALL_LANDING: LandingPageConfig[] = [...SERVICES, ...AREAS];

export function findLanding(slug: string): LandingPageConfig | undefined {
  return ALL_LANDING.find((l) => l.slug === slug);
}
