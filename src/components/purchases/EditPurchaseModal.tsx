import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../api/axios";
import { toast } from "../../lib/toast";
import {
    X, Search, Trash2, Loader2, CheckCircle2, Layers, Package,
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

interface VariantLite {
    id: string;
    sku: string;
    sale_price: number;
    cost_price: number;
    label: string;
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

    // Sub-modal selector de variantes
    const [variantPickerFor, setVariantPickerFor] = useState<{ product: ProductLite; lineKey: string | null } | null>(null);
    const [variantOptions, setVariantOptions] = useState<VariantLite[]>([]);
    const [loadingVariants, setLoadingVariants] = useState(false);

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
            await openVariantPicker(p, null);
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

    const openVariantPicker = async (product: ProductLite, lineKey: string | null) => {
        setVariantPickerFor({ product, lineKey });
        setLoadingVariants(true);
        setVariantOptions([]);
        try {
            const res = await api.get(`/products/${product.id}/variants`);
            setVariantOptions(
                res.data.map((v: any) => ({
                    id: v.id,
                    sku: v.sku,
                    sale_price: Number(v.sale_price ?? 0),
                    cost_price: Number(v.cost_price ?? 0),
                    label: variantLabelOf(v),
                })),
            );
        } catch {
            toast.error("No se pudieron cargar las variantes");
        } finally {
            setLoadingVariants(false);
        }
    };

    const chooseVariant = (v: VariantLite) => {
        if (!variantPickerFor) return;
        const { product, lineKey } = variantPickerFor;

        if (lineKey) {
            // Cambiar la variante de una línea existente
            setLine(lineKey, {
                variantId: v.id,
                variantLabel: v.label,
                sku: v.sku,
                salePrice: String(v.sale_price),
            });
        } else {
            // Evitar duplicar exactamente la misma variante
            if (lines.some(l => l.variantId === v.id)) {
                toast.warning("Esa variante ya está en la factura");
            } else {
                setLines(prev => [
                    ...prev,
                    {
                        key: nextKey(),
                        productId: product.id,
                        productName: product.name,
                        sku: v.sku,
                        unit_type: product.unit_type,
                        hasVariants: true,
                        variantId: v.id,
                        variantLabel: v.label,
                        quantity: "1",
                        cost: String(v.cost_price || product.cost_price),
                        salePrice: String(v.sale_price),
                    },
                ]);
            }
        }
        setVariantPickerFor(null);
        setVariantOptions([]);
    };

    // ── Guardar ─────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (lines.length === 0) return toast.error("La factura debe tener al menos un producto.");
        for (const l of lines) {
            const q = parseFloat(l.quantity);
            const c = parseFloat(l.cost);
            if (!l.productId) return toast.error("Hay una línea sin producto válido.");
            if (isNaN(q) || q <= 0) return toast.error(`Cantidad inválida en "${l.productName}".`);
            if (isNaN(c) || c < 0) return toast.error(`Costo inválido en "${l.productName}".`);
            if (l.hasVariants && !l.variantId) {
                return toast.error(`Selecciona la variante para "${l.productName}".`);
            }
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
                            return (
                                <div key={l.key} className="grid grid-cols-12 gap-2 items-start bg-app-bg border border-app-border rounded-xl px-3 py-2.5">
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
                                                onClick={() => product && openVariantPicker(product, l.key)}
                                                className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                                            >
                                                <Layers size={9} />
                                                {l.variantLabel ?? "Elegir variante"} · cambiar
                                            </button>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="0.001"
                                            step={l.unit_type === "WEIGHT" ? "0.001" : "1"}
                                            value={l.quantity}
                                            onChange={e => setLine(l.key, { quantity: e.target.value })}
                                            className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-sm text-app-text text-center focus:outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="0" step="100"
                                            value={l.cost}
                                            onChange={e => setLine(l.key, { cost: e.target.value })}
                                            className="w-full bg-app-card border border-app-border rounded-lg px-2 py-1.5 text-sm text-app-text text-center focus:outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="0" step="100"
                                            value={l.salePrice}
                                            onChange={e => setLine(l.key, { salePrice: e.target.value })}
                                            className="w-full bg-app-card border border-emerald-500/20 rounded-lg px-2 py-1.5 text-sm text-emerald-400 font-bold text-center focus:outline-none focus:border-emerald-500/40"
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

            {/* Sub-modal: selector de variante */}
            {variantPickerFor && (
                <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setVariantPickerFor(null)} />
                    <div className="relative w-full max-w-md bg-app-card border border-app-border rounded-2xl shadow-2xl z-10 flex flex-col max-h-[80vh]">
                        <div className="flex items-center gap-2 px-5 py-3 border-b border-app-border">
                            <Layers size={16} className="text-violet-400" />
                            <p className="font-bold text-app-text text-sm flex-1 truncate">{variantPickerFor.product.name}</p>
                            <button onClick={() => setVariantPickerFor(null)} className="text-app-text-muted hover:text-app-text">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            {loadingVariants ? (
                                <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-violet-400" /></div>
                            ) : variantOptions.length === 0 ? (
                                <p className="text-center text-sm text-app-text-muted py-8">Este producto no tiene variantes.</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {variantOptions.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => chooseVariant(v)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-app-border hover:border-violet-500/50 hover:bg-violet-500/5 text-left transition-all"
                                        >
                                            <span className="text-xs font-bold text-violet-300 flex-1 truncate">{v.label}</span>
                                            <span className="text-[10px] font-mono text-app-text-muted truncate">{v.sku}</span>
                                            <span className="text-[10px] text-emerald-400 font-bold">{cop(v.sale_price)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body,
    );
}
