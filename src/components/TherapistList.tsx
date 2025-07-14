import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // ปรับ path ให้ตรงกับโปรเจกต์คุณ
import { useNavigate } from 'react-router-dom';
import { Therapist, AvailableStatus } from '@/types/therapist';

const TherapistList: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchTherapists() {
      const snapshot = await getDocs(collection(db, 'therapists'));

      const therapistsData: Therapist[] = snapshot.docs.map(doc => {
        const data = doc.data();

        // กำหนด default available เป็น 'resting' เผื่อข้อมูลผิดพลาด
        let available: AvailableStatus = 'resting';

        // ตรวจสอบค่า available จาก Firestore ว่าตรงกับ 3 ค่าไหม ถ้าไม่ให้เป็น resting
        if (typeof data.available === 'string') {
          const status = data.available.toLowerCase();
          if (status === 'available' || status === 'bookable' || status === 'resting') {
            available = status as AvailableStatus;
          }
        }

        return {
          id: doc.id,
          name: data.name || '',
          image: data.image || '',
          rating: data.rating ?? 0,
          reviews: data.reviews ?? 0,
          lat: data.lat ?? 0,
          lng: data.lng ?? 0,
          todayBookings: data.todayBookings ?? 0,
          totalBookings: data.totalBookings ?? 0,
          nextAvailable: data.nextAvailable || 'N/A',
          startTime: data.startTime || '00:00',
          endTime: data.endTime || '23:59',
          specialty: data.specialty || '',
          gallery: Array.isArray(data.gallery) ? data.gallery : [],
          features: {
            age: data.features?.age || '',
            gender: data.features?.gender,
            ethnicity: data.features?.ethnicity,
            height: data.features?.height || '',
            weight: data.features?.weight || '',
            skintone: data.features?.skintone,
            bodyType: data.features?.bodyType || '',
            bustSize: data.features?.bustSize,
            hairColor: data.features?.hairColor,
            vaccinated: data.features?.vaccinated,
            smoker: data.features?.smoker,
            language: data.features?.language || '',
            style: data.features?.style,
          },
          available,
        };
      });

      setTherapists(therapistsData);
      setLoading(false);
    }

    fetchTherapists();
  }, []);

  if (loading) return <div>Loading therapists...</div>;
  if (therapists.length === 0) return <div>No therapists found.</div>;

  return (
    <div>
      <h2>Therapists</h2>
      <ul>
        {therapists.map((t) => (
          <li key={t.id} style={{ cursor: 'pointer', marginBottom: 10 }} onClick={() => navigate(`/therapists/${t.id}`)}>
            <img src={t.image} alt={t.name} width={80} style={{ borderRadius: 8 }} />
            <div>{t.name}</div>
            <div>Status: {t.available}</div>
            <div>Rating: {t.rating}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TherapistList;