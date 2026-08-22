export const SCANNER_FIX_KEY = "scannerDashFix";

export function isScannerFixEnabled(): boolean {
    try { return localStorage.getItem(SCANNER_FIX_KEY) === "true"; }
    catch { return false; }
}

export function setScannerFix(enabled: boolean): void {
    try { localStorage.setItem(SCANNER_FIX_KEY, enabled ? "true" : "false"); }
    catch { /* ignore */ }
}

/** Reemplaza ' por - en códigos escaneados cuando el fix está activo */
export function scannerNormalize(value: string): string {
    if (!isScannerFixEnabled()) return value;
    return value.replace(/'/g, "-");
}
