// src/data/services.ts
import dayjs from 'dayjs';

export interface MassageService {
  id: string;
  name: string;
  desc: string;
  /**
   * Base price (THB) for the 60-minute version. Other durations are derived
   * via DURATION_MULTIPLIERS in src/utils/servicePricing.ts.
   */
  price: number;
  /**
   * Default duration for this service (minutes). Used as the initial
   * popup selection. Always 60 in the canonical pricing model — kept on
   * the type for back-compat with legacy admin/booking pages still on
   * the single-duration flow.
   */
  duration: number;
  /**
   * Allowed duration tiers for this service (minutes). Defaults to
   * [60, 90, 120] when undefined. Use to lock specific services to
   * fewer options (e.g. signature ritual at [80, 120] only).
   */
  availableDurations?: number[];
  count: number;
  image: string;
  detail: string;
  benefit: string[];
  badge: 'SIGNATURE' | 'BEST SELLER' | 'RECOMMEND' | 'EXCLUSIVE';
}

export function calculateNextAvailable(
  duration: number,
  startTime: string,
  endTime: string
): string {
  const now = dayjs();
  const end = dayjs().hour(parseInt(endTime.split(':')[0])).minute(parseInt(endTime.split(':')[1]));
  const proposed = now.add(duration, 'minute');

  if (proposed.isAfter(end)) {
    return startTime; // next day
  }

  return proposed.format('HH:mm');
}

// 🆕 Round 28b18 (founder 2026-05-04) — SKU-style serviceId codes
//   so analytics/counting groups by an immutable order code, while
//   display names can be renamed freely without breaking aggregation.
//
//   Current SKU map:
//     xSR-Thai      → Thai Massage
//     SR-Aroma      → Aromatherapy Massage
//     SR-HJ2200     → Gentleman's Signature Therapy
//     SR-B2B3200    → SunRed Therapeutic Experience
//
//   Legacy ids ("thai-massage", "aromatherapy", "gentlemans-recovery",
//   "sunred-signature") are aliased in serviceCatalog so old bookings
//   still resolve. Backfill script (scripts/backfillServiceIdInBookings)
//   migrates Firestore documents to the new SKU codes when run.
const services: MassageService[] = [
  {
    id: 'xSR-Thai',
    name: 'Thai Massage',
    desc: 'Relieve deep muscle tension and restore body balance.',
    price: 1200,
    duration: 60,
    // Founder confirmed prices 2026-05-01:
    //   60: ฿1,200 · 90: ฿1,800 · 120: ฿2,400
    // (= base × 1.0/1.5/2.0 multiplier — see src/utils/servicePricing.ts)
    //
    // future promotional campaign — wired in via DURATION_PRICE_OVERRIDES
    // when the promo launches.
    availableDurations: [60, 90, 120],
    count: 62,
    image: '/images/workphoto/IMG_5092.JPG',
    detail: `A timeless healing ritual rooted in Thai tradition. This massage integrates acupressure, deep stretches, and rhythmic techniques to enhance flexibility, energy flow, and holistic balance.`,
    benefit: [
      'Eases chronic tension and soreness',
      'Improves posture and circulation',
      'Boosts natural energy flow',
      'Enhances joint mobility',
      'Induces deep calm and clarity',
    ],
    badge: 'SIGNATURE',
  },
  {
    id: 'SR-Aroma',
    name: 'Aromatherapy Massage',
    desc: 'Aromatic oil massage for deep body and mind relaxation.',
    price: 1600,
    duration: 60,
    // 60: ฿1,600 · 90: ฿2,400 · 120: ฿3,200
    availableDurations: [60, 90, 120],
    count: 0,
    image: '/images/workphoto/IMG_5096.JPG',
    detail: `Immerse yourself in serenity with an oil-based massage using premium-grade essential oils.`,
    benefit: [
      'Relieves emotional stress',
      'Enhances sleep quality',
      'Stimulates detox and lymphatic flow',
      'Improves blood circulation',
    ],
    badge: 'BEST SELLER',
  },
  {
    id: 'SR-HJ2200',
    name: "Gentleman's Signature Therapy",
    desc: 'Deep-tissue therapy tailored for active men.',
    price: 2200,
    duration: 60,
    // 60: ฿2,200 · 90: ฿3,300 · 120: ฿4,400
    availableDurations: [60, 90, 120],
    count: 0,
    image: '/images/workphoto/IMG_5289.JPG',
    detail: `A focused therapy combining deep-tissue techniques with warming aromatic oils. Designed to release muscle tension built up from work, training, or travel — performed by licensed therapists trained in sports recovery techniques.`,
    benefit: [
      'Deep-tissue muscle release',
      'Eases shoulder, back, and neck strain',
      'Reduces post-training inflammation',
      'Improves circulation and recovery',
      'Restores mental focus and calm',
    ],
    badge: 'RECOMMEND',
  },

  // ⭐⭐⭐ EXCLUSIVE — Senior licensed practitioners only ⭐⭐⭐
  {
    id: 'SR-B2B3200',
    name: 'SunRed Therapeutic Experience',
    desc: 'Premium ritual by senior licensed therapists.',
    price: 3200,
    duration: 60,
    // 60: ฿3,200 · 90: ฿4,800 · 120: ฿6,400
    availableDurations: [60, 90, 120],
    count: 0,
    image: '/images/workphoto/IMG_8368.JPG',
    detail: `Our most refined therapeutic ritual — a fusion of hot Thai herbal compress, aromatic oil massage, and gentle Thai-style stretching. Reserved for senior practitioners with 8+ years of licensed experience.`,
    benefit: [
      'Hot Thai herbal compress',
      'Premium aromatherapy blend',
      'Deep-tissue + Thai stretch fusion',
      'Senior-therapist exclusive (8+ yr)',
      'Full-body therapeutic ritual',
    ],
    badge: 'EXCLUSIVE',
  }
];

export default services;