// src/data/services.ts
import dayjs from 'dayjs';

export interface MassageService {
  id: string;
  name: string;
  desc: string;

  price: number;

  duration: number;

  availableDurations?: number[];
  count: number;
  image: string;
  detail: string;
  benefit: string[];

  badge: 'SIGNATURE' | 'POPULAR' | 'RECOMMEND' | 'EXCLUSIVE';
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
    detail: `A timeless Thai healing ritual delivered to your hotel suite or residence. Your female practitioner integrates acupressure, deep stretches, and rhythmic techniques — all paced to your preference, in the privacy of your own space.`,
    benefit: [
      'Authentic Thai techniques performed at your hotel or residence',
      'Personal attention from a licensed female practitioner',
      'Eases muscular tension from travel, work, or long flights',
      'Improves flexibility, circulation, and joint mobility',
      'No commute — your therapist arrives fully equipped',
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
    detail: `A gentle oil-based massage performed in the privacy of your own room. Premium aromatic blends — lavender, neroli, or sandalwood — paired with steady, calming strokes that ease the nervous system and prepare you for deep, restorative sleep.`,
    benefit: [
      'Calming oil massage in the privacy of your room',
      'Premium aromatic blends — lavender, neroli, sandalwood',
      'Skilled female therapist tunes pressure to your preference',
      'Eases stress and prepares the body for deeper sleep',
      'Discreet door-to-door arrival — no need to leave your hotel',
    ],
    badge: 'POPULAR',
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
    detail: `A focused aromatic-oil session crafted for men, blending warming aromatherapy with attentive tension-release work and a personalised finishing ritual. Performed by a trained female practitioner in your residence unhurried, attentive, and entirely paced to your preference.`,
    benefit: [
      'Warming aromatic oil massage delivered to your residence',
      'Trained female practitioner attentive to your preferences',
      'Tension-release work tuned to your pressure',
      'Concluded with a personalised finishing ritual',
      'Private, unrushed session undivided attention throughout',
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
    detail: `Our most refined ritual — a flowing whole-body oil ceremony of continuous-contact technique, premium aromatic blends, and gentle Thai-style stretching. Reserved for specialised practitioners trained in this discipline, who arrive at your residence with the full repertoire and undivided attention.`,
    benefit: [
      'Reserved for specialised practitioners (not every therapist)',
      'Whole-body oil ritual with continuous-contact technique',
      'Premium aromatic blends with gentle Thai-style stretch',
      'Performed in your private space unhurried, undivided',
      'The most refined and personal experience SunRed offers',
    ],
    badge: 'EXCLUSIVE',
  }
];

export default services;