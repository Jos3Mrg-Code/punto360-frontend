import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../api/axios';

export default function PagoExitosoPage() {
    const [checking, setChecking] = useState(true);
    const [plan, setPlan] = useState('');

    useEffect(() => {
        api.get('/subscription/status')
            .then(({ data }) => setPlan(data.plan || ''))
            .catch(() => {})
            .finally(() => setChecking(false));
    }, []);

    const planLabel: Record<string, string> = {
        MONTHLY: 'Mensual',
        QUARTERLY: 'Trimestral',
        ANNUAL: 'Anual',
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <div className="w-full max-w-md p-8 text-center">
                {checking ? (
                    <Loader2 size={48} className="text-cyan-400 animate-spin mx-auto" />
                ) : (
                    <div className="flex flex-col items-center gap-5">
                        <CheckCircle2 size={72} className="text-green-400" />
                        <h1 className="text-3xl font-bold text-white">¡Pago exitoso!</h1>
                        {plan && (
                            <p className="text-gray-300 text-lg">
                                Plan <span className="text-cyan-400 font-semibold">{planLabel[plan] ?? plan}</span> activado.
                            </p>
                        )}
                        <p className="text-gray-400 text-sm">Ya puedes usar todas las funciones de Punto 360.</p>
                        <Link to="/"
                            className="mt-4 px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-white font-semibold shadow-lg shadow-blue-500/30 transition-all">
                            Ir al dashboard
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
