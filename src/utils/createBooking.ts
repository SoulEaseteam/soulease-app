// src/utils/createBooking.ts
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const createBooking = async () => {
  try {
    await addDoc(collection(db, 'bookings'), {
      therapistId: 'abc123',
      therapistName: 'Yuri',
      serviceName: 'Manhood Relaxation',
      servicePrice: 1900,
      total: 2100,
      taxiFee: 200,
      address: 'The Quart Ruamrudee by UHG',
      phone: '0812345678',
      date: '2025-07-15',
      time: '21:00',
      note: 'Lobby',
      status: 'completed',
      createdAt: serverTimestamp(),  // ✅ วันที่ออกอัตโนมัติ
      updatedAt: serverTimestamp(),
      userId: 'Tp6I8x9Wz1jgAE01de6l'
    });
    console.log('Booking created!');
  } catch (error) {
    console.error('Error creating booking:', error);
  }
};