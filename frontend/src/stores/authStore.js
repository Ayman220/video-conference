import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Login
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, token } = response.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error.response?.data?.error || 'Login failed',
          };
        }
      },

      // Register
      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/register', userData);
          const { user, token } = response.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error.response?.data?.error || 'Registration failed',
          };
        }
      },

      // Logout
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        // Remove token from API headers
        delete api.defaults.headers.common['Authorization'];
      },

      // Update user profile
      updateProfile: async (profileData) => {
        try {
          const response = await api.put('/users/profile', profileData);
          const { user } = response.data;
          
          set({ user });
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.error || 'Profile update failed',
          };
        }
      },

      // Get current user
      getCurrentUser: async () => {
        try {
          const response = await api.get('/auth/me');
          const { user } = response.data;
          
          set({ user });
          return { success: true };
        } catch (error) {
          // If token is invalid, logout
          if (error.response?.status === 401) {
            get().logout();
          }
          return {
            success: false,
            error: error.response?.data?.error || 'Failed to get user data',
          };
        }
      },

      // Initialize auth state
      initializeAuth: () => {
        const { token } = get();
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          get().getCurrentUser();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export { useAuthStore }; 