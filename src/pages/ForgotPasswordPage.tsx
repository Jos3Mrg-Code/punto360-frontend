import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, MailCheck, Factory, Loader2 } from 'lucide-react';
import { api } from '../api/axios';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
        } catch {
            setError('Error al enviar el correo. Intenta de nuevo.');
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
                    <p className="text-gray-300 font-light text-sm">Recupera el acceso a tu cuenta</p>
                </div>

                <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
                    {sent ? (
                        <div className="flex flex-col items-center gap-5 text-center py-2">
                            <MailCheck size={56} className="text-cyan-400" />
                            <h2 className="text-xl font-semibold text-white">¡Revisa tu correo!</h2>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                Si el correo <span className="text-cyan-400 font-medium">{email}</span> está registrado,
                                recibirás un enlace para crear una nueva contraseña. Expira en 1 hora.
                            </p>
                            <Link to="/login" className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <h2 className="text-xl font-semibold text-white mb-2">Restablecer contraseña</h2>
                            <p className="text-gray-400 text-sm mb-6">Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.</p>

                            {error && (
                                <div className="mb-5 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <div className="relative mb-6">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="Correo electrónico" required autoFocus
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 rounded-xl text-white font-medium shadow-lg shadow-blue-500/30 transition-all">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Enviar enlace'}
                            </button>
                        </form>
                    )}
                </div>

                <Link to="/login" className="mt-6 flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm transition-colors">
                    <ArrowLeft size={15} /> Volver al inicio de sesión
                </Link>
            </div>
        </div>
    );
}
