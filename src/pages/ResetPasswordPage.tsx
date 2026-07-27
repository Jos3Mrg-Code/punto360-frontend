import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, XCircle, Factory, Loader2 } from 'lucide-react';
import { api } from '../api/axios';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
                <div className="text-center p-8">
                    <XCircle size={56} className="text-red-400 mx-auto mb-4" />
                    <p className="text-white text-lg">Enlace inválido.</p>
                    <Link to="/login" className="mt-4 inline-block text-cyan-400 hover:text-cyan-300 text-sm">Volver al inicio</Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
        if (password !== confirm) return setError('Las contraseñas no coinciden.');

        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, password });
            setSuccess(true);
            setTimeout(() => navigate('/login', { state: { message: '¡Contraseña actualizada! Ya puedes iniciar sesión.' } }), 2500);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Error al restablecer la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
            <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

            <div className="w-full max-w-md p-8 relative z-10 flex flex-col items-center">
                <div className="mb-8 text-center text-white">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
                            <Factory size={36} className="text-cyan-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">PUNTO 360</h1>
                </div>

                <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
                    {success ? (
                        <div className="flex flex-col items-center gap-4 text-center py-2">
                            <CheckCircle2 size={56} className="text-green-400" />
                            <h2 className="text-xl font-semibold text-white">¡Contraseña actualizada!</h2>
                            <p className="text-gray-300 text-sm">Redirigiendo al inicio de sesión...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <h2 className="text-xl font-semibold text-white mb-2">Nueva contraseña</h2>
                            <p className="text-gray-400 text-sm mb-6">Escribe tu nueva contraseña dos veces para confirmarla.</p>

                            {error && (
                                <div className="mb-5 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4 mb-6">
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="Nueva contraseña (mín. 6 caracteres)" required minLength={6} autoFocus
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                                        placeholder="Confirmar contraseña" required
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 rounded-xl text-white font-medium shadow-lg shadow-blue-500/30 transition-all">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Guardar nueva contraseña'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
