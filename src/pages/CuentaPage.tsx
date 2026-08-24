import { useEffect, useState } from 'react';
import {
    User, Building2, GitBranch, Save, Plus, Pencil,
    Trash2, X, Check, Loader2, CreditCard, Zap, Star, Crown, ArrowRight, Link2,
} from 'lucide-react';
import { api } from '../api/axios';
import DashboardLayout from '../layouts/DashboardLayout';
import { isScannerFixEnabled, setScannerFix } from '../utils/scannerFix';

type Tab = 'perfil' | 'empresa' | 'sucursales' | 'planes' | 'integraciones';

const inputCls =
    'w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-app-text placeholder-app-text-muted focus:outline-none focus:ring-2 focus:ring-app-accent/40 transition-all text-sm';

const labelCls = 'text-xs font-medium text-app-text-muted mb-1 block uppercase tracking-wide';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'perfil',         label: 'Mi perfil',      icon: User },
    { key: 'empresa',        label: 'Mi empresa',     icon: Building2 },
    { key: 'sucursales',     label: 'Sucursales',     icon: GitBranch },
    { key: 'planes',         label: 'Plan',           icon: CreditCard },
    { key: 'integraciones',  label: 'Integraciones',  icon: Link2 },
];

const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const PLAN_INFO: Record<string, { label: string; color: string; icon: React.ElementType; price: number; period: string }> = {
    TRIAL:     { label: 'Prueba gratuita', color: 'text-cyan-400',   icon: Zap,   price: 0,       period: '7 días' },
    MONTHLY:   { label: 'Mensual',         color: 'text-blue-400',   icon: Zap,   price: 170000,  period: '/mes' },
    QUARTERLY: { label: 'Trimestral',      color: 'text-purple-400', icon: Star,  price: 450000,  period: '/3 meses' },
    ANNUAL:    { label: 'Anual',           color: 'text-amber-400',  icon: Crown, price: 1500000, period: '/año' },
};

// ── Sección reutilizable ────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-app-card border border-app-border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-app-text">{title}</h3>
            {children}
        </div>
    );
}

function SaveBtn({ loading, onClick, label = 'Guardar' }: { loading: boolean; onClick: () => void; label?: string }) {
    return (
        <button onClick={onClick} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-app-accent hover:opacity-90 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-all">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {label}
        </button>
    );
}

function Msg({ text }: { text: string }) {
    if (!text) return null;
    const isError = /error|incorrecta|coinciden|caracteres|obligatorio/i.test(text);
    return <p className={`text-sm ${isError ? 'text-red-400' : 'text-emerald-400'}`}>{text}</p>;
}

// ── Perfil ──────────────────────────────────────────────────────────
function PerfilTab() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
    const [savingPwd, setSavingPwd] = useState(false);
    const [pwdMsg, setPwdMsg] = useState('');
    const [scannerFix, setScannerFixState] = useState(isScannerFixEnabled);

    const toggleScannerFix = (val: boolean) => {
        setScannerFix(val);
        setScannerFixState(val);
    };

    useEffect(() => {
        api.get('/users/me').then(({ data }) => { setName(data.name); setEmail(data.email); });
    }, []);

    const savePerfil = async () => {
        setSaving(true); setMsg('');
        try { await api.patch('/users/me', { name }); setMsg('Nombre actualizado correctamente.'); }
        catch { setMsg('Error al guardar.'); }
        finally { setSaving(false); }
    };

    const savePassword = async () => {
        setPwdMsg('');
        if (pwd.next.length < 6) return setPwdMsg('La contraseña debe tener al menos 6 caracteres.');
        if (pwd.next !== pwd.confirm) return setPwdMsg('Las contraseñas no coinciden.');
        setSavingPwd(true);
        try {
            await api.patch('/users/me/password', { currentPassword: pwd.current, newPassword: pwd.next });
            setPwdMsg('Contraseña actualizada.');
            setPwd({ current: '', next: '', confirm: '' });
        } catch (e: any) { setPwdMsg(e?.response?.data?.message || 'Error al cambiar contraseña.'); }
        finally { setSavingPwd(false); }
    };

    return (
        <div className="space-y-5 max-w-lg">
            <Section title="Datos personales">
                <div>
                    <label className={labelCls}>Nombre</label>
                    <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
                </div>
                <div>
                    <label className={labelCls}>Correo electrónico</label>
                    <input className={inputCls + ' opacity-50 cursor-not-allowed'} value={email} disabled />
                </div>
                <Msg text={msg} />
                <SaveBtn loading={saving} onClick={savePerfil} />
            </Section>

            <Section title="Cambiar contraseña">
                <div>
                    <label className={labelCls}>Contraseña actual</label>
                    <input type="password" className={inputCls} value={pwd.current}
                        onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} placeholder="••••••" />
                </div>
                <div>
                    <label className={labelCls}>Nueva contraseña</label>
                    <input type="password" className={inputCls} value={pwd.next}
                        onChange={e => setPwd(p => ({ ...p, next: e.target.value }))} placeholder="Mín. 6 caracteres" />
                </div>
                <div>
                    <label className={labelCls}>Confirmar nueva contraseña</label>
                    <input type="password" className={inputCls} value={pwd.confirm}
                        onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} placeholder="Repetir contraseña" />
                </div>
                <Msg text={pwdMsg} />
                <SaveBtn loading={savingPwd} onClick={savePassword} label="Cambiar contraseña" />
            </Section>

            <Section title="Configuración del dispositivo">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-app-text">Corrección de escáner (guión)</p>
                        <p className="text-xs text-app-text-muted mt-0.5">Convierte <code className="bg-app-bg px-1 rounded">'</code> → <code className="bg-app-bg px-1 rounded">-</code> al escanear códigos. Activa solo si tu pistola lee guiones como apóstrofes.</p>
                    </div>
                    <button
                        onClick={() => toggleScannerFix(!scannerFix)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scannerFix ? 'bg-app-accent' : 'bg-app-border'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${scannerFix ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </Section>
        </div>
    );
}

