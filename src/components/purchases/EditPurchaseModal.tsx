import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../api/axios";
import { toast } from "../../lib/toast";
import {
    X, Search, Trash2, Plus, Loader2, CheckCircle2, Layers, Package,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ProductLite {
    id: string;
    name: string;
    sku: string;
    unit_type: string;
    has_variants: boolean;
    cost_price: number;
    sale_price: number;
}

interface ProductAttribute {
    id: string;
    name: string;
    values: { id: string; value: string }[];
}

interface VariantRow {
    variantId: string;
    label: string;
    sku: string;
    quantity: string;
    cost: string;
    price: string;
    stockCount: number;
}

export interface EditablePurchase {
    id: string;
    supplier_id?: string | null;
    due_date?: string | null;
    purchase_items: {
        id: string;
        product_id?: string | null;
        variant_id?: string | null;
        quantity: number | string;
        cost: number | string;
        products: {
            id?: string;
            name: string;
            sku: string;
            unit_type: string;
            has_variants?: boolean;
            sale_price?: number | string;
            cost_price?: number | string;
        } | null;
        variants?: { id: string; sku: string; sale_price?: number | string; cost_price?: number | string } | null;
    }[];
}

interface Line {
    key: string;
    productId: string;
    productName: string;
    sku: string;
    unit_type: string;
    hasVariants: boolean;
    variantId: string | null;
    variantLabel: string | null;
    quantity: string;
    cost: string;
    salePrice: string;
}

interface Props {
    purchase: EditablePurchase;
    supplierId: string;
    onClose: () => void;
    onSaved: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const cop = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const variantLabelOf = (v: any): string =>
    (v.values ?? [])
        .map((x: any) => `${x.attribute_value.attribute.name}: ${x.attribute_value.value}`)
        .join(" / ") || v.sku;

let keySeq = 0;
const nextKey = () => `line-${++keySeq}`;

// ── Componente ───────────────────────────────────────────────────────────────

export default function EditPurchaseModal({ purchase, supplierId, onClose, onSaved }: Props) {
    const [lines, setLines] = useState<Line[]>(() =>
        purchase.purchase_items.map(it => ({
            key: nextKey(),
            productId: it.product_id ?? it.products?.id ?? "",
            productName: it.products?.name ?? "",
            sku: it.variants?.sku ?? it.products?.sku ?? "",
            unit_type: it.products?.unit_type ?? "UNIT",
            hasVariants: !!it.products?.has_variants,
            variantId: it.variant_id ?? null,
            variantLabel: it.variant_id ? (it.variants?.sku ?? "Variante") : null,
            quantity: String(Number(it.quantity ?? 0)),
            cost: String(Number(it.cost ?? 0)),
            salePrice: String(
                Number(
                    it.variant_id
                        ? it.variants?.sale_price ?? 0
                        : it.products?.sale_price ?? 0,
                ),
            ),
        })),
    );

    const [dueDate, setDueDate] = useState(
        purchase.due_date ? new Date(purchase.due_date).toISOString().split("T")[0] : "",
    );

    const [allProducts, setAllProducts] = useState<ProductLite[]>([]);
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // ── Panel de variantes (por producto) ──────────────────────────────────
    const [variantPanel, setVariantPanel] = useState<ProductLite | null>(null);
    const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
    const [loadingVariants, setLoadingVariants] = useState(false);
    const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
    const [showNewVar, setShowNewVar] = useState(false);
    const [newVarAttrs, setNewVarAttrs] = useState<Record<string, string>>({});
    const [newVarSku, setNewVarSku] = useState("");
    const [newVarPrice, setNewVarPrice] = useState("");
    const [creatingVar, setCreatingVar] = useState(false);

    useEffect(() => {
        api.get("/products")
            .then(res => setAllProducts(res.data.map((p: any) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                unit_type: p.unit_type || "UNIT",
                has_variants: p.has_variants ?? false,
                cost_price: Number(p.cost_price ?? 0),
                sale_price: Number(p.sale_price ?? 0),
            }))))
            .catch(() => {});
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return [];
        const q = search.toLowerCase();
        return allProducts
            .filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
            .slice(0, 8);
    }, [search, allProducts]);

    const total = useMemo(
        () => lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.cost) || 0), 0),
        [lines],
    );

    // ── Edición de líneas ───────────────────────────────────────────────────

    const setLine = (key: string, patch: Partial<Line>) =>
        setLines(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)));

    const removeLine = (key: string) => setLines(prev => prev.filter(l => l.key !== key));

    const addProduct = async (p: ProductLite) => {
        setSearch("");
        setShowDropdown(false);
        if (p.has_variants) {
            await openVariantPanel(p);
            return;
        }
        setLines(prev => [
            ...prev,
            {
                key: nextKey(),
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                unit_type: p.unit_type,
                hasVariants: false,
                variantId: null,
                variantLabel: null,
                quantity: "1",
                cost: String(p.cost_price),
                salePrice: String(p.sale_price),
            },
        ]);
    };

    // ── Panel de variantes ─────────────────────────────────────────────────

    const closeVariantPanel = () => {
        setVariantPanel(null);
        setVariantRows([]);
        setAttributes([]);
        setShowNewVar(false);
        setNewVarAttrs({});
        setNewVarSku("");
        setNewVarPrice("");
    };

    const openVariantPanel = async (product: ProductLite) => {
        setVariantPanel(product);
        setVariantRows([]);
        setAttributes([]);
        setShowNewVar(false);
        setLoadingVariants(true);
        try {
            const [varRes, attrRes] = await Promise.all([
                api.get(`/products/${product.id}/variants`),
                api.get(`/products/${product.id}/attributes`).catch(() => ({ data: [] })),
            ]);
            setAttributes(attrRes.data ?? []);
            setVariantRows(
                (varRes.data ?? []).map((v: any) => {
                    const existing = lines.find(l => l.variantId === v.id);
                    const stockCount = (v.stock ?? []).reduce((s: number, x: any) => s + Number(x.quantity), 0);
                    return {
                        variantId: v.id,
                        label: variantLabelOf(v),
                        sku: v.sku,
                        quantity: existing ? existing.quantity : "",
                        cost: existing ? existing.cost : String(Number(v.cost_price ?? product.cost_price ?? 0)),
                        price: existing ? existing.salePrice : String(Number(v.sale_price ?? 0)),
                        stockCount,
                    } as VariantRow;
                }),
            );
        } catch {
            toast.error("No se pudieron cargar las variantes");
        } finally {
            setLoadingVariants(false);
        }
    };

    const setVariantRow = (variantId: string, patch: Partial<VariantRow>) =>
        setVariantRows(prev => prev.map(r => (r.variantId === variantId ? { ...r, ...patch } : r)));

    const createNewVariant = async () => {
        if (!variantPanel) return;
        const missing = attributes.filter(a => !newVarAttrs[a.id]?.trim());
        if (missing.length > 0) return toast.warning(`Completa: ${missing.map(a => a.name).join(", ")}`);
        if (!newVarSku.trim()) return toast.warning("El SKU es requerido");
        if (!newVarPrice || Number(newVarPrice) <= 0) return toast.warning("El precio de venta es requerido");

        setCreatingVar(true);
        try {
            const attrValueIds: string[] = [];
            for (const attr of attributes) {
                const typed = newVarAttrs[attr.id].trim();
                const existing = attr.values.find(v => v.value.toLowerCase() === typed.toLowerCase());
                if (existing) {
                    attrValueIds.push(existing.id);
                } else {
                    const res = await api.post(`/products/${variantPanel.id}/attributes/${attr.id}/values`, { value: typed });
                    attrValueIds.push(res.data.id);
                    setAttributes(prev => prev.map(a => a.id === attr.id
                        ? { ...a, values: [...a.values, { id: res.data.id, value: typed }] }
                        : a));
                }
            }
            const res = await api.post(`/products/${variantPanel.id}/variants`, {
                sku: newVarSku.trim(),
                sale_price: Number(newVarPrice),
                attribute_value_ids: attrValueIds,
                stock: 0,
            });
            const v = res.data;
            const label = attributes.map(a => `${a.name}: ${newVarAttrs[a.id]}`).join(" / ") || v.sku;
            setVariantRows(prev => [
                ...prev,
                {
                    variantId: v.id,
                    label,
                    sku: v.sku,
                    quantity: "1",
                    cost: String(Number(variantPanel.cost_price ?? 0)),
                    price: String(newVarPrice),
                    stockCount: 0,
                },
            ]);
            setShowNewVar(false);
            setNewVarAttrs({});
            setNewVarSku("");
            setNewVarPrice("");
            toast.success("Variante creada");
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Error al crear la variante");
        } finally {
            setCreatingVar(false);
        }
    };

    const confirmVariantPanel = () => {
        if (!variantPanel) return;
        const pid = variantPanel.id;
        const chosen = variantRows.filter(r => (parseFloat(r.quantity) || 0) > 0);

        if (chosen.length === 0) {
            toast.warning("Ingresa cantidad en al menos una variante (o elimina la línea con la papelera).");
            return;
        }

        setLines(prev => {
            // Quita las líneas de este producto que: son huérfanas (sin variante)
            // o son variantes ya no seleccionadas
            let next = prev.filter(l => {
                if (l.productId !== pid) return true;
                if (!l.variantId) return false;
                return chosen.some(r => r.variantId === l.variantId);
            });

            for (const r of chosen) {
                const existing = next.find(l => l.variantId === r.variantId);
                if (existing) {
                    next = next.map(l => l.key === existing.key
                        ? { ...l, quantity: r.quantity, cost: r.cost, salePrice: r.price, variantLabel: r.label, sku: r.sku }
                        : l);
                } else {
                    next = [
                        ...next,
                        {
                            key: nextKey(),
                            productId: pid,
                            productName: variantPanel.name,
                            sku: r.sku,
                            unit_type: variantPanel.unit_type,
                            hasVariants: true,
                            variantId: r.variantId,
                            variantLabel: r.label,
                            quantity: r.quantity,
                            cost: r.cost,
                            salePrice: r.price,
                        },
                    ];
                }
            }
            return next;
        });

        closeVariantPanel();
    };

    // ── Guardar ─────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (lines.length === 0) return toast.error("La factura debe tener al menos un producto.");

        const pending = lines.find(l => l.hasVariants && !l.variantId);
        if (pending) {
            toast.error(`Configura las variantes de "${pending.productName}".`);
            const product = allProducts.find(p => p.id === pending.productId);
            if (product) await openVariantPanel(product);
            return;
        }

        for (const l of lines) {
            const q = parseFloat(l.quantity);
            const c = parseFloat(l.cost);
            if (!l.productId) return toast.error("Hay una línea sin producto válido.");
            if (isNaN(q) || q <= 0) return toast.error(`Cantidad inválida en "${l.productName}".`);
            if (isNaN(c) || c < 0) return toast.error(`Costo inválido en "${l.productName}".`);
        }

        setIsSaving(true);
        try {
            await api.put(`/purchases/${purchase.id}`, {
                supplierId: supplierId || undefined,
                dueDate: dueDate || undefined,
                items: lines.map(l => ({
                    productId: l.productId,
                    variantId: l.variantId || undefined,
                    productName: l.productName.trim() || undefined,
                    quantity: parseFloat(l.quantity),
                    cost: parseFloat(l.cost),
                    salePrice: parseFloat(l.salePrice) || undefined,
                })),
            });
            toast.success("Factura actualizada. El stock ha sido recalculado.");
            onSaved();
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Error al actualizar la factura.");
        } finally {
            setIsSaving(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-3xl bg-app-card border border-app-border rounded-2xl shadow-2xl z-10 flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-app-border">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                        <Package size={18} className="text-violet-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-app-text">Editar factura</h3>
                        <p className="text-xs text-app-text-muted">
                            #{purchase.id.split("-")[0].toUpperCase()} · Cambios en nombre, costo y precio afectan el catálogo. El stock se recalcula.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-app-text-muted hover:text-app-text">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* Buscador de productos */}
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted" />
                        <input
                            type="text"
                            placeholder="Agregar producto por nombre o SKU..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                            onFocus={() => setShowDropdown(true)}
                            className="w-full bg-app-bg border border-app-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                        />
                        {showDropdown && search && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-app-bg border border-app-border rounded-xl shadow-2xl z-20 overflow-hidden">
                                {filtered.length === 0 ? (
                                    <p className="px-4 py-2.5 text-sm text-app-text-muted">Sin resultados</p>
                                ) : filtered.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => addProduct(p)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-card text-left transition-colors"
                                    >
                                        <span className="text-violet-400 font-mono text-xs w-24 shrink-0 truncate">{p.sku}</span>
                                        <span className="text-app-text text-sm flex-1 truncate">{p.name}</span>
                                        {p.has_variants && (
                                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded shrink-0">
                                                <Layers size={9} /> Variantes
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Líneas */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 px-1 text-[9px] font-black text-app-text-muted uppercase tracking-widest">
                            <span className="col-span-4">Producto</span>
                            <span className="col-span-2 text-center">Cantidad</span>
                            <span className="col-span-2 text-center">Costo unit.</span>
                            <span className="col-span-2 text-center">P. Venta</span>
                            <span className="col-span-2 text-right">Subtotal</span>
                        </div>

                        {lines.map(l => {
                            const product = allProducts.find(p => p.id === l.productId);
                            const needsVariant = l.hasVariants && !l.variantId;
                            return (
                                <div
                                    key={l.key}
                                    className={`grid grid-cols-12 gap-2 items-start rounded-xl px-3 py-2.5 border ${
                                        needsVariant ? "bg-amber-500/5 border-amber-500/40" : "bg-app-bg border-app-border"
                                    }`}
                                >
                                    <div className="col-span-4 space-y-1">
                                        <input
                                            type="text"
                                            value={l.productName}
                                            onChange={e => setLine(l.key, { productName: e.target.value })}
                                            className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1 text-xs font-bold text-app-text focus:outline-none focus:border-violet-500/50"
                                        />
                                        <p className="text-[10px] text-app-text-muted font-mono truncate">{l.sku}</p>
                                        {l.hasVariants && (
                                            <button
                                                onClick={() => product && openVariantPanel(product)}
                                                className={`text-[10px] font-bold flex items-center gap-1 ${
                                                    needsVariant ? "text-amber-400 hover:text-amber-300" : "text-violet-400 hover:text-violet-300"
                                                }`}
                                            >
                                                <Layers size={9} />
                                                {needsVariant ? "Agregar variante" : `${l.variantLabel} · gestionar variantes`}
                                            </button>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="0.001"
                                            step={l.unit_type === "WEIGHT" ? "0.001" : "1"}
                                            value={l.quantity}
                                            disabled={needsVariant}
                                            onChange={e => setLine(l.key, { quantity: e.target.value })}
                                            className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-sm text-app-text text-center focus:outline-none focus:border-violet-500/50 disabled:opacity-40"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="0" step="100"
                                            value={l.cost}
                                            disabled={needsVariant}
                                            onChange={e => setLine(l.key, { cost: e.target.value })}
                                            className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-sm text-app-text text-center focus:outline-none focus:border-violet-500/50 disabled:opacity-40"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="0" step="100"
                                            value={l.salePrice}
                                            disabled={needsVariant}
                                            onChange={e => setLine(l.key, { salePrice: e.target.value })}
                                            className="w-full bg-app-card border border-emerald-500/20 rounded-lg px-2 py-1.5 text-sm text-emerald-400 font-bold text-center focus:outline-none focus:border-emerald-500/40 disabled:opacity-40"
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-center justify-end gap-2 pt-1.5">
                                        <span className="text-xs font-bold text-app-text">
                                            {cop((parseFloat(l.quantity) || 0) * (parseFloat(l.cost) || 0))}
                                        </span>
                                        <button onClick={() => removeLine(l.key)} className="text-app-text-muted hover:text-rose-400 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {lines.length === 0 && (
                            <p className="text-center text-sm text-app-text-muted py-6">Sin productos. Agrega al menos uno.</p>
                        )}
                    </div>

                    {/* Fecha de vencimiento */}
                    <div>
                        <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">
                            Fecha límite de pago (opcional)
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-app-border px-6 py-4 flex items-center gap-3">
                    <div className="flex-1">
                        <p className="text-[10px] text-app-text-muted uppercase tracking-widest">Nuevo total</p>
                        <p className="text-xl font-black text-app-text">{cop(total)}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="py-2.5 px-4 rounded-xl border border-app-border text-app-text-muted text-sm font-bold hover:text-app-text transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="py-2.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        Guardar cambios
                    </button>
                </div>
            </div>

            {/* ── Panel de variantes ─────────────────────────────────────── */}
            {variantPanel && (
                <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={closeVariantPanel} />
                    <div className="relative w-full max-w-2xl bg-app-card border border-app-border rounded-2xl shadow-2xl z-10 flex flex-col max-h-[88vh]">
                        <div className="flex items-center gap-2 px-5 py-3 border-b border-app-border">
                            <Layers size={16} className="text-violet-400" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-app-text text-sm truncate">{variantPanel.name}</p>
                                <p className="text-[10px] text-app-text-muted">
                                    Ingresa cantidad en las variantes que entran en esta factura. Deja en blanco (o 0) las que no.
                                </p>
                            </div>
                            <button onClick={closeVariantPanel} className="text-app-text-muted hover:text-app-text">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {loadingVariants ? (
                                <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-violet-400" /></div>
                            ) : variantRows.length === 0 ? (
                                <p className="text-center text-sm text-app-text-muted py-6">
                                    Este producto aún no tiene variantes. Crea una abajo.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {variantRows.map(r => {
                                        const active = (parseFloat(r.quantity) || 0) > 0;
                                        return (
                                            <div
                                                key={r.variantId}
                                                className={`rounded-xl px-3 py-3 border ${
                                                    active ? "bg-violet-500/5 border-violet-500/40" : "bg-app-bg border-app-border"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2.5">
                                                    <div className="flex flex-wrap gap-1 min-w-0">
                                                        {r.label.split(" / ").map((part, i) => (
                                                            <span key={i} className="text-[11px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md">
                                                                {part}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[10px] text-app-text-muted font-mono">{r.sku}</p>
                                                        <p className="text-[10px] text-cyan-400 font-bold">Stock: {r.stockCount}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-app-text-muted uppercase tracking-wide mb-0.5">Cantidad</label>
                                                        <input
                                                            type="number" min="0" step="1" placeholder="0"
                                                            value={r.quantity}
                                                            onChange={e => setVariantRow(r.variantId, { quantity: e.target.value })}
                                                            className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-sm text-app-text text-center focus:outline-none focus:border-violet-500/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-app-text-muted uppercase tracking-wide mb-0.5">Costo</label>
                                                        <input
                                                            type="number" min="0" step="100"
                                                            value={r.cost}
                                                            onChange={e => setVariantRow(r.variantId, { cost: e.target.value })}
                                                            className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-sm text-app-text text-center focus:outline-none focus:border-violet-500/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-app-text-muted uppercase tracking-wide mb-0.5">P. Venta</label>
                                                        <input
                                                            type="number" min="0" step="100"
                                                            value={r.price}
                                                            onChange={e => setVariantRow(r.variantId, { price: e.target.value })}
                                                            className="w-full bg-app-card border border-emerald-500/20 rounded-lg px-2 py-1.5 text-sm text-emerald-400 font-bold text-center focus:outline-none focus:border-emerald-500/40"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Nueva variante */}
                            {attributes.length > 0 && (
                                <div className="mt-4">
                                    {!showNewVar ? (
                                        <button
                                            onClick={() => setShowNewVar(true)}
                                            className="w-full py-2 rounded-xl border border-dashed border-violet-500/40 text-violet-400 text-xs font-bold hover:bg-violet-500/10 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Plus size={13} /> Crear nueva variante
                                        </button>
                                    ) : (
                                        <div className="bg-app-bg border border-violet-500/30 rounded-xl p-4 space-y-3">
                                            <p className="text-xs font-bold text-violet-300 uppercase tracking-wide">Nueva variante</p>
                                            {attributes.map(attr => (
                                                <div key={attr.id}>
                                                    <label className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-1 block">{attr.name}</label>
                                                    <input
                                                        list={`edit-attr-${attr.id}`}
                                                        value={newVarAttrs[attr.id] ?? ""}
                                                        onChange={e => setNewVarAttrs(prev => ({ ...prev, [attr.id]: e.target.value }))}
                                                        placeholder={`Ej: ${attr.values[0]?.value ?? attr.name}`}
                                                        className="w-full bg-app-card border border-app-border rounded-lg px-3 py-2 text-sm text-app-text focus:outline-none focus:border-violet-500/50"
                                                    />
                                                    <datalist id={`edit-attr-${attr.id}`}>
                                                        {attr.values.map(v => <option key={v.id} value={v.value} />)}
                                                    </datalist>
                                                </div>
                                            ))}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-1 block">SKU</label>
                                                    <input
                                                        value={newVarSku}
                                                        onChange={e => setNewVarSku(e.target.value)}
                                                        placeholder="SKU único"
                                                        className="w-full bg-app-card border border-app-border rounded-lg px-3 py-2 text-sm text-app-text font-mono focus:outline-none focus:border-violet-500/50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest mb-1 block">P. Venta</label>
                                                    <input
                                                        type="number" min="0"
                                                        value={newVarPrice}
                                                        onChange={e => setNewVarPrice(e.target.value)}
                                                        className="w-full bg-app-card border border-emerald-500/20 rounded-lg px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500/40"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => setShowNewVar(false)}
                                                    className="px-4 py-2 rounded-lg text-xs text-app-text-muted border border-app-border hover:text-app-text transition-all"
                                                >Cancelar</button>
                                                <button
                                                    onClick={createNewVariant}
                                                    disabled={creatingVar}
                                                    className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {creatingVar ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                                    Crear variante
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 px-5 py-4 border-t border-app-border">
                            <button
                                onClick={closeVariantPanel}
                                className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text-muted text-sm font-bold hover:text-app-text transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmVariantPanel}
                                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} />
                                Aplicar variantes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body,
    );
}
