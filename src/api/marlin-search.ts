export interface MarlinSearchConfig {
    baseUrl: string;
    authToken?: string;
    timeout?: number;
}

export interface SearchResponse {
    ids: string[];
}

export interface IndexStatus {
    status: string;
    message?: string;
}

class MarlinSearchAPI {
    private readonly config: MarlinSearchConfig;

    constructor(config: MarlinSearchConfig) {
        this.config = config;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}, responseType: 'json' | 'text' = 'json'): Promise<T> {
        const url = `${this.config.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(this.config.authToken && { 'Authorization': `${this.config.authToken}` }),
            ...options.headers,
        };

        const response = await fetch(url, {
            ...options,
            headers,
            signal: AbortSignal.timeout(this.config.timeout || 10000),
        });

        if (!response.ok) {
            throw new Error(`MarlinSearch API error: ${response.status} ${response.statusText}`);
        }

        return responseType === 'text' ? response.text() as T : response.json();
    }

    async checkStatus(): Promise<string> {
        return this.request<string>('/up', {}, 'text');
    }

    async search(query: string): Promise<SearchResponse> {
        const params = new URLSearchParams({ q: query });
        return this.request<SearchResponse>(`/search?${params}`);
    }

    async createIndex(): Promise<IndexStatus> {
        return this.request<IndexStatus>('/create-index', {
            method: 'POST',
        });
    }

    async deleteIndex(): Promise<IndexStatus> {
        return this.request<IndexStatus>('/delete-index', {
            method: 'DELETE',
        });
    }

    async clearIndex(): Promise<IndexStatus> {
        return this.request<IndexStatus>('/clear-index', {
            method: 'POST',
        });
    }
}

export const createMarlinSearchClient = (config: MarlinSearchConfig): MarlinSearchAPI => {
    return new MarlinSearchAPI(config);
};

export default MarlinSearchAPI;
