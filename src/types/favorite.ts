export interface FavoriteTherapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  specialty?: string;
  likedAt?: any; // Firestore Timestamp
}