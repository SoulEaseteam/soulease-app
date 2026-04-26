// src/data/services.ts
import dayjs from 'dayjs';

export interface MassageService {
  id: string;
  name: string;
  desc: string;
  price: number;
  duration: number;
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

const services: MassageService[] = [
  {
    id: 'thai-massage',
    name: 'Thai Massage',
    desc: 'Relieve deep muscle tension and restore body balance.',
    price: 1200,
    duration: 60,
    count: 0,
    image: '/images/Service/IMG_5092.JPG',
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
    id: 'aromatherapy',
    name: 'Aromatherapy Massage',
    desc: 'Aromatic oil massage for deep body and mind relaxation.',
    price: 1600,
    duration: 70,
    count: 0,
    image: '/images/Service/IMG_5096.JPG',
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
    id: 'Gentleman’s',
    name: "Gentleman’s Signature Therapy",
    desc: 'Reconnect with your senses and restore inner balance.',
    price: 2200,
    duration: 80,
    count: 0,
    image: '/images/workphoto/IMG_5289.JPG',
    detail: `Crafted exclusively for the modern man, merging massage with mindful relaxation.`,
    benefit: [
      'Rebalances internal energy',
      'Dissolves tension',
      'Promotes groundedness',
      '[ Aromatherapy Massage + HandJob ]',
    ],
    badge: 'RECOMMEND',
  },

  // ⭐⭐⭐ เมนูพิเศษใหม่ EXCLUSIVE ⭐⭐⭐
  {
    id: 'SunRed’exclusive',
    name: 'SunRed Therapeutic Experience',
    desc: 'Elite full-body therapeutic ritual crafted only by our top-tier specialists.',
    price: 3200,
    duration: 80,
    count: 0,
    image: '/images/workphoto/IMG_8368.JPG', // เปลี่ยนรูปได้เลย
    detail: `An exclusive high-touch therapy designed to restore physical vitality, emotional clarity, and deep sensual balance. Only available with selected therapists.`,
    benefit: [
      'Premium deep-tissue techniques',
      'Advanced aromatherapy blend',
      'Signature SunRed ritual finish',
      'Emotional and sensory harmonization',
      '[ Body2Body + HandJob ]',
    ],
    badge: 'EXCLUSIVE',
  }
];

export default services;