// ── Empresa ─────────────────────────────────────────────────────────
function EmpresaTab() {
    const [form, setForm] = useState({ name: '', document_number: '', phone: '', address: '' });
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        api.get('/companies/me').then(({ data }) => {
            setForm({ name: data.name || '', document_number: data.document_number || '', phone: data.phone || '', address: data.address || '' });
            setEmail(data.email || '');
        });
    }, []);

    const save = async () => {
        setSaving(true); setMsg('');
        try { await api.patch('/companies/me', form); setMsg('Datos actualizados correctamente.'); }
        catch { setMsg('Error al guardar.'); }
        finally { setSaving(false); }
    };

    const fields = [
        { label: 'Nombre de la empresa', key: 'name', placeholder: 'Mi empresa' },
        { label: 'NIT / RUT', key: 'document_number', placeholder: 'Ej. 900123456-1' },
        { label: 'Teléfono', key: 'phone', placeholder: 'Ej. 3001234567' },
        { label: 'Dirección', key: 'address', placeholder: 'Ej. Calle 10 #5-20' },
    ];

    return (
        <div className="max-w-lg">
            <Section title="Datos de la empresa">
                {fields.map(({ label, key, placeholder }) => (
                    <div key={key}>
                        <label className={labelCls}>{label}</label>
                        <input className={inputCls} value={(form as any)[key]}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                    </div>
                ))}
                <div>
                    <label className={labelCls}>Correo de la empresa</label>
                    <input className={inputCls + ' opacity-50 cursor-not-allowed'} value={email} disabled />
                </div>
                <Msg text={msg} />
                <SaveBtn loading={saving} onClick={save} />
            </Section>
        </div>
    );
}

// ── Sucursales ──────────────────────────────────────────────────────
interface Branch { id: string; name: string; address: string; phone: string | null; is_main: boolean }

