import {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api } from '../api/axios';
import type { AuthContextType, User } from './auth.types';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode<User & { exp: number }>(token);
                if (decoded.exp * 1000 > Date.now()) {
                    setUser(decoded);
                } else {
                    localStorage.removeItem('token');
                }
            } catch {
                localStorage.removeItem('token');
            }
        }
        setReady(true);
    }, []);

    const login = async (email: string, password: string): Promise<string | null> => {
        const res = await api.post('/auth/login', { email, password });
        const token = res.data.access_token;

        localStorage.setItem('token', token);
        const decoded = jwtDecode<User>(token);
        setUser(decoded);
        return decoded.role;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        window.location.href = '/login';
    };

    const hasPermission = (permission: string) =>
        user?.permissions?.includes(permission) ?? false;

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                ready,
                login,
                logout,
                hasPermission,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
};
