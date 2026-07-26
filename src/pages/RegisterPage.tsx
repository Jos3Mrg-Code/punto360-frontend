import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, Mail, Lock, CheckCircle2, Factory, MailCheck } from 'lucide-react';
import { api } from '../api/axios';

export default function RegisterPage() {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        companyName: '',
        name: '',
        email: '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formData.companyName || !formData.name || !formData.email || !formData.password) {
            return setError('Todos los campos son obligatorios.');
        }
        if (formData.password.length < 6) {
            return setError('La contraseña debe tener al menos 6 caracteres.');
        }
        setLoading(true);
        try {
            await api.post('/auth/register', formData);
            setSubmitted(true);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Error al conectar con el servidor.');
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
                    <p className="text-gray-300 font-light text-sm">7 días gratis — sin tarjeta de crédito</p>
                </div>

                <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-8">
                        {submitted ? (
                            <div className="flex flex-col items-center gap-5 text-center py-4">
                                <MailCheck size={56} className="text-cyan-400" />
                                <h2 className="text-xl font-semibold text-white">¡Revisa tu correo!</h2>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    Enviamos un enlace de verificación a <span className="text-cyan-400 font-medium">{formData.email}</span>.
                                    Ábrelo para activar tu cuenta y comenzar tu prueba gratis.
                                </p>
                                <Link to="/login" className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <h2 className="text-xl font-semibold text-white mb-6">Crear cuenta</h2>

                                {error && (
                                    <div className="mb-5 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange}
                                            placeholder="Nombre de tu empresa" required
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input type="text" name="name" value={formData.name} onChange={handleChange}
                                            placeholder="Tu nombre completo" required
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input type="email" name="email" value={formData.email} onChange={handleChange}
                                            placeholder="Correo electrónico" required
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input type="password" name="password" value={formData.password} onChange={handleChange}
                                            placeholder="Contraseña (mín. 6 caracteres)" required minLength={6}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all" />
                                    </div>
                                </div>

                                <button type="submit" disabled={loading}
                                    className="mt-8 w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium shadow-lg shadow-blue-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><CheckCircle2 size={18} /> Comenzar prueba gratis</>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="mt-6 text-center text-gray-400 text-sm">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                        Inicia sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
