import axios from 'axios'
import { env } from '.'
const axiosClient = axios.create({
    baseURL: env.API_URL,
    withCredentials: true
})

axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export {axiosClient}