import { custom } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
    skipAuth?: boolean;
}

export async function apiClient<T>(
    endpoint: string,
    options: RequestOptions = {}
):Promise<T> {
    const { skipAuth = false, headers: customHeaders, ...rest} = options;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((customHeaders as Record<string, string>) || {})
    };
    if(!skipAuth){
        const token = typeof window !== 'undefined'
            ? localStorage.getItem('access_token')
            : null;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    const response = await fetch(`${API_URL}/${endpoint}`, {
        headers,
        ...rest
    });
    if(!response.ok){
        const error = await response
        .json()
        .catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();

}