import { useEffect, useState } from 'react';
import { User, Building2, GitBranch, Save, Lock, Plus, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import { api } from '../api/axios';

const inputCls = "w-full bg-app-card border border-app-border rounded-xl px-4 py-2.5 text-app-text placeholder-app-text-muted focus:outline-none focus:ring-2 focus:ring-app-accent transition-all";

type Tab = 'perfil' | 'empresa' | 'sucursales';

interface Branch { id: string; name: string; address: string; phone: string | null; is_main: boolean; }

// ── Pestaña Perfil ──────────────────────────────────────────────────
function PerfilTab() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
    const [savingPwd, setSavingPwd] = useState(false);
    const [pwdMsg, setPwdMsg] = useState('');

    useEffect(() => {
        api.get('/users/me').then(({ data }) => { setName(data.name); setEmail(data.email); });
    }, []);

    const savePerfil = async () => {
        setSaving(true); setMsg('');
        try {
            await api.patch('/users/me', { name });
            setMsg('Nombre actualizado.');
        } catch { setMsg('Error al guardar.'); }
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
        } catch (e: any) {
            setPwdMsg(e?.response?.data?.message || 'Error al cambiar contraseña.');
        } finally { setSavingPwd(false); }
    };

    return (
        <div className="space-y-8 max-w-lg">
            {/* Datos personales */}
            <div className="bg-app-card border border-app-border rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-app-text text-lg">Datos personales</h3>
                <div>
                    <label className="text-sm text-app-text-muted mb-1 block">Nombre</label>
                    <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
                </div>
                <div>
                    <label className="text-sm text-app-text-muted mb-1 block">Correo electrónico</label>
                    <input className={inputCls + ' opacity-60 cursor-not-allowed'} value={email} disabled />
                </div>
                {msg && <p className="text-sm text-green-400">{msg}</p>}
                <button onClick={savePerfil} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-app-accent hover:opacity-90 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-all">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
                </button>
            </div>

            {/* Cambiar contraseña */}
            <div className="bg-app-card border border-app-border rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-app-text text-lg flex items-center gap-2">
                    <Lock size={18} className="text-app-accent" /> Cambiar contraseña
                </h3>
                <div>
                    <label className="text-sm text-app-text-muted mb-1 block">Contraseña actual</label>
                    <input type="password" className={inputCls} value={pwd.current}
                        onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} placeholder="••••••" />
                </div>
                <div>
                    <label className="text-sm text-app-text-muted mb-1 block">Nueva contraseña</label>
                    <input type="password" className={inputCls} value={pwd.next}
                        onChange={e => setPwd(p => ({ ...p, next: e.target.value }))} placeholder="Mín. 6 caracteres" />
                </div>
                <div>
                    <label className="text-sm text-app-text-muted mb-1 block">Confirmar nueva contraseña</label>
                    <input type="password" className={inputCls} value={pwd.confirm}
                        onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} placeholder="Repetir contraseña" />
                </div>
                {pwdMsg && (
                    <p className={`text-sm ${pwdMsg.includes('Error') || pwdMsg.includes('incorrecta') || pwdMsg.includes('coinciden') || pwdMsg.includes('caracteres') ? 'text-red-400' : 'text-green-400'}`}>
                        {pwdMsg}
                    </p>
                )}
                <button onClick={savePassword} disabled={savingPwd}
                    className="flex items-center gap-2 px-5 py-2 bg-app-accent hover:opacity-90 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-all">
                    {savingPwd ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} Cambiar contraseña
                </button>
            </div>
        </div>
    );
}

// ── Pestaña Empresa ─────────────────────────────────────────────────
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
        try {
            await api.patch('/companies/me', form);
            setMsg('Datos actualizados.');
        } catch { setMsg('Error al guardar.'); }
        finally { setSaving(false); }
    };

    return (
        <div className="max-w-lg">
            <div className="bg-app-card border border-app-border rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-app-text text-lg">Datos de la empresa</h3>
                {[
                    { label: 'Nombre de la empresa', key: 'name', placeholder: 'Mi empresa' },
                    { label: 'NIT / RUT', key: 'document_number', placeholder: 'Ej. 900123456-1' },
                    { label: 'Teléfono', key: 'phone', placeholder: 'Ej. 3001234567' },
                    { label: 'Dirección', key: 'address', placeholder: 'Ej. Calle 10 #5-20' },
                ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                        <label className="text-sm text-app-text-muted mb-1 block">{label}</label>
                        <input className={inputCls} value={(form as any)[key]}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                    </div>
                ))}
                <div>
                    <label className="text-sm text-app-text-muted mb-1 block">Correo de la empresa</label>
                    <input className={inputCls + ' opacity-60 cursor-not-allowed'} value={email} disabled />
                </div>
                {msg && <p className="text-sm text-green-400">{msg}</p>}
                <button onClick={save} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-app-accent hover:opacity-90 disabled:opacity-50 rounded-xl text-white text-sm font-medium transition-all">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
                </button>
            </div>
        </div>
    );
}

