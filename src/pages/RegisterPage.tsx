import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, Mail, Lock, CheckCircle2, Factory, MailCheck, ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
import { api } from '../api/axios';

const inputCls = "w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all";

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        companyName: '',
        branchName: '',
        name: '',
        email: '',
        emailConfirm: '',
        password: '',
        passwordConfirm: '',
    });

    const set = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const goNext = () => {
        setError('');
        if (!form.companyName.trim()) return setError('El nombre de la empresa es obligatorio.');
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim()) return setError('Tu nombre es obligatorio.');
        if (!form.email.trim()) return setError('El correo es obligatorio.');
        if (form.email.toLowerCase() !== form.emailConfirm.toLowerCase())
            return setError('Los correos no coinciden.');
        if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
        if (form.password !== form.passwordConfirm) return setError('Las contraseñas no coinciden.');

        setLoading(true);
        try {
            await api.post('/auth/register', {
                companyName: form.companyName,
                branchName: form.branchName || undefined,
                name: form.name,
                email: form.email,
                password: form.password,
            });
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
                    {/* Barra de progreso */}
                    {!submitted && (
                        <div className="flex w-full h-1 bg-white/5">
                            <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500" style={{ width: `${step * 50}%` }} />
                        </div>
                    )}

                    <div className="p-8">
                        {submitted ? (
                            <div className="flex flex-col items-center gap-5 text-center py-4">
                                <MailCheck size={56} className="text-cyan-400" />
                                <h2 className="text-xl font-semibold text-white">¡Revisa tu correo!</h2>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    Enviamos un enlace de verificación a{' '}
                                    <span className="text-cyan-400 font-medium">{form.email}</span>.
                                    Ábrelo para activar tu cuenta.
                                </p>
                                <Link to="/login" className="mt-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={step === 1 ? (e) => { e.preventDefault(); goNext(); } : handleSubmit}>
                                {error && (
                                    <div className="mb-5 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                                        {error}
                                    </div>
                                )}

                                {/* PASO 1 — Empresa */}
                                {step === 1 && (
                                    <>
                                        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                                            <Building2 className="text-cyan-400" size={20} /> Tu empresa
                                        </h2>
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input type="text" name="companyName" value={form.companyName} onChange={set}
                                                    placeholder="Nombre de la empresa" required autoFocus className={inputCls} />
                                            </div>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input type="text" name="branchName" value={form.branchName} onChange={set}
                                                    placeholder="Nombre de la sucursal (ej. Sede principal)" className={inputCls} />
                                            </div>
                                        </div>
                                        <button type="submit"
                                            className="mt-8 w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-white font-medium shadow-lg shadow-blue-500/30 transition-all">
                                            Siguiente <ArrowRight size={18} />
                                        </button>
                                    </>
                                )}

                                {/* PASO 2 — Usuario */}
                                {step === 2 && (
                                    <>
                                        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                                            <User className="text-cyan-400" size={20} /> Tu cuenta
                                        </h2>
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input type="text" name="name" value={form.name} onChange={set}
                                                    placeholder="Nombre completo" required autoFocus className={inputCls} />
                                            </div>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input type="email" name="email" value={form.email} onChange={set}
                                                    placeholder="Correo electrónico" required className={inputCls} />
                                            </div>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input type="email" name="emailConfirm" value={form.emailConfirm} onChange={set}
                                                    placeholder="Confirmar correo" required className={inputCls} />
                                            </div>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input type="password" name="password" value={form.password} onChange={set}
                                                    placeholder="Contraseña (mín. 6 caracteres)" required minLength={6} className={inputCls} />
                                            </div>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input type="password" name="passwordConfirm" value={form.passwordConfirm} onChange={set}
                                                    placeholder="Confirmar contraseña" required className={inputCls} />
                                            </div>
                                        </div>

                                        <div className="mt-8 flex gap-3">
                                            <button type="button" onClick={() => { setError(''); setStep(1); }}
                                                className="w-12 flex items-center justify-center py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all">
                                                <ArrowLeft size={18} />
                                            </button>
                                            <button type="submit" disabled={loading}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium shadow-lg shadow-blue-500/30 transition-all">
                                                {loading ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <><CheckCircle2 size={18} /> Crear cuenta</>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
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
