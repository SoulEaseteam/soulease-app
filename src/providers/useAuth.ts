import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

/**
 * Custom hook to access authentication context.
 * Returns the current authenticated user and loading state.
 */
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;