// ── Pestaña Sucursales ──────────────────────────────────────────────
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
        catch (e: any) { setError(e?.response?.data?.message || 'Error al eliminar.'); }
    };

    return (
        <div className="max-w-xl space-y-4">
            {error && <p className="text-sm text-red-400">{error}</p>}

            {branches.map(b => (
                <div key={b.id} className="bg-app-card border border-app-border rounded-2xl p-5">
                    {editingId === b.id ? (
                        <div className="space-y-3">
                            <input className={inputCls} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre" />
                            <input className={inputCls} value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Dirección" />
                            <input className={inputCls} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Teléfono" />
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => saveEdit(b.id)} disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-app-accent hover:opacity-90 rounded-xl text-white text-sm font-medium transition-all">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar
                                </button>
                                <button onClick={() => setEditingId(null)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-app-card-hover border border-app-border rounded-xl text-app-text text-sm transition-all">
                                    <X size={14} /> Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-app-text">{b.name}</span>
                                    {b.is_main && <span className="text-xs px-2 py-0.5 bg-app-accent/20 text-app-accent rounded-full">Principal</span>}
                                </div>
                                {b.address && <p className="text-sm text-app-text-muted mt-0.5">{b.address}</p>}
                                {b.phone && <p className="text-sm text-app-text-muted">{b.phone}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => startEdit(b)} className="p-2 hover:bg-app-card-hover rounded-lg transition-colors text-app-text-muted hover:text-app-text">
                                    <Pencil size={16} />
                                </button>
                                {!b.is_main && (
                                    <button onClick={() => deleteBranch(b.id)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-app-text-muted hover:text-red-400">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Agregar sucursal */}
            {adding ? (
                <div className="bg-app-card border border-app-border rounded-2xl p-5 space-y-3">
                    <h4 className="font-medium text-app-text">Nueva sucursal</h4>
                    <input className={inputCls} value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre *" />
                    <input className={inputCls} value={newForm.address} onChange={e => setNewForm(f => ({ ...f, address: e.target.value }))} placeholder="Dirección" />
                    <input className={inputCls} value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} placeholder="Teléfono" />
                    <div className="flex gap-2 pt-1">
                        <button onClick={createBranch} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-app-accent hover:opacity-90 rounded-xl text-white text-sm font-medium transition-all">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Crear
                        </button>
                        <button onClick={() => { setAdding(false); setError(''); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-app-card-hover border border-app-border rounded-xl text-app-text text-sm transition-all">
                            <X size={14} /> Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <button onClick={() => { setAdding(true); setError(''); }}
                    className="flex items-center gap-2 px-5 py-2.5 border border-dashed border-app-border hover:border-app-accent text-app-text-muted hover:text-app-accent rounded-xl text-sm transition-all">
                    <Plus size={16} /> Agregar sucursal
                </button>
            )}
        </div>
    );
}

// ── Página principal ────────────────────────────────────────────────
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'perfil', label: 'Mi perfil', icon: User },
    { key: 'empresa', label: 'Mi empresa', icon: Building2 },
    { key: 'sucursales', label: 'Sucursales', icon: GitBranch },
];

export default function CuentaPage() {
    const [tab, setTab] = useState<Tab>('perfil');

    return (
        <div>
            <h1 className="text-2xl font-bold text-app-text mb-6">Mi cuenta</h1>

            {/* Pestañas */}
            <div className="flex gap-1 mb-8 bg-app-card border border-app-border p-1 rounded-xl w-fit">
                {TABS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            tab === key
                                ? 'bg-app-accent text-white shadow'
                                : 'text-app-text-muted hover:text-app-text hover:bg-app-card-hover'
                        }`}>
                        <Icon size={16} /> {label}
                    </button>
                ))}
            </div>

            {tab === 'perfil' && <PerfilTab />}
            {tab === 'empresa' && <EmpresaTab />}
            {tab === 'sucursales' && <SucursalesTab />}
        </div>
    );
}
