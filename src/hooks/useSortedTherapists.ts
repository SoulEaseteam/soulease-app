import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  lat: number;
  lng: number;
  available: 'available' | 'bookable' | 'resting';
  specialty: string;
  experience: string;
  distance?: number;
  distanceText?: string;
  durationText?: string;
  durationValue?: number;
}

const useSortedTherapists = (
  therapists: Therapist[],
  userLocation: { lat: number; lng: number } | null
): Therapist[] => {
  const [sortedTherapists, setSortedTherapists] = useState<Therapist[]>([]);
  const cacheRef = useRef<{ [key: string]: Therapist[] }>({});

  const useMock = import.meta.env.VITE_USE_MOCK_DISTANCE === 'true';

  useEffect(() => {
    if (!userLocation?.lat || !userLocation?.lng || therapists.length === 0) {
      // Default fallback: sorted by rating
      setSortedTherapists([...therapists].sort((a, b) => b.rating - a.rating));
      return;
    }

    const cacheKey = `${userLocation.lat},${userLocation.lng}`;
    if (cacheRef.current[cacheKey]) {
      setSortedTherapists(cacheRef.current[cacheKey]);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isMounted) return;

      if (useMock) {
        // 🧪 MOCK DATA
        const enriched = therapists.map((t) => ({
          ...t,
          distance: Math.floor(Math.random() * 3000 + 1000),
          distanceText: `${(Math.random() * 4 + 1).toFixed(1)} km`,
          durationText: `${(Math.random() * 10 + 5).toFixed(0)} mins`,
          durationValue: Math.floor(Math.random() * 600 + 300),
        }));
        const sorted = enriched.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
        cacheRef.current[cacheKey] = sorted;
        if (isMounted) setSortedTherapists(sorted);
      } else {
        try {
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          const destinations = therapists.map((t) => `${t.lat},${t.lng}`).join('|');
          const res = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
            params: {
              origins: `${userLocation.lat},${userLocation.lng}`,
              destinations,
              key: apiKey,
              mode: 'driving',
              language: 'en',
            },
          });

          if (res.data.status !== 'OK') {
            console.error('Google API Error:', res.data.error_message);
            if (isMounted) setSortedTherapists([...therapists].sort((a, b) => b.rating - a.rating));
            return;
          }

          const enriched = therapists.map((t, i) => ({
            ...t,
            distance: res.data.rows[0].elements[i]?.distance?.value ?? 999999,
            distanceText: res.data.rows[0].elements[i]?.distance?.text ?? '',
            durationText: res.data.rows[0].elements[i]?.duration?.text ?? '',
            durationValue: res.data.rows[0].elements[i]?.duration?.value ?? 999999,
          }));

          const sorted = enriched.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
          cacheRef.current[cacheKey] = sorted;
          if (isMounted) setSortedTherapists(sorted);
        } catch (err) {
          console.error('Error fetching distance from Google API:', err);
          if (isMounted) setSortedTherapists([...therapists].sort((a, b) => b.rating - a.rating));
        }
      }
    }, 300); // debounce 300ms

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [userLocation, therapists, useMock]);

  return sortedTherapists;
};

export default useSortedTherapists;