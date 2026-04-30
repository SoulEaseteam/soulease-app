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
    id: 'aromatherapy',
    name: 'Aromatherapy Massage',
    desc: 'Aromatic oil massage for deep body and mind relaxation.',
    price: 1600,
    duration: 70,
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
    id: 'gentlemans-recovery',
    name: "Gentleman's Recovery Massage",
    desc: 'Deep-tissue therapy tailored for active men.',
    price: 2200,
    duration: 80,
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
    id: 'sunred-signature',
    name: 'SunRed Signature Ritual',
    desc: 'Our 80-minute premium ritual by senior licensed therapists.',
    price: 3200,
    duration: 80,
    count: 0,
    image: '/images/workphoto/IMG_8368.JPG',
    detail: `Our most refined therapeutic ritual — a fusion of hot Thai herbal compress, aromatic oil massage, and gentle Thai-style stretching. Reserved for senior practitioners with 8+ years of licensed experience (ผ.พ.).`,
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