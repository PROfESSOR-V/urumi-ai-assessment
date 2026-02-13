export interface Store {
    id: number;
    name: string;
    subdomain: string;
    namespace: string;
    status: 'Pending' | 'Provisioning' | 'Ready' | 'Failed';
    createdAt: string;
    adminPassword?: string;
}

export interface CreateStoreRequest {
    name: string;
    subdomain: string;
}
