import { toast } from "../lib/toast";
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../api/axios";
import { useAuth } from "../auth/AuthContext";
import EditPurchaseModal, { type EditablePurchase } from "../components/purchases/EditPurchaseModal";
import PayableInvoiceModal, { type PayableInvoice } from "../components/purchases/PayableInvoiceModal";
import {
    Truck, Phone, Mail, Package, ChevronDown, ChevronUp,
    AlertCircle, CheckCircle2, Clock, Search, Edit2, X,
    CreditCard, Banknote, ArrowLeftRight, Plus, Ban, AlertTriangle, Loader2, Wallet
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface SupplierStat {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    purchaseCount: number;
    totalInvoiced: number;
    totalPaid: number;
    balance: number;
    creditBalance: number;
    lastPurchase: string | null;
}

interface PurchasePayment {
    id: string;
    amount: number;
    payment_method: string | null;
    notes: string | null;
    created_at: string;
    users: { name: string } | null;
}

interface PurchaseItem {
    id: string;
    product_id: string | null;
    variant_id: string | null;
    description?: string | null;
    quantity: number;
    cost: number;
    products: {
        id?: string;
        name: string;
        sku: string;
        unit_type: string;
        has_variants?: boolean;
        sale_price?: number;
        cost_price?: number;
    } | null;
    variants?: { id: string; sku: string; sale_price?: number; cost_price?: number } | null;
}

interface SupplierPurchase {
    id: string;
    total: number;
    paid_amount: number;
    status: string;
    due_date: string | null;
    created_at: string;
    affects_inventory?: boolean;
    invoice_number?: string | null;
    invoice_date?: string | null;
    notes?: string | null;
    purchase_items: PurchaseItem[];
    purchase_payments: PurchasePayment[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const cop = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const fDate = (d: string) =>
    new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

const methodLabel: Record<string, string> = {
    CASH: "Efectivo",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
};

const MethodIcon = ({ method }: { method: string | null }) => {
    if (method === "CARD") return <CreditCard size={12} className="inline mr-1" />;
    if (method === "TRANSFER") return <ArrowLeftRight size={12} className="inline mr-1" />;
    return <Banknote size={12} className="inline mr-1" />;
};

const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; cls: string; Icon: any }> = {
        PAID:    { label: "Pagado",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", Icon: CheckCircle2 },
        PARTIAL: { label: "Parcial",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",     Icon: Clock },
        PENDING: { label: "Pendiente",cls: "bg-rose-500/15 text-rose-400 border-rose-500/30",         Icon: AlertCircle },
        CANCELLED: { label: "Anulada",cls: "bg-app-border/40 text-app-text-muted border-app-border",  Icon: Ban },
    };
    const { label, cls, Icon } = map[status] ?? map.PENDING;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${cls}`}>
            <Icon size={10} /> {label}
        </span>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function SuppliersPage() {
    const { user, hasPermission } = useAuth();
    const role = user?.role?.toUpperCase();
    const canEditPurchases =
        role === "ADMIN" || role === "SUPERADMIN" || hasPermission("purchases.edit");

    const [suppliers, setSuppliers] = useState<SupplierStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<SupplierStat | null>(null);
    const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
    const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Edit supplier
    const [editOpen, setEditOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Payment modal
    const [payingId, setPayingId] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("CASH");
    const [paySource, setPaySource] = useState<"CASH" | "CARTERA">("CASH");
    const [isSubmittingPay, setIsSubmittingPay] = useState(false);

    // Edit / cancel purchase
    const [editingPurchase, setEditingPurchase] = useState<SupplierPurchase | null>(null);
    const [payableModal, setPayableModal] = useState<{ mode: "create" } | { mode: "edit"; invoice: SupplierPurchase } | null>(null);
    const [cancelTarget, setCancelTarget] = useState<SupplierPurchase | null>(null);
    const [cancelRefund, setCancelRefund] = useState<"AUTO" | "CREDIT">("AUTO");
    const [isCancelling, setIsCancelling] = useState(false);

    // Transferir saldo a favor a cartera
    const [creditModalOpen, setCreditModalOpen] = useState(false);
    const [creditAmount, setCreditAmount] = useState("");
    const [isTransferring, setIsTransferring] = useState(false);

    const reloadAfterChange = async () => {
        if (!selected) return;
        const [purchasesRes] = await Promise.all([
            api.get(`/suppliers/${selected.id}/purchases`),
            loadSuppliers(),
        ]);
        setPurchases(purchasesRes.data);
    };

    const openCancel = (p: SupplierPurchase) => {
        setCancelTarget(p);
        setCancelRefund("AUTO");
    };

    const handleCancelPurchase = async () => {
        if (!cancelTarget) return;
        setIsCancelling(true);
        try {
            await api.delete(`/purchases/${cancelTarget.id}`, { data: { refund: cancelRefund } });
            toast.success(
                cancelRefund === "CREDIT" && Number(cancelTarget.paid_amount) > 0
                    ? "Factura anulada. Lo pagado quedó como saldo a favor del proveedor."
                    : "Factura anulada. Stock, caja y cartera revertidos.",
            );
            setCancelTarget(null);
            setExpandedId(null);
            await reloadAfterChange();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Error al anular la factura");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleTransferCredit = async () => {
        if (!selected) return;
        const amt = parseFloat(creditAmount);
        if (isNaN(amt) || amt <= 0 || amt > selected.creditBalance + 0.001) {
            return toast.warning("Monto inválido");
        }
        setIsTransferring(true);
        try {
            await api.post(`/suppliers/${selected.id}/credit/to-cartera`, { amount: amt });
            toast.success("Saldo a favor transferido a cartera.");
            setCreditModalOpen(false);
            setCreditAmount("");
            await reloadAfterChange();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Error al transferir el saldo");
        } finally {
            setIsTransferring(false);
        }
    };

    // ── Load suppliers ──────────────────────────────────────────────────────

    const loadSuppliers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/suppliers");
            setSuppliers(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadSuppliers(); }, []);

    // ── Select supplier → load purchases ───────────────────────────────────

    const selectSupplier = async (s: SupplierStat) => {
        setSelected(s);
        setExpandedId(null);
        setIsLoadingPurchases(true);
        try {
            const res = await api.get(`/suppliers/${s.id}/purchases`);
            setPurchases(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingPurchases(false);
        }
    };

    // ── Save edit ──────────────────────────────────────────────────────────

    const openEdit = () => {
        if (!selected) return;
        setEditName(selected.name);
        setEditPhone(selected.phone ?? "");
        setEditEmail(selected.email ?? "");
        setEditOpen(true);
    };

    const saveEdit = async () => {
        if (!selected || !editName.trim()) return;
        setIsSaving(true);
        try {
            await api.put(`/suppliers/${selected.id}`, {
                name: editName.trim(),
                phone: editPhone.trim() || undefined,
                email: editEmail.trim() || undefined,
            });
            await loadSuppliers();
            setSelected(prev => prev ? { ...prev, name: editName.trim(), phone: editPhone.trim() || null, email: editEmail.trim() || null } : prev);
            setEditOpen(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Register payment ───────────────────────────────────────────────────

    const openPayment = (purchaseId: string, balance: number) => {
        setPayingId(purchaseId);
        setPayAmount(balance.toFixed(0));
        setPayMethod("CASH");
        setPaySource("CASH");
    };

    const submitPayment = async () => {
        if (!payingId || !payAmount || !selected) return;
        const amount = parseFloat(payAmount);
        if (isNaN(amount) || amount <= 0) return;
        setIsSubmittingPay(true);
        try {
            await api.post(`/purchases/${payingId}/payments`, {
                amount,
                method: payMethod,
                paymentSource: paySource,
            });
            // Refresh both the purchase list and supplier stats
            const [purchasesRes] = await Promise.all([
                api.get(`/suppliers/${selected.id}/purchases`),
                loadSuppliers(),
            ]);
            setPurchases(purchasesRes.data);
            // Update selected stats from refreshed list
            setSelected(prev => prev
                ? { ...prev } // will be updated by loadSuppliers effect below
                : prev
            );
            setPayingId(null);
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Error registrando el abono");
        } finally {
            setIsSubmittingPay(false);
        }
    };

    // Keep selected in sync after loadSuppliers refreshes
    useEffect(() => {
        if (selected) {
            const fresh = suppliers.find(s => s.id === selected.id);
            if (fresh) setSelected(fresh);
        }
    }, [suppliers]);

    // ── Filtered list ──────────────────────────────────────────────────────

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone ?? "").includes(search) ||
        (s.email ?? "").toLowerCase().includes(search.toLowerCase())
    );

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <DashboardLayout>
            <div className="space-y-6">

                {/* Page header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/20 text-violet-400 rounded-lg">
                        <Truck size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-app-text drop-shadow-md">Proveedores</h1>
                        <p className="text-app-text-muted text-sm font-medium">Facturas e historial de pagos por proveedor</p>
                    </div>
                </div>

                {/* Two-panel layout */}
                <div className="flex gap-4 min-h-[70vh]">

                    {/* LEFT — Supplier list */}
                    <div className={`flex flex-col gap-3 ${selected ? "hidden lg:flex lg:w-80 shrink-0" : "flex-1"}`}>

                        {/* Search */}
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar proveedor..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-app-card border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-app-text placeholder-app-text-muted/50 focus:outline-none focus:border-violet-500/50 transition-colors"
                            />
                        </div>

                        {/* Stats summary row */}
                        {!isLoading && suppliers.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: "Proveedores", value: suppliers.length, cls: "text-app-text" },
                                    { label: "Total facturado", value: cop(suppliers.reduce((s, x) => s + x.totalInvoiced, 0)), cls: "text-app-text" },
                                    { label: "Por pagar", value: cop(suppliers.reduce((s, x) => s + x.balance, 0)), cls: suppliers.some(x => x.balance > 0) ? "text-rose-400" : "text-emerald-400" },
                                ].map(c => (
                                    <div key={c.label} className="bg-app-card border border-app-border rounded-xl p-3 text-center">
                                        <p className={`text-xs font-black ${c.cls}`}>{c.value}</p>
                                        <p className="text-[9px] text-app-text-muted uppercase tracking-widest mt-0.5">{c.label}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Supplier cards */}
                        <div className="flex flex-col gap-2 overflow-y-auto">
                            {isLoading ? (
                                <p className="text-center text-app-text-muted py-10 text-sm">Cargando proveedores...</p>
                            ) : filtered.length === 0 ? (
                                <div className="text-center py-10 text-app-text-muted">
                                    <Truck size={32} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">Sin proveedores registrados</p>
                                </div>
                            ) : filtered.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => selectSupplier(s)}
                                    className={`w-full text-left bg-app-card border rounded-xl p-4 transition-all hover:border-violet-500/40 ${
                                        selected?.id === s.id
                                            ? "border-violet-500/60 bg-violet-500/5 shadow-lg shadow-violet-500/10"
                                            : "border-app-border"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-black text-sm text-app-text truncate">{s.name}</p>
                                            {s.phone && (
                                                <p className="text-[11px] text-app-text-muted mt-0.5 flex items-center gap-1">
                                                    <Phone size={10} /> {s.phone}
                                                </p>
                                            )}
                                            {s.email && (
                                                <p className="text-[11px] text-app-text-muted flex items-center gap-1 truncate">
                                                    <Mail size={10} /> {s.email}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-black text-app-text">{s.purchaseCount} fact.</p>
                                            {s.balance > 0 && (
                                                <p className="text-[11px] font-bold text-rose-400 mt-0.5">{cop(s.balance)}</p>
                                            )}
                                        </div>
                                    </div>
                                    {s.purchaseCount > 0 && (
                                        <div className="mt-2 pt-2 border-t border-app-border/50 flex justify-between text-[10px] text-app-text-muted">
                                            <span>Facturado: <span className="text-app-text font-bold">{cop(s.totalInvoiced)}</span></span>
                                            <span>Pagado: <span className="text-emerald-400 font-bold">{cop(s.totalPaid)}</span></span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT — Purchase detail */}
                    {selected && (
                        <div className="flex-1 flex flex-col gap-4 min-w-0">

                            {/* Supplier header */}
                            <div className="bg-app-card border border-app-border rounded-2xl p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        {/* Back button (mobile) */}
                                        <button
                                            onClick={() => setSelected(null)}
                                            className="lg:hidden p-2 text-app-text-muted hover:text-app-text bg-app-bg rounded-lg border border-app-border"
                                        >
                                            <X size={16} />
                                        </button>
                                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                                            <Truck size={20} className="text-violet-400" />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-lg text-app-text">{selected.name}</h2>
                                            <div className="flex gap-3 mt-0.5">
                                                {selected.phone && (
                                                    <span className="text-xs text-app-text-muted flex items-center gap-1">
                                                        <Phone size={11} /> {selected.phone}
                                                    </span>
                                                )}
                                                {selected.email && (
                                                    <span className="text-xs text-app-text-muted flex items-center gap-1">
                                                        <Mail size={11} /> {selected.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={openEdit}
                                        className="p-2 bg-app-bg border border-app-border rounded-lg text-app-text-muted hover:text-app-text hover:bg-violet-500/10 transition-all"
                                        title="Editar proveedor"
                                    >
                                        <Edit2 size={15} />
                                    </button>
                                </div>

                                {/* Stats strip */}
                                <div className={`grid gap-3 mt-4 ${selected.creditBalance > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
                                    {[
                                        { label: "Facturas", value: selected.purchaseCount, cls: "text-app-text" },
                                        { label: "Total facturado", value: cop(selected.totalInvoiced), cls: "text-app-text" },
                                        { label: "Saldo pendiente", value: cop(selected.balance), cls: selected.balance > 0 ? "text-rose-400" : "text-emerald-400" },
                                        ...(selected.creditBalance > 0
                                            ? [{ label: "Saldo a favor", value: cop(selected.creditBalance), cls: "text-emerald-400" }]
                                            : []),
                                    ].map(c => (
                                        <div key={c.label} className="bg-app-bg rounded-xl p-3 text-center border border-app-border/50">
                                            <p className={`text-sm font-black ${c.cls}`}>{c.value}</p>
                                            <p className="text-[9px] text-app-text-muted uppercase tracking-widest mt-0.5">{c.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {selected.creditBalance > 0 && (
                                    <button
                                        onClick={() => { setCreditAmount(String(Math.round(selected.creditBalance))); setCreditModalOpen(true); }}
                                        className="mt-3 w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-black text-xs border border-emerald-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Wallet size={13} /> PASAR SALDO A FAVOR A CARTERA
                                    </button>
                                )}

                                {canEditPurchases && (
                                    <button
                                        onClick={() => setPayableModal({ mode: "create" })}
                                        className="mt-2 w-full py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 font-black text-xs border border-violet-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={13} /> NUEVA FACTURA POR PAGAR
                                    </button>
                                )}
                            </div>

                            {/* Invoice list */}
                            <div className="flex flex-col gap-2">
                                {isLoadingPurchases ? (
                                    <p className="text-center text-app-text-muted py-10 text-sm">Cargando facturas...</p>
                                ) : purchases.length === 0 ? (
                                    <div className="bg-app-card border border-app-border rounded-2xl p-12 text-center">
                                        <Package size={36} className="mx-auto text-app-text-muted mb-3 opacity-40" />
                                        <p className="text-app-text-muted text-sm">Este proveedor no tiene facturas registradas</p>
                                    </div>
                                ) : purchases.map(p => {
                                    const balance = Number(p.total) - Number(p.paid_amount);
                                    const isExpanded = expandedId === p.id;
                                    const isOverdue = p.due_date && new Date(p.due_date) < new Date() && p.status !== "PAID";

                                    return (
                                        <div
                                            key={p.id}
                                            className={`bg-app-card border rounded-xl overflow-hidden transition-all ${
                                                isOverdue ? "border-rose-500/40" : "border-app-border"
                                            }`}
                                        >
                                            {/* Invoice row header */}
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-app-accent/5 transition-colors"
                                            >
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-mono text-[11px] text-app-accent font-black">
                                                            #{p.id.split("-")[0].toUpperCase()}
                                                        </span>
                                                        <StatusBadge status={p.status} />
                                                        {p.affects_inventory === false && (
                                                            <span className="text-[9px] font-black text-app-text-muted bg-app-border/40 border border-app-border px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                                Sin inventario
                                                            </span>
                                                        )}
                                                        {p.invoice_number && (
                                                            <span className="text-[9px] font-bold text-app-text-muted">
                                                                Fact. {p.invoice_number}
                                                            </span>
                                                        )}
                                                        {isOverdue && (
                                                            <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                                Vencido
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-app-text-muted mt-0.5">
                                                        {fDate(p.created_at)}
                                                        {p.due_date && p.status !== "PAID" && (
                                                            <span className="ml-2">· Vence: {fDate(p.due_date)}</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-black text-app-text">{cop(Number(p.total))}</p>
                                                    {balance > 0 && (
                                                        <p className="text-[11px] text-rose-400 font-bold">Debe: {cop(balance)}</p>
                                                    )}
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp size={16} className="text-app-text-muted shrink-0" />
                                                ) : (
                                                    <ChevronDown size={16} className="text-app-text-muted shrink-0" />
                                                )}
                                            </button>

                                            {/* Expanded detail */}
                                            {isExpanded && (
                                                <div className="border-t border-app-border px-4 py-4 space-y-4">

                                                    {/* Items table */}
                                                    <div>
                                                        <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-2">
                                                            Artículos ({p.purchase_items.length})
                                                        </p>
                                                        <div className="rounded-xl border border-app-border overflow-hidden">
                                                            <table className="w-full text-xs">
                                                                <thead className="bg-app-bg">
                                                                    <tr className="text-[9px] uppercase tracking-widest text-app-text-muted">
                                                                        <th className="px-3 py-2 text-left">Producto</th>
                                                                        <th className="px-3 py-2 text-center">Cant.</th>
                                                                        <th className="px-3 py-2 text-right">Costo unit.</th>
                                                                        <th className="px-3 py-2 text-right">Subtotal</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-app-border/40">
                                                                    {p.purchase_items.map(item => (
                                                                        <tr key={item.id}>
                                                                            <td className="px-3 py-2">
                                                                                <p className="font-bold text-app-text">{item.products?.name ?? "Producto"}</p>
                                                                                <p className="text-[9px] text-app-text-muted font-mono">
                                                                                    {item.variants?.sku ?? item.products?.sku ?? "—"}
                                                                                </p>
                                                                            </td>
                                                                            <td className="px-3 py-2 text-center text-app-text font-bold">
                                                                                {Number(item.quantity).toLocaleString()}
                                                                                <span className="text-[9px] text-app-text-muted ml-0.5">
                                                                                    {item.products?.unit_type === "WEIGHT" ? "Kg" : "Un"}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right text-app-text">{cop(Number(item.cost))}</td>
                                                                            <td className="px-3 py-2 text-right font-bold text-app-text">
                                                                                {cop(Number(item.quantity) * Number(item.cost))}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    {/* Payment history */}
                                                    <div>
                                                        <p className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mb-2">
                                                            Historial de pagos ({p.purchase_payments.length})
                                                        </p>
                                                        {p.purchase_payments.length === 0 ? (
                                                            <p className="text-xs text-app-text-muted italic">Sin pagos registrados</p>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                {p.purchase_payments.map((pay, i) => (
                                                                    <div
                                                                        key={pay.id}
                                                                        className="flex items-center justify-between bg-app-bg rounded-lg px-3 py-2 border border-app-border/50"
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-black shrink-0">
                                                                                {i + 1}
                                                                            </span>
                                                                            <div className="min-w-0">
                                                                                <p className="text-[11px] text-app-text font-bold">
                                                                                    <MethodIcon method={pay.payment_method} />
                                                                                    {methodLabel[pay.payment_method ?? ""] ?? pay.payment_method ?? "—"}
                                                                                </p>
                                                                                <p className="text-[10px] text-app-text-muted truncate">
                                                                                    {fDate(pay.created_at)}
                                                                                    {pay.users?.name && ` · ${pay.users.name}`}
                                                                                    {pay.notes && ` · ${pay.notes}`}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-sm font-black text-emerald-400 shrink-0">
                                                                            {cop(Number(pay.amount))}
                                                                        </span>
                                                                    </div>
                                                                ))}

                                                                {/* Balance row */}
                                                                <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-app-card border border-app-border mt-1">
                                                                    <span className="text-[11px] font-black text-app-text-muted uppercase tracking-widest">Saldo pendiente</span>
                                                                    <span className={`text-sm font-black ${balance > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                                                                        {cop(balance)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Register payment button */}
                                                    {p.status !== "PAID" && p.status !== "CANCELLED" && (
                                                        <button
                                                            onClick={() => openPayment(p.id, balance)}
                                                            className="w-full py-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 font-black text-xs border border-violet-500/30 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Plus size={14} /> REGISTRAR ABONO
                                                        </button>
                                                    )}

                                                    {/* Admin actions */}
                                                    {canEditPurchases && p.status !== "CANCELLED" && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => p.affects_inventory === false
                                                                    ? setPayableModal({ mode: "edit", invoice: p })
                                                                    : setEditingPurchase(p)}
                                                                className="flex-1 py-2.5 rounded-xl bg-app-bg hover:bg-app-border/40 text-app-text font-black text-xs border border-app-border transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Edit2 size={13} /> EDITAR FACTURA
                                                            </button>
                                                            <button
                                                                onClick={() => openCancel(p)}
                                                                className="flex-1 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-black text-xs border border-rose-500/30 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <Ban size={13} /> ANULAR FACTURA
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty state when no supplier selected (desktop) */}
                    {!selected && !isLoading && suppliers.length > 0 && (
                        <div className="hidden lg:flex flex-1 items-center justify-center bg-app-card border border-app-border rounded-2xl">
                            <div className="text-center text-app-text-muted">
                                <Truck size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">Selecciona un proveedor para ver sus facturas</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Edit Supplier Modal ─────────────────────────────────────── */}
            {editOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-app-bg/80 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
                    <div className="relative w-full max-w-sm bg-app-card border border-app-border rounded-2xl shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-black text-app-text">Editar Proveedor</h3>
                            <button onClick={() => setEditOpen(false)} className="text-app-text-muted hover:text-app-text">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={editPhone}
                                    onChange={e => setEditPhone(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editEmail}
                                    onChange={e => setEditEmail(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setEditOpen(false)} className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text-muted text-sm font-bold hover:text-app-text transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={isSaving || !editName.trim()}
                                className="flex-[2] py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm transition-colors disabled:opacity-40"
                            >
                                {isSaving ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Register Payment Modal ──────────────────────────────────── */}
            {payingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-app-bg/80 backdrop-blur-sm" onClick={() => setPayingId(null)} />
                    <div className="relative w-full max-w-sm bg-app-card border border-app-border rounded-2xl shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-black text-app-text">Registrar Abono</h3>
                            <button onClick={() => setPayingId(null)} className="text-app-text-muted hover:text-app-text">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Monto del Abono</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={payAmount}
                                    onChange={e => setPayAmount(e.target.value)}
                                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-xl font-black text-app-text focus:outline-none focus:border-violet-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Fuente del pago</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "CASH" as const, label: "Sale de caja" },
                                        { id: "CARTERA" as const, label: "Sale de cartera" },
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setPaySource(s.id)}
                                            className={`py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                                                paySource === s.id
                                                    ? "bg-violet-500/10 border-violet-500/50 text-violet-400"
                                                    : "border-app-border text-app-text-muted hover:border-app-text"
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Método de Pago</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: "CASH", label: "Efectivo", Icon: Banknote },
                                        { id: "CARD", label: "Tarjeta", Icon: CreditCard },
                                        { id: "TRANSFER", label: "Transf.", Icon: ArrowLeftRight },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setPayMethod(m.id)}
                                            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                                payMethod === m.id
                                                    ? "bg-violet-500/10 border-violet-500/50 text-violet-400"
                                                    : "border-app-border text-app-text-muted hover:border-app-text"
                                            }`}
                                        >
                                            <m.Icon size={16} />
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setPayingId(null)} className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text-muted text-sm font-bold hover:text-app-text transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={submitPayment}
                                disabled={isSubmittingPay || !payAmount || Number(payAmount) <= 0}
                                className="flex-[2] py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {isSubmittingPay ? "Registrando..." : <>
                                    <Plus size={15} /> Registrar Abono
                                </>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Purchase Modal ─────────────────────────────────────── */}
            {editingPurchase && (
                <EditPurchaseModal
                    purchase={editingPurchase satisfies EditablePurchase}
                    supplierId={selected?.id ?? ""}
                    onClose={() => setEditingPurchase(null)}
                    onSaved={async () => {
                        setEditingPurchase(null);
                        setExpandedId(null);
                        await reloadAfterChange();
                    }}
                />
            )}

            {/* ── Payable Invoice Modal (crear / editar) ──────────────────── */}
            {payableModal && selected && (
                <PayableInvoiceModal
                    supplierId={selected.id}
                    supplierName={selected.name}
                    invoice={payableModal.mode === "edit" ? (payableModal.invoice satisfies PayableInvoice) : undefined}
                    onClose={() => setPayableModal(null)}
                    onSaved={async () => {
                        setPayableModal(null);
                        setExpandedId(null);
                        await reloadAfterChange();
                    }}
                />
            )}

            {/* ── Cancel Purchase Confirm ─────────────────────────────────── */}
            {cancelTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-app-bg/80 backdrop-blur-sm" onClick={() => setCancelTarget(null)} />
                    <div className="relative w-full max-w-sm bg-app-card border border-rose-500/30 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle size={20} className="text-rose-400" />
                            </div>
                            <div>
                                <h3 className="font-black text-app-text text-lg">Anular factura</h3>
                                <p className="text-sm text-app-text-muted mt-1">
                                    Se revertirá el stock recibido. No se puede deshacer.
                                </p>
                            </div>
                        </div>

                        {Number(cancelTarget.paid_amount) > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-2">
                                    Esta factura tiene {cop(Number(cancelTarget.paid_amount))} pagados
                                </p>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setCancelRefund("AUTO")}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${
                                            cancelRefund === "AUTO"
                                                ? "border-violet-500/60 bg-violet-500/10 text-app-text"
                                                : "border-app-border text-app-text-muted hover:text-app-text"
                                        }`}
                                    >
                                        <span className="font-black block">Devolver a caja / cartera</span>
                                        <span className="text-[11px]">Revierte el pago de donde salió.</span>
                                    </button>
                                    <button
                                        onClick={() => setCancelRefund("CREDIT")}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${
                                            cancelRefund === "CREDIT"
                                                ? "border-emerald-500/60 bg-emerald-500/10 text-app-text"
                                                : "border-app-border text-app-text-muted hover:text-app-text"
                                        }`}
                                    >
                                        <span className="font-black block">Dejar como saldo a favor</span>
                                        <span className="text-[11px]">Queda como crédito del proveedor para futuras compras.</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setCancelTarget(null)} className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text-muted text-sm font-bold hover:text-app-text transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleCancelPurchase}
                                disabled={isCancelling}
                                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                {isCancelling ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                                Anular
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Transferir saldo a favor a cartera ──────────────────────── */}
            {creditModalOpen && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-app-bg/80 backdrop-blur-sm" onClick={() => setCreditModalOpen(false)} />
                    <div className="relative w-full max-w-sm bg-app-card border border-app-border rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-app-text">Pasar saldo a favor a cartera</h3>
                            <button onClick={() => setCreditModalOpen(false)} className="text-app-text-muted hover:text-app-text">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-app-text-muted">
                            Saldo a favor disponible: <span className="text-emerald-400 font-black">{cop(selected.creditBalance)}</span>
                        </p>
                        <div>
                            <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Monto a transferir</label>
                            <input
                                type="number" min="1"
                                value={creditAmount}
                                onChange={e => setCreditAmount(e.target.value)}
                                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-xl font-black text-app-text focus:outline-none focus:border-emerald-500/50"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setCreditModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text-muted text-sm font-bold hover:text-app-text transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleTransferCredit}
                                disabled={isTransferring || !creditAmount}
                                className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {isTransferring ? <Loader2 size={15} className="animate-spin" /> : <Wallet size={15} />}
                                Transferir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
