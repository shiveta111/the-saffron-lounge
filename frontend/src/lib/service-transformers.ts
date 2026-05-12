// Service field name transformers
// This file handles the mismatch between frontend (camelCase) and backend (snake_case with 'title' instead of 'name')

import { Service as FrontendService, CreateServiceData as FrontendCreateServiceData } from './types';

// Backend service shape
export interface BackendService {
    id: number;
    title: string;
    description: string;
    icon?: string | null;
    features?: string[];  // Already parsed from JSON by backend
    price?: number | null;
    category: string;
    created_at: string;
    updated_at: string;
}

// Backend create service payload
export interface BackendCreateServiceData {
    title: string;
    description: string;
    icon?: string;
    features?: string[];
    price?: number;
    category: string;
}

// Transform backend service to frontend service
export function transformServiceFromBackend(backendService: any): FrontendService {
    return {
        id: backendService.id,
        title: backendService.title,
        description: backendService.description,
        price: backendService.price,
        duration: undefined,  // Not in backend
        category: backendService.category,
        isActive: true,  // Default value, not in backend
        icon: backendService.icon,
        features: backendService.features,
        createdAt: backendService.created_at,
        updatedAt: backendService.updated_at,
    };
}

// Transform frontend create data to backend format
export function transformServiceToBackend(frontendData: FrontendCreateServiceData): BackendCreateServiceData {
    return {
        title: frontendData.title,
        description: frontendData.description,
        icon: frontendData.icon,
        features: frontendData.features,
        price: frontendData.price,
        category: frontendData.category,
    };
}
