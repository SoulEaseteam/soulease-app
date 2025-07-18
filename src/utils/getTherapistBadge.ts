// src/utils/getTherapistBadge.ts
import { badgeConfig } from '@/utils/badgeConfig';
import { Therapist } from '@/types/therapist';

export function getBadgeForTherapist(therapist: Therapist): 'VIP' | 'HOT' | 'NEW' | undefined {
  return badgeConfig.find(config => config.condition(therapist))?.key;
}