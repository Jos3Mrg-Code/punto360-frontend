import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { api } from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function SubscriptionBanner() {
    const { isAuthenticated } = useAuth();
    const [daysLeft, setDaysLeft] = useState<number | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;
        api.get('/subscription/status')
            .then(({ data }) => {
                if (data.status === 'TRIAL' && data.daysLeft <= 3) {
                    setDaysLeft(data.daysLeft);
                }
            })
            .catch(() => {});
    }, [isAuthenticated]);

    if (!isAuthenticated || daysLeft === null || dismissed) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-amber-500/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-amber-500/30 text-black text-sm font-medium max-w-sm w-full mx-4">
            <AlertTriangle size={18} className="shrink-0" />
            <span>
                {daysLeft === 0
                    ? 'Tu prueba gratuita vence hoy.'
                    : `Tu prueba termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.`}
                {' '}
                <Link to="/planes" className="underline font-bold hover:opacity-80">Ver planes</Link>
            </span>
            <button onClick={() => setDismissed(true)} className="ml-auto hover:opacity-70 transition-opacity">
                <X size={16} />
            </button>
        </div>
    );
}
