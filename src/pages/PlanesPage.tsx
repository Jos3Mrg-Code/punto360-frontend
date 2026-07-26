import { useState } from 'react';
import { Check, Zap, Star, Crown, Loader2 } from 'lucide-react';
import { api } from '../api/axios';

const PLANS = [
    {
        key: 'MONTHLY',
        icon: Zap,
        label: 'Mensual',
        price: 120000,
        period: '/mes',
        color: 'from-cyan-500 to-blue-600',
        borderColor: 'border-cyan-500/30',
        features: ['Ventas ilimitadas', 'Inventario completo', 'Reportes básicos', 'Soporte por email'],
    },
    {
        key: 'QUARTERLY',
        icon: Star,
        label: 'Trimestral',
        price: 320000,
        period: '/3 meses',
        badge: 'Ahorra $40.000',
        color: 'from-purple-500 to-pink-600',
        borderColor: 'border-purple-500/50',
        featured: true,
        features: ['Todo lo del plan mensual', 'Reportes avanzados', 'Soporte prioritario', 'Múltiples sucursales'],
    },
    {
        key: 'ANNUAL',
        icon: Crown,
        label: 'Anual',
        price: 1100000,
        period: '/año',
        badge: 'Ahorra $340.000',
        color: 'from-amber-500 to-orange-600',
        borderColor: 'border-amber-500/30',
        features: ['Todo lo del plan trimestral', 'Acceso anticipado a funciones', 'Soporte 24/7', 'Onboarding personalizado'],
    },
];

const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function PlanesPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleCheckout = async (planKey: string) => {
        setError('');
        setLoading(planKey);
        try {
            const { data } = await api.post('/subscription/checkout', { plan: planKey });
            window.location.href = data.checkoutUrl;
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Error al crear el link de pago.');
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 py-16 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-3">Elige tu plan</h1>
                    <p className="text-gray-400 text-lg">Comienza gratis, escala cuando estés listo.</p>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm text-center max-w-md mx-auto">
                        {error}
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-6">
                    {PLANS.map((plan) => {
                        const Icon = plan.icon;
                        return (
                            <div key={plan.key}
                                className={`relative flex flex-col bg-white/5 backdrop-blur-md border ${plan.borderColor} rounded-2xl overflow-hidden transition-transform hover:-translate-y-1 ${plan.featured ? 'ring-2 ring-purple-500/60 shadow-2xl shadow-purple-500/20' : ''}`}>
                                {plan.badge && (
                                    <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${plan.color} text-white`}>
                                        {plan.badge}
                                    </div>
                                )}
                                {plan.featured && (
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-pink-600" />
                                )}

                                <div className="p-6 flex-1">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 shadow-lg`}>
                                        <Icon size={24} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">{plan.label}</h3>
                                    <div className="flex items-baseline gap-1 mb-6">
                                        <span className="text-3xl font-extrabold text-white">{fmt(plan.price)}</span>
                                        <span className="text-gray-400 text-sm">{plan.period}</span>
                                    </div>

                                    <ul className="space-y-2.5">
                                        {plan.features.map((f) => (
                                            <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                                                <Check size={16} className="text-green-400 shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-6 pt-0">
                                    <button
                                        onClick={() => handleCheckout(plan.key)}
                                        disabled={loading !== null}
                                        className={`w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${plan.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg`}>
                                        {loading === plan.key ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            'Suscribirme'
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="text-center text-gray-500 text-sm mt-10">
                    Pago seguro procesado por <span className="text-gray-400">Wompi</span>. Cancela cuando quieras.
                </p>
            </div>
        </div>
    );
}
