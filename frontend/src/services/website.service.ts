import { axiosClient } from "@/config/api";

export interface UserWebsite {
    id: string;
    userId: string;
    name: string;
    websiteId: string;
    check_interval: number;
    regions: string[];
    is_active: boolean;
    is_cancelled: boolean;
    current_status: string;
    billed_till: string;
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
    ipfs_cid: string;
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

export type DashboardOverview = {
    overallUptimePct: number | null;
    overallUptimeDeltaPct: number | null;
    globalLatencyMs: number | null;
    uptimeHistory7d: Array<{ name: string; uptime: number | null }>;
    alerts: Array<{
        type: 'DOWNTIME' | 'HIGH_LATENCY' | 'UNKNOWN';
        severity: 'critical' | 'warning' | 'info';
        websiteId: string;
        websiteUrl: string;
        message: string;
        responseTimeMs?: number;
        createdAt: string;
    }>;
    websitesCount: number;
}

export const getDashboardOverviewForUser = async () => {
    const response = await axiosClient.get<{ data: DashboardOverview }>('/ping/overview');
    return response.data.data;
}

export const getWebsiteById = async (subscriptionId: string) => {
    const response = await axiosClient.get<{ message: string, data: UserWebsite }>(`/websites/${subscriptionId}`);
    return response.data.data;
}

export const deactivateWebsiteSubscription = async (subscriptionId: string) => {
    const response = await axiosClient.patch<{ message: string }>(`/websites/${subscriptionId}/deactivate`);
    return response.data;
}

export const activateWebsiteSubscription = async (subscriptionId: string) => {
    const response = await axiosClient.patch<{ message: string }>(`/websites/${subscriptionId}/activate`);
    return response.data;
}

export const getWebsiteResults = async (websiteId: string) => {
    const response = await axiosClient.get<{ data: RoundResult[] }>(`/ping/${websiteId}`);
    return response.data.data;
}

export interface ValidatorSubmission {
    id: string;
    validatorId: string;
    websiteId: string;
    roundTimestamp: string;
    continent: string;
    status: string;
    responseTime: number;
    createdAt: string;
    updatedAt: string;
}

export const getWebsiteSubmissions = async (websiteId: string) => {
    const response = await axiosClient.get<{ data: ValidatorSubmission[] }>(`/ping/${websiteId}/submissions`);
    return response.data.data;
}

export type ContinentRoundStatus = {
    websiteId: string;
    roundTimestamp: string;
    continents: Array<{
        continent: string;
        up: number;
        down: number;
        unknown: number;
        total: number;
        status: 'UP' | 'DOWN' | 'UNKNOWN';
    }>;
}

export const getWebsiteContinentStatusForRound = async (websiteId: string, roundTimestamp: string) => {
    const response = await axiosClient.get<{ data: ContinentRoundStatus }>(`/ping/${websiteId}/continent-status`, {
        params: { roundTimestamp },
    });
    return response.data.data;
}
