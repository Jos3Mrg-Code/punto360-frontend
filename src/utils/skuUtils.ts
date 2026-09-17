export function stripAccents(s: string): string {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const naturalCollator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

/**
 * Ordena variantes por sus valores de atributo: agrupa por el primer atributo
 * (según el orden en que se definieron en el producto) y, dentro de cada grupo,
 * ordena el siguiente atributo de forma natural (numérico si son tallas,
 * alfabético si es texto). Cada variante puede traer sus `values` en cualquier
 * orden — se normalizan por `attribute.position` antes de comparar.
 */
export function sortVariantsByAttributes<T extends { values: any[] }>(variants: T[]): T[] {
    const orderedValues = (v: T) =>
        [...(v.values ?? [])].sort(
            (x: any, y: any) => (x.attribute_value?.attribute?.position ?? 0) - (y.attribute_value?.attribute?.position ?? 0),
        );

    return [...variants].sort((a, b) => {
        const av = orderedValues(a);
        const bv = orderedValues(b);
        const len = Math.max(av.length, bv.length);
        for (let i = 0; i < len; i++) {
            const cmp = naturalCollator.compare(av[i]?.attribute_value?.value ?? "", bv[i]?.attribute_value?.value ?? "");
            if (cmp !== 0) return cmp;
        }
        return 0;
    });
}

/**
 * Producto cartesiano de varios arrays.
 * cartesian([["35","36"],["azul","rojo"]]) \u2192
 *   [["35","azul"],["35","rojo"],["36","azul"],["36","rojo"]]
 */
export function cartesian<T>(arrays: T[][]): T[][] {
    return arrays.reduce<T[][]>(
        (acc, arr) => acc.flatMap(a => arr.map(b => [...a, b])),
        [[]],
    );
}

/**
 * Genera el SKU corto de una variante a partir del SKU base del producto
 * y los valores de los atributos (color, talla, etc.).
 *
 * Ejemplos:
 *   baseSku = "F87452D7-MAIN-0002", combo = ["NEGRO", "35"]  → "F872NEGR35"
 *   baseSku = "F87452D7-MAIN-0002", combo = ["BEIGE", "38"]  → "F872BEIG38"
 */
export function buildShortVariantSku(baseSku: string, comboValues: string[]): string {
    const baseparts = baseSku.split("-");
    const prefix    = stripAccents(baseparts[0]).replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase();
    const seq       = parseInt(baseparts[baseparts.length - 1], 10) || 1;

    const parts = comboValues.map(v => stripAccents(v).replace(/[^A-Z0-9]/gi, "").toUpperCase());

    if (parts.length === 1) {
        return `${prefix}${seq}${parts[0].slice(0, 6)}`;
    }
    // Siempre incluir el último atributo (talla) completo, y dar el resto al color
    const lastPart  = parts[parts.length - 1].slice(0, 3);       // ej. "35", "40"
    const colorPart = parts.slice(0, -1).join("").slice(0, 8 - lastPart.length); // ej. "VAININ"
    return `${prefix}${seq}${colorPart}${lastPart}`;
}

/**
 * Convierte un SKU largo de variante al SKU corto imprimible.
 * Útil para migrar o mostrar variantes existentes.
 */
export function shortVariantCode(baseSku: string, variantSku: string): string {
    if (!variantSku.startsWith(baseSku + "-")) {
        // SKU ya está en formato corto — limpiar y devolver sin truncar
        return stripAccents(variantSku).replace(/[^A-Z0-9]/gi, "").toUpperCase();
    }
    const suffix      = stripAccents(variantSku.slice(baseSku.length + 1));
    const baseparts   = baseSku.split("-");
    const prefix      = baseparts[0].slice(0, 3).toUpperCase();
    const seq         = parseInt(baseparts[baseparts.length - 1], 10) || 1;
    const suffixParts = suffix.split("-").filter(Boolean);
    const colorAbbr   = (suffixParts[0] || "").slice(0, 4).toUpperCase();
    const size        = (suffixParts[suffixParts.length - 1] || "").slice(0, 3).toUpperCase();
    return `${prefix}${seq}${colorAbbr}${size}`;
}
