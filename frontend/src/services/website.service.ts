import { axiosClient } from "@/config/api";

export interface UserWebsite {
    id: string;
    userId: string;
    name: string;
    websiteId: string;
    check_interval: number;
    is_active: boolean;
    current_status: string;
    createdAt: string;
    updatedAt: string;
    website: {
        id: string;
        url: string;
        createdAt: string;
        updatedAt: string;
    };
}

export interface RoundResult {
    id: string;
    websiteId: string;
    uptime_percentage: number;
    roundTimestamp: string;
    status: string;
    responseTime: number;
    report_hash: string;
    solana_address: string;
    createdAt: string;
    updatedAt: string;
    website: {
        id: string;
        url: string;
    };
}

export const getUserWebsites = async () => {
    const response = await axiosClient.get<{ message: string, data: UserWebsite[] }>('/websites?take=100&skip=0');
    return response.data.data;
}

export const getLatestResultsForUser = async () => {
    const response = await axiosClient.get<{ data: any[] }>('/ping/latest');
    return response.data.data;
}

export const getWebsiteById = async (subscriptionId: string) => {
    const response = await axiosClient.get<{ message: string, data: UserWebsite }>(`/websites/${subscriptionId}`);
    return response.data.data;
}

export const getWebsiteResults = async (websiteId: string) => {
    const response = await axiosClient.get<{ data: RoundResult[] }>(`/ping/${websiteId}`);
    return response.data.data;
}
