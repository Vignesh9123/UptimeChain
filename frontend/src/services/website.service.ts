import { axiosClient } from "@/config/api";

export interface UserWebsite {
    id: string;
    userId: string;
    name: string;
    websiteId: string;
    check_interval: number;
    is_active: boolean;
    current_status: string;
    created_at: string;
    updated_at: string;
}

export const getUserWebsites = async () => {
    const response = await axiosClient.get<{ message: string, data: UserWebsite[] }>('/websites?take=10&skip=0');
    return response.data.data;
}

export const getLatestResultsForUser = async () => {
    const response = await axiosClient.get<{ data: any[] }>('/ping/latest');
    return response.data.data;
}
