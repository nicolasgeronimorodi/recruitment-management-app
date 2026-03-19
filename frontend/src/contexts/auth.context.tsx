'use client';
import{
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode
} from 'react';
import { AuthUser, LoginResponse} from '@/services/auth.service';

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (response: LoginResponse) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children} : { children: ReactNode}){
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect( () => {
        const storedToken = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('auth_user');
        if(storedToken && storedUser){
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('access_token');
                localStorage.removeItem('auth_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = useCallback( (response: LoginResponse) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        setToken(response.access_token);
        setUser(response.user);
    }, [] );

    const logout = useCallback( () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
    }, [] );

    const value = {
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if(context === undefined){
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}