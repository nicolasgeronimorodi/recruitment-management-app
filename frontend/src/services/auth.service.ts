import { apiClient } from "./api";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: string;
}

export interface LoginResponse {
    access_token: string;
    user: AuthUser;
}

export async function loginService(
    data: LoginRequest
): Promise<LoginResponse> {
    return apiClient<LoginResponse>('auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
        skipAuth: true
    }); 
}