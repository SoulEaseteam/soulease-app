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
  badge: 'SIGNATURE' | 'BEST SELLER' | 'RECOMMEND';
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
    // ถ้าเวลาจบเกินช่วงเวลาทำงาน ให้เริ่มวันถัดไป
    return startTime;
  }

  return proposed.format('HH:mm');
}

const services: MassageService[] = [
  {
    id: 'thai-massage',
    name: 'Thai Massage',
    desc: 'Relieve deep muscle tension and restore body balance.',
    price: 1400,
    duration: 60,
    count: 0,
    image: '/images/servid/IMG_4270.jpg',
    detail:
      `A timeless healing ritual rooted in Thai tradition. This massage integrates acupressure, deep stretches, and rhythmic techniques to enhance flexibility, energy flow, and holistic balance.`,
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
    price: 1900,
    duration: 70,
    count: 0,
    image: '/images/servid/IMG_4232.jpg',
    detail:
      `Immerse yourself in serenity with an oil-based massage using premium-grade essential oils. This treatment calms the nervous system and promotes total-body renewal through scent and touch.`,
    benefit: [
      'Relieves emotional stress and tension',
      'Enhances sleep quality and mental clarity',
      'Stimulates detox and lymphatic flow',
      'Improves blood circulation',
    ],
    badge: 'BEST SELLER',
  },
  {
    id: 'manhood-relaxation',
    name: 'Manhood Relaxation Therapy',
    desc: 'Reconnect with your senses and restore your inner balance.',
    price: 2900,
    duration: 80,
    count: 0,
    image: '/images/servid/IMG_4237.jpg',  // ✅ แก้ path
    detail:
      `Crafted exclusively for the modern man, this therapy merges tailored massage techniques with mindful relaxation. Restore emotional equilibrium and physical vigor in one transformative session.`,
    benefit: [
      'Rebalances internal energy',
      'Dissolves tension from body and mind',
      'Promotes groundedness and vitality',
    ],
    badge: 'RECOMMEND',
  },
];

export default services;