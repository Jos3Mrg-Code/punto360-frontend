import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../api/axios";
import { toast } from "../../lib/toast";
import { X, Trash2, Plus, Loader2, CheckCircle2, FileText } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ProductLite { id: string; name: string; sku: string; cost_price: number; }

export interface PayableInvoice {
    id: string;
    total: number;
    invoice_number?: string | null;
    invoice_date?: string | null;
    due_date?: string | null;
    notes?: string | null;
    purchase_items: {
        product_id?: string | null;
        description?: string | null;
        quantity: number | string;
        cost: number | string;
        products?: { name: string; sku: string } | null;
    }[];
}

interface Line {
    key: string;
    productId: string | null;
    label: string;      // nombre de producto o texto libre editable
    quantity: string;
    cost: string;
}

interface HistPayment {
    key: string;
    amount: string;
    date: string;
    method: string;
}

interface Props {
    supplierId: string;
    supplierName: string;
    invoice?: PayableInvoice;   // presente = modo edición
    onClose: () => void;
    onSaved: () => void;
}

const cop = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

let seq = 0;
const nk = () => `r${++seq}`;
const today = () => new Date().toISOString().split("T")[0];

// ── Componente ───────────────────────────────────────────────────────────────

export default function PayableInvoiceModal({ supplierId, supplierName, invoice, onClose, onSaved }: Props) {
    const isEdit = !!invoice;

    const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number ?? "");
    const [invoiceDate, setInvoiceDate] = useState(
        invoice?.invoice_date ? new Date(invoice.invoice_date).toISOString().split("T")[0] : today(),
    );
    const [dueDate, setDueDate] = useState(
        invoice?.due_date ? new Date(invoice.due_date).toISOString().split("T")[0] : "",
    );
    const [notes, setNotes] = useState(invoice?.notes ?? "");

    // Modo: monto único vs líneas
    const [useLines, setUseLines] = useState<boolean>((invoice?.purchase_items?.length ?? 0) > 0);
    const [manualTotal, setManualTotal] = useState(
        invoice && (invoice.purchase_items?.length ?? 0) === 0 ? String(Number(invoice.total)) : "",
    );
    const [lines, setLines] = useState<Line[]>(() =>
        (invoice?.purchase_items ?? []).map(it => ({
            key: nk(),
            productId: it.product_id ?? null,
            label: it.products?.name ?? it.description ?? "",
            quantity: String(Number(it.quantity ?? 1)),
            cost: String(Number(it.cost ?? 0)),
        })),
    );

    // Abonos históricos (solo al crear)
    const [payments, setPayments] = useState<HistPayment[]>([]);

    const [allProducts, setAllProducts] = useState<ProductLite[]>([]);
    const [search, setSearch] = useState("");
    const [searchLine, setSearchLine] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        api.get("/products")
            .then(res => setAllProducts(res.data.map((p: any) => ({
                id: p.id, name: p.name, sku: p.sku, cost_price: Number(p.cost_price ?? 0),
            }))))
            .catch(() => {});
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return [];
        const q = search.toLowerCase();
        return allProducts.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 6);
    }, [search, allProducts]);

    const linesTotal = useMemo(
        () => lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.cost) || 0), 0),
        [lines],
    );
    const total = useLines ? linesTotal : (parseFloat(manualTotal) || 0);
    const paid = useMemo(
        () => payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
        [payments],
    );

    // ── Líneas ──────────────────────────────────────────────────────────────

    const addBlankLine = () =>
        setLines(prev => [...prev, { key: nk(), productId: null, label: "", quantity: "1", cost: "0" }]);

    const setLine = (key: string, patch: Partial<Line>) =>
        setLines(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)));

    const removeLine = (key: string) => setLines(prev => prev.filter(l => l.key !== key));

    const pickProduct = (key: string, p: ProductLite) => {
        setLine(key, { productId: p.id, label: p.name, cost: String(p.cost_price) });
        setSearch("");
        setSearchLine(null);
    };

    // ── Abonos ──────────────────────────────────────────────────────────────

    const addPayment = () =>
        setPayments(prev => [...prev, { key: nk(), amount: "", date: today(), method: "CASH" }]);
    const setPayment = (key: string, patch: Partial<HistPayment>) =>
        setPayments(prev => prev.map(p => (p.key === key ? { ...p, ...patch } : p)));
    const removePayment = (key: string) => setPayments(prev => prev.filter(p => p.key !== key));

    // ── Guardar ─────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (total <= 0) return toast.error("Indica el monto total o al menos una línea con valor.");
        if (useLines && lines.some(l => !l.label.trim())) return toast.error("Cada línea necesita un nombre o descripción.");
        if (!isEdit && paid > total + 0.01) return toast.error("Los abonos superan el total de la factura.");
        if (isEdit && Number(invoice!.total) !== total && total < Number(invoice!.total)) {
            // permitido, backend valida contra lo abonado
        }

        const itemsPayload = useLines
            ? lines.map(l => ({
                productId: l.productId ?? undefined,
                description: l.productId ? undefined : l.label.trim(),
                quantity: parseFloat(l.quantity) || 1,
                cost: parseFloat(l.cost) || 0,
            }))
            : undefined;

        setIsSaving(true);
        try {
            if (isEdit) {
                await api.put(`/purchases/${invoice!.id}/payable`, {
                    invoiceNumber: invoiceNumber.trim() || undefined,
                    invoiceDate: invoiceDate || undefined,
                    dueDate: dueDate || undefined,
                    notes: notes.trim() || undefined,
                    ...(useLines ? { items: itemsPayload } : { items: [], total }),
                });
                toast.success("Factura por pagar actualizada.");
            } else {
                await api.post(`/purchases/payable`, {
                    supplierId,
                    ...(useLines ? { items: itemsPayload } : { total }),
                    invoiceNumber: invoiceNumber.trim() || undefined,
                    invoiceDate: invoiceDate || undefined,
                    dueDate: dueDate || undefined,
                    notes: notes.trim() || undefined,
                    payments: payments
                        .filter(p => (parseFloat(p.amount) || 0) > 0)
                        .map(p => ({ amount: parseFloat(p.amount), date: p.date || undefined, method: p.method })),
                });
                toast.success("Factura por pagar registrada.");
            }
            onSaved();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Error al guardar la factura.");
        } finally {
            setIsSaving(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-app-card border border-app-border rounded-2xl shadow-2xl z-10 flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-app-border">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                        <FileText size={18} className="text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-app-text">{isEdit ? "Editar factura por pagar" : "Nueva factura por pagar"}</h3>
                        <p className="text-xs text-app-text-muted truncate">
                            {supplierName} · No afecta inventario ni caja — solo lleva la cuenta por pagar.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-app-text-muted hover:text-app-text"><X size={18} /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1"># Factura</label>
                            <input
                                type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                                placeholder="Opcional"
                                className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Fecha factura</label>
                            <input
                                type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                                className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Vencimiento</label>
                            <input
                                type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                            />
                        </div>
                    </div>

                    {/* Monto: total único o líneas */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Detalle</label>
                            <div className="flex gap-1 bg-app-bg p-0.5 rounded-lg border border-app-border">
                                <button
                                    onClick={() => setUseLines(false)}
                                    className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${!useLines ? "bg-violet-600 text-white" : "text-app-text-muted"}`}
                                >Monto total</button>
                                <button
                                    onClick={() => { setUseLines(true); if (lines.length === 0) addBlankLine(); }}
                                    className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${useLines ? "bg-violet-600 text-white" : "text-app-text-muted"}`}
                                >Por líneas</button>
                            </div>
                        </div>

                        {!useLines ? (
                            <input
                                type="number" min="0" value={manualTotal} onChange={e => setManualTotal(e.target.value)}
                                placeholder="Monto total de la factura"
                                className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-lg font-black text-app-text focus:outline-none focus:border-violet-500/50"
                            />
                        ) : (
                            <div className="space-y-2">
                                {lines.map(l => (
                                    <div key={l.key} className="bg-app-bg border border-app-border rounded-xl p-2.5 space-y-2">
                                        <div className="flex gap-2 items-start">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={l.label}
                                                    onChange={e => { setLine(l.key, { label: e.target.value, productId: null }); setSearch(e.target.value); setSearchLine(l.key); }}
                                                    onFocus={() => { setSearch(l.label); setSearchLine(l.key); }}
                                                    placeholder="Producto del catálogo o texto libre"
                                                    className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-xs text-app-text focus:outline-none focus:border-violet-500/50"
                                                />
                                                {searchLine === l.key && search && filtered.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-app-card border border-app-border rounded-lg shadow-2xl z-20 overflow-hidden">
                                                        {filtered.map(p => (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => pickProduct(l.key, p)}
                                                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-app-bg text-left"
                                                            >
                                                                <span className="text-violet-400 font-mono text-[10px] w-20 shrink-0 truncate">{p.sku}</span>
                                                                <span className="text-app-text text-xs flex-1 truncate">{p.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {l.productId && <span className="text-[9px] text-emerald-400 font-bold">Enlazado al catálogo (no mueve stock)</span>}
                                            </div>
                                            <button onClick={() => removeLine(l.key)} className="text-app-text-muted hover:text-rose-400 pt-1.5">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[9px] text-app-text-muted uppercase">Cantidad</label>
                                                <input
                                                    type="number" min="0.001" value={l.quantity}
                                                    onChange={e => setLine(l.key, { quantity: e.target.value })}
                                                    className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1 text-xs text-app-text text-center focus:outline-none focus:border-violet-500/50"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[9px] text-app-text-muted uppercase">Costo unit.</label>
                                                <input
                                                    type="number" min="0" step="100" value={l.cost}
                                                    onChange={e => setLine(l.key, { cost: e.target.value })}
                                                    className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1 text-xs text-app-text text-center focus:outline-none focus:border-violet-500/50"
                                                />
                                            </div>
                                            <div className="flex-1 text-right pt-3">
                                                <span className="text-xs font-bold text-app-text">
                                                    {cop((parseFloat(l.quantity) || 0) * (parseFloat(l.cost) || 0))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={addBlankLine}
                                    className="w-full py-2 rounded-xl border border-dashed border-violet-500/40 text-violet-400 text-xs font-bold hover:bg-violet-500/10 flex items-center justify-center gap-1.5"
                                >
                                    <Plus size={13} /> Agregar línea
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Abonos históricos — solo al crear */}
                    {!isEdit && (
                        <div>
                            <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-2">
                                Abonos ya realizados (pagados por fuera del sistema)
                            </label>
                            <div className="space-y-2">
                                {payments.map(p => (
                                    <div key={p.key} className="flex gap-2 items-center bg-app-bg border border-app-border rounded-xl p-2">
                                        <input
                                            type="number" min="0" placeholder="Monto" value={p.amount}
                                            onChange={e => setPayment(p.key, { amount: e.target.value })}
                                            className="flex-1 bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-xs text-app-text focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <input
                                            type="date" value={p.date}
                                            onChange={e => setPayment(p.key, { date: e.target.value })}
                                            className="bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-xs text-app-text focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <select
                                            value={p.method}
                                            onChange={e => setPayment(p.key, { method: e.target.value })}
                                            className="bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-xs text-app-text focus:outline-none"
                                        >
                                            <option value="CASH">Efectivo</option>
                                            <option value="CARD">Tarjeta</option>
                                            <option value="TRANSFER">Transferencia</option>
                                        </select>
                                        <button onClick={() => removePayment(p.key)} className="text-app-text-muted hover:text-rose-400">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={addPayment}
                                    className="w-full py-2 rounded-xl border border-dashed border-emerald-500/40 text-emerald-400 text-xs font-bold hover:bg-emerald-500/10 flex items-center justify-center gap-1.5"
                                >
                                    <Plus size={13} /> Agregar abono
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">Notas</label>
                        <textarea
                            value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            placeholder="Opcional"
                            className="w-full bg-app-bg border border-app-border rounded-xl px-3 py-2 text-sm text-app-text focus:outline-none focus:border-violet-500/50 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-app-border px-6 py-4 flex items-center gap-3">
                    <div className="flex-1">
                        <p className="text-[10px] text-app-text-muted uppercase tracking-widest">Total factura</p>
                        <p className="text-xl font-black text-app-text">{cop(total)}</p>
                        {!isEdit && paid > 0 && (
                            <p className="text-[11px] text-app-text-muted">
                                Abonado {cop(paid)} · Saldo {cop(Math.max(0, total - paid))}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="py-2.5 px-4 rounded-xl border border-app-border text-app-text-muted text-sm font-bold hover:text-app-text transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="py-2.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        {isEdit ? "Guardar cambios" : "Registrar factura"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
