import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Factory } from 'lucide-react';
import { api } from '../api/axios';

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token inválido o ausente.');
            return;
        }
        api.get(`/auth/verify-email?token=${token}`)
            .then(() => setStatus('success'))
            .catch(err => {
                setStatus('error');
                setMessage(err?.response?.data?.message || 'El enlace expiró o ya fue usado.');
            });
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
            <div className="w-full max-w-md p-8 flex flex-col items-center">
                <div className="mb-6">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                        <Factory size={32} className="text-cyan-400" />
                    </div>
                </div>

                <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 text-center">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 size={48} className="text-cyan-400 animate-spin" />
                            <p className="text-white text-lg font-medium">Verificando tu correo...</p>
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-4">
                            <CheckCircle2 size={56} className="text-green-400" />
                            <h2 className="text-xl font-bold text-white">¡Correo verificado!</h2>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                Tu cuenta está activa. Tienes <span className="text-cyan-400 font-semibold">7 días de prueba gratis</span> para explorar Punto 360.
                            </p>
                            <Link to="/login"
                                className="mt-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-white font-medium shadow-lg shadow-blue-500/30 transition-all">
                                Iniciar sesión
                            </Link>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-4">
                            <XCircle size={56} className="text-red-400" />
                            <h2 className="text-xl font-bold text-white">Enlace inválido</h2>
                            <p className="text-gray-300 text-sm">{message}</p>
                            <Link to="/register"
                                className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                                Volver al registro
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
