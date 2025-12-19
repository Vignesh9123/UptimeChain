
import { create } from 'zustand';
import { axiosClient } from '@/config';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface UserState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (credentials: any) => Promise<User>;
    register: (data: any) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    clearError: () => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: true,
    error: null,

    login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosClient.post('/users/login', credentials);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            console.log(user);
            set({ user, isAuthenticated: true, isLoading: false });
            return user
        } catch (error: any) {
            const message = error.response?.data?.message || 'Login failed';
            set({ error: message, isLoading: false });
            throw error;
        }
    },

    register: async (data) => {
        set({ isLoading: true, error: null });
        try {
            await axiosClient.post('/users/register', data);
            set({ isLoading: false });
        } catch (error: any) {
            const message = error.response?.data?.message || 'Registration failed';
            set({ error: message, isLoading: false });
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, isAuthenticated: false });
    },

    checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            set({ isAuthenticated: false, user: null, isLoading: false });
            return;
        }
        set({ isLoading: true });
        try {
            const response = await axiosClient.get('/users/current');
            set({ user: response.data.data, isAuthenticated: true, isLoading: false });
        } catch (error) {
            localStorage.removeItem('token');
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },

    clearError: () => set({ error: null })
}));