function SucursalesTab() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', address: '', phone: '' });
    const [adding, setAdding] = useState(false);
    const [newForm, setNewForm] = useState({ name: '', address: '', phone: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = () => api.get('/branches').then(({ data }) => setBranches(data));
    useEffect(() => { load(); }, []);

    const startEdit = (b: Branch) => {
        setEditingId(b.id);
        setEditForm({ name: b.name, address: b.address || '', phone: b.phone || '' });
        setError('');
    };

    const saveEdit = async (id: string) => {
        setSaving(true); setError('');
        try { await api.patch(`/branches/${id}`, editForm); setEditingId(null); load(); }
        catch (e: any) { setError(e?.response?.data?.message || 'Error al guardar.'); }
        finally { setSaving(false); }
    };

    const createBranch = async () => {
        if (!newForm.name.trim()) return setError('El nombre es obligatorio.');
        setSaving(true); setError('');
        try { await api.post('/branches', newForm); setAdding(false); setNewForm({ name: '', address: '', phone: '' }); load(); }
        catch (e: any) { setError(e?.response?.data?.message || 'Error al crear.'); }
        finally { setSaving(false); }
    };

    const deleteBranch = async (id: string) => {
        if (!confirm('¿Desactivar esta sucursal?')) return;
        try { await api.delete(`/branches/${id}`); load(); }
        catch (e: any) { setError(e?.response?.data?.message || 'No se pudo eliminar.'); }
    };

    const branchInputs = (form: typeof editForm, setForm: (f: typeof editForm) => void) => (
        <div className="space-y-3">
            <div>
                <label className={labelCls}>Nombre *</label>
                <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej. Sucursal Norte" />
            </div>
            <div>
                <label className={labelCls}>Dirección</label>
                <input className={inputCls} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Ej. Calle 10 #5-20" />
            </div>
            <div>
                <label className={labelCls}>Teléfono</label>
                <input className={inputCls} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Ej. 3001234567" />
            </div>
        </div>
    );

    return (
        <div className="max-w-xl space-y-4">
            {error && <p className="text-sm text-red-400">{error}</p>}

            {branches.map(b => (
                <div key={b.id} className="bg-app-card border border-app-border rounded-2xl p-5">
                    {editingId === b.id ? (
                        <div className="space-y-4">
                            {branchInputs(editForm, setEditForm)}
                            <div className="flex gap-2">
                                <button onClick={() => saveEdit(b.id)} disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-app-accent hover:opacity-90 rounded-xl text-white text-sm font-medium transition-all">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar
                                </button>
                                <button onClick={() => setEditingId(null)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-app-bg border border-app-border rounded-xl text-app-text-muted text-sm transition-all hover:text-app-text">
                                    <X size={14} /> Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-app-text">{b.name}</span>
                                    {b.is_main && (
                                        <span className="text-[11px] px-2 py-0.5 bg-app-accent/15 text-app-accent border border-app-accent/20 rounded-full font-medium">
                                            Principal
                                        </span>
                                    )}
                                </div>
                                {b.address && <p className="text-sm text-app-text-muted">{b.address}</p>}
                                {b.phone && <p className="text-sm text-app-text-muted">{b.phone}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => startEdit(b)}
                                    className="p-2 hover:bg-app-bg rounded-lg transition-colors text-app-text-muted hover:text-app-text">
                                    <Pencil size={15} />
                                </button>
                                {!b.is_main && (
                                    <button onClick={() => deleteBranch(b.id)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-app-text-muted hover:text-red-400">
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {adding ? (
                <div className="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
                    <h4 className="font-semibold text-app-text text-sm">Nueva sucursal</h4>
                    {branchInputs(newForm, setNewForm)}
                    <div className="flex gap-2">
                        <button onClick={createBranch} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-app-accent hover:opacity-90 rounded-xl text-white text-sm font-medium transition-all">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Crear
                        </button>
                        <button onClick={() => { setAdding(false); setError(''); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-app-bg border border-app-border rounded-xl text-app-text-muted text-sm transition-all hover:text-app-text">
                            <X size={14} /> Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <button onClick={() => { setAdding(true); setError(''); }}
                    className="flex items-center gap-2 w-full px-5 py-3 border border-dashed border-app-border hover:border-app-accent/50 text-app-text-muted hover:text-app-accent rounded-2xl text-sm transition-all justify-center">
                    <Plus size={16} /> Agregar sucursal
                </button>
            )}
        </div>
    );
}

// ── Planes ──────────────────────────────────────────────────────────
function PlanesTab() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

    useEffect(() => {
        api.get('/subscription/status').then(({ data }) => setStatus(data)).finally(() => setLoading(false));
    }, []);

    const checkout = async (plan: string) => {
        setCheckoutLoading(plan);
        try {
            const { data } = await api.post('/subscription/checkout', { plan });
            window.location.href = data.checkoutUrl;
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Error al crear el link de pago.');
            setCheckoutLoading(null);
        }
    };

    if (loading) return (
        <div className="flex items-center gap-2 text-app-text-muted py-8">
            <Loader2 size={18} className="animate-spin" /> Cargando plan...
        </div>
    );

    const current = status?.plan || 'TRIAL';
    const info = PLAN_INFO[current] || PLAN_INFO.TRIAL;
    const Icon = info.icon;
    const daysLeft = status?.daysLeft ?? 0;
    const endDate = status?.endDate ? new Date(status.endDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

    const upgradePlans = [
        { key: 'MONTHLY',   label: 'Mensual',    price: 170000,  period: '/mes',      icon: Zap,   color: 'border-blue-500/30 hover:border-blue-500/60',   badge: '' },
        { key: 'QUARTERLY', label: 'Trimestral', price: 450000,  period: '/3 meses',  icon: Star,  color: 'border-purple-500/40 hover:border-purple-500/70', badge: 'Ahorra $60.000' },
        { key: 'ANNUAL',    label: 'Anual',      price: 1500000, period: '/año',       icon: Crown, color: 'border-amber-500/30 hover:border-amber-500/60',  badge: 'Ahorra $540.000' },
    ];

    return (
        <div className="max-w-xl space-y-6">
            {/* Plan actual */}
            <div className="bg-app-card border border-app-border rounded-2xl p-6">
                <p className="text-xs font-medium text-app-text-muted uppercase tracking-wide mb-4">Plan actual</p>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-app-accent/10 border border-app-accent/20 flex items-center justify-center">
                        <Icon size={22} className={info.color} />
                    </div>
                    <div>
                        <p className={`text-xl font-bold ${info.color}`}>{info.label}</p>
                        {current !== 'TRIAL' && info.price > 0 && (
                            <p className="text-sm text-app-text-muted">{fmt(info.price)}{info.period}</p>
                        )}
                    </div>
                </div>
                {endDate && (
                    <div className={`mt-4 flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border ${daysLeft <= 3 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-app-bg border-app-border text-app-text-muted'}`}>
                        {daysLeft <= 3 ? '⚠️' : '📅'}
                        {daysLeft > 0 ? `Vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} — ${endDate}` : `Venció el ${endDate}`}
                    </div>
                )}
            </div>

            {/* Opciones de upgrade */}
            <div>
                <p className="text-xs font-medium text-app-text-muted uppercase tracking-wide mb-3">
                    {current === 'TRIAL' ? 'Elige un plan' : 'Cambiar plan'}
                </p>
                <div className="space-y-3">
                    {upgradePlans.map(plan => {
                        const PlanIcon = plan.icon;
                        const isCurrent = plan.key === current;
                        return (
                            <div key={plan.key}
                                className={`flex items-center justify-between gap-4 bg-app-card border ${isCurrent ? 'border-app-accent/50' : plan.color} rounded-2xl p-4 transition-all`}>
                                <div className="flex items-center gap-3">
                                    <PlanIcon size={18} className="text-app-text-muted" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-app-text text-sm">{plan.label}</span>
                                            {plan.badge && (
                                                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">
                                                    {plan.badge}
                                                </span>
                                            )}
                                            {isCurrent && (
                                                <span className="text-[10px] px-2 py-0.5 bg-app-accent/15 text-app-accent border border-app-accent/20 rounded-full font-medium">
                                                    Activo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-app-text-muted">{fmt(plan.price)}{plan.period}</p>
                                    </div>
                                </div>
                                {!isCurrent && (
                                    <button onClick={() => checkout(plan.key)} disabled={checkoutLoading !== null}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-app-accent hover:opacity-90 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-all shrink-0">
                                        {checkoutLoading === plan.key ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                                        Suscribirme
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Integraciones ────────────────────────────────────────────────────
function IntegracionesTab() {
    const [connected, setConnected] = useState<string | null>(null);
    const [form, setForm] = useState({ store: '', token: '', locationId: '' });
    const [oauthShop, setOauthShop] = useState('');
    const [saving, setSaving] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [msg, setMsg] = useState('');
    const [disconnecting, setDisconnecting] = useState(false);

    useEffect(() => {
        api.get('/companies/me').then(({ data }) => {
            if (data.shopify_store) {
                setConnected(data.shopify_store);
                setForm(f => ({ ...f, store: data.shopify_store }));
                setOauthShop(data.shopify_store);
            }
        });
    }, []);

    const save = async () => {
        if (!form.store.trim() || !form.token.trim() || !form.locationId.trim())
            return setMsg('Todos los campos son obligatorios.');
        setSaving(true); setMsg('');
        try {
            await api.patch('/shopify/credentials', {
                store: form.store.trim(),
                token: form.token.trim(),
                locationId: form.locationId.trim(),
            });
            setConnected(form.store.trim());
            setMsg('Shopify conectado correctamente.');
        } catch (e: any) {
            setMsg(e?.response?.data?.message || 'Error al guardar.');
        } finally {
            setSaving(false);
        }
    };

    const connectOAuth = async () => {
        if (!oauthShop.trim()) return setMsg('Ingresa el dominio de la tienda.');
        setConnecting(true); setMsg('');
        try {
            const { data } = await api.get(`/shopify/connect-url?shop=${encodeURIComponent(oauthShop.trim())}`);
            window.open(data.url, '_blank');
            setMsg('Se abrió la ventana de Shopify. Luego de autorizar, recarga esta página.');
        } catch (e: any) {
            setMsg(e?.response?.data?.message || 'Error al generar el enlace.');
        } finally {
            setConnecting(false);
        }
    };

    const disconnect = async () => {
        if (!confirm('¿Deseas desvincular Shopify de esta empresa?')) return;
        setDisconnecting(true);
        try {
            await api.delete('/shopify/credentials');
            setConnected(null);
            setForm({ store: '', token: '', locationId: '' });
            setOauthShop('');
            setMsg('Shopify desvinculado.');
        } catch {
            setMsg('Error al desvincular.');
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <div className="max-w-lg space-y-5">
            <Section title="Shopify">
                {connected ? (
                    <div className="flex items-center justify-between gap-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-emerald-400">
                            <Check size={14} /> Conectado a <span className="font-mono font-semibold">{connected}</span>
                        </div>
                        <button
                            onClick={disconnect}
                            disabled={disconnecting}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            {disconnecting ? <Loader2 size={13} className="animate-spin" /> : 'Desvincular'}
                        </button>
                    </div>
                ) : null}

                {/* Opción 1: OAuth (Dev Dashboard) */}
                <div className="border border-app-border rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-app-text uppercase tracking-wide">Opción A — OAuth (Dev Dashboard)</p>
                    <div>
                        <label className={labelCls}>Dominio de la tienda</label>
                        <input
                            className={inputCls}
                            value={oauthShop}
                            onChange={e => setOauthShop(e.target.value)}
                            placeholder="ej. mitienda.myshopify.com"
                        />
                    </div>
                    <button
                        onClick={connectOAuth}
                        disabled={connecting}
                        className="flex items-center gap-2 px-4 py-2 bg-[#5C6AC4] hover:opacity-90 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-all"
                    >
                        {connecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                        Conectar via OAuth
                    </button>
                </div>

                {/* Opción 2: token manual */}
                <div className="border border-app-border rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-app-text uppercase tracking-wide">Opción B — Token manual (Custom App)</p>
                    <div>
                        <label className={labelCls}>Dominio de la tienda</label>
                        <input
                            className={inputCls}
                            value={form.store}
                            onChange={e => setForm(f => ({ ...f, store: e.target.value }))}
                            placeholder="ej. mitienda.myshopify.com"
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Admin API Access Token</label>
                        <input
                            type="password"
                            className={inputCls}
                            value={form.token}
                            onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
                            placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Location ID</label>
                        <input
                            className={inputCls}
                            value={form.locationId}
                            onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}
                            placeholder="ej. 12345678901"
                        />
                    </div>
                    <button
                        onClick={save}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-app-accent hover:opacity-90 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-all"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {connected ? 'Actualizar credenciales' : 'Guardar credenciales'}
                    </button>
                </div>

                <Msg text={msg} />
            </Section>
        </div>
    );
}

// ── Página principal ────────────────────────────────────────────────
export default function CuentaPage() {
    const [tab, setTab] = useState<Tab>('perfil');

    return (
        <DashboardLayout>
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-app-text flex items-center gap-3">
                        <User size={32} className="text-cyan-400" />
                        Mi cuenta
                    </h1>
                    <p className="text-app-text-muted mt-1">Gestiona tu perfil, empresa, sucursales y suscripción.</p>
                </div>

                <div className="flex bg-app-card p-1 rounded-xl border border-app-border self-start flex-wrap gap-0.5">
                    {TABS.map(({ key, label }) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                                tab === key
                                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                    : 'text-app-text-muted hover:text-app-text'
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'perfil'        && <PerfilTab />}
            {tab === 'empresa'       && <EmpresaTab />}
            {tab === 'sucursales'    && <SucursalesTab />}
            {tab === 'planes'        && <PlanesTab />}
            {tab === 'integraciones' && <IntegracionesTab />}
        </DashboardLayout>
    );
}
