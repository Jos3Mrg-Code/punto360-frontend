/**
 * Generación e impresión de facturas térmicas.
 *
 * Usado por el POS al cobrar y por el historial al reimprimir, para que
 * una factura reimpresa salga idéntica a la original.
 */

export interface ReceiptHeader {
  company_name: string | null;
  document_number: string | null;
  branch_name: string | null;
  address: string | null;
  phone: string | null;
}

export interface ReceiptItem {
  name: string;
  variantLabel?: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  saleNumber: number | null;
  /** Fecha de la venta según el backend, no la del momento de imprimir */
  date: Date;
  items: ReceiptItem[];
  total: number;
  paymentMethod: string;
  change?: number;
  cashReceived?: number;
  customerName?: string | null;
  cashierName?: string | null;
  saleType?: string | null;
  /** Marca la copia para distinguirla del comprobante entregado al cliente */
  isReprint?: boolean;
  /** Una venta anulada debe verse anulada en el papel, no como comprobante válido */
  isCancelled?: boolean;
}

const PAY_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito',
};

const SALE_TYPE_LABEL: Record<string, string> = {
  WHOLESALE: 'Mayorista',
  RETAIL: 'Detal',
};

/** Evita que nombres con < > & " rompan el HTML del ticket */
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const money = (n: number) => `$${n.toLocaleString('es-CO')}`;

/** Formato de consecutivo: FAC-000042 */
export const formatSaleNumber = (n: number | null | undefined) =>
  n ? `FAC-${String(n).padStart(6, '0')}` : null;

export function buildReceiptHtml(
  header: ReceiptHeader | null,
  d: ReceiptData,
  paperWidthMm: number,
): string {
  const pw = `${paperWidthMm}mm`;
  const invoice = formatSaleNumber(d.saleNumber);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${invoice ?? 'Factura'}</title><style>
    @page{size:${pw} auto;margin:0;}
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Courier New',monospace;font-size:12px;width:${pw};padding:3mm 2mm;}
    .center{text-align:center;}
    .bold{font-weight:bold;}
    .line{border-top:1px dashed #000;margin:5px 0;}
    .row{display:flex;justify-content:space-between;gap:4px;}.row span:last-child{white-space:nowrap;text-align:right;flex-shrink:0;}
    .total{font-size:14px;font-weight:bold;}
    .small{font-size:10px;}
    .invoice{font-size:12px;font-weight:bold;text-align:center;margin:3px 0;}
    .reprint{font-size:10px;text-align:center;border:1px solid #000;padding:2px;margin-top:4px;}
    .cancelled{font-size:14px;font-weight:bold;text-align:center;border:2px solid #000;padding:4px;margin:6px 0;letter-spacing:2px;}
    .logo{font-size:9px;text-align:center;margin-top:6px;opacity:0.5;}
  </style></head><body>
    <p class="center bold" style="font-size:15px;">${esc(header?.company_name ?? 'Mi Tienda')}</p>
    <p class="center small">NIT ${esc(header?.document_number ?? 'No registrado')}</p>
    <p class="center small bold">${esc(header?.branch_name ?? 'Sucursal no registrada')}</p>
    <p class="center small">${esc(header?.address ?? 'Dirección no registrada')}</p>
    ${header?.phone ? `<p class="center small">Tel. ${esc(header.phone)}</p>` : ''}
    <div class="line"></div>
    ${d.isCancelled ? `<p class="cancelled">VENTA ANULADA</p>` : ''}
    ${invoice ? `<p class="invoice">${invoice}</p>` : ''}
    <p class="center small">${d.date.toLocaleString('es-CO')}</p>
    ${d.cashierName ? `<p class="center small">Atendido por: ${esc(d.cashierName)}</p>` : ''}
    ${d.saleType && SALE_TYPE_LABEL[d.saleType] ? `<p class="center small">Precio ${SALE_TYPE_LABEL[d.saleType]}</p>` : ''}
    <div class="line"></div>
    ${d.items.map(i => `
      <div class="bold" style="font-size:11px;">${esc(i.name)}${i.variantLabel ? ` <span style="font-weight:normal;font-size:10px;">(${esc(i.variantLabel)})</span>` : ''}</div>
      <div class="row small"><span>${i.quantity} x ${money(i.price)}</span><span>${money(i.quantity * i.price)}</span></div>
    `).join('')}
    <div class="line"></div>
    <div class="row total"><span>TOTAL</span><span>${money(d.total)}</span></div>
    <div class="row small"><span>Pago</span><span>${esc(PAY_LABEL[d.paymentMethod] ?? d.paymentMethod)}</span></div>
    ${d.paymentMethod === 'CASH' && d.cashReceived ? `<div class="row small"><span>Recibido</span><span>${money(d.cashReceived)}</span></div>` : ''}
    ${d.paymentMethod === 'CASH' && d.change && d.change > 0 ? `<div class="row small"><span>Cambio</span><span>${money(d.change)}</span></div>` : ''}
    ${d.customerName ? `<div class="row small"><span>Cliente</span><span>${esc(d.customerName)}</span></div>` : ''}
    <div class="line"></div>
    ${d.isCancelled ? `<p class="cancelled">VENTA ANULADA</p>` : `<p class="center small">¡Gracias por su compra!</p>`}
    ${d.isReprint ? `<p class="reprint">COPIA — reimpresa ${new Date().toLocaleString('es-CO')}</p>` : ''}
    <p class="logo">— PUNTO360 —</p>
  </body></html>`;
}

/** Abre una ventana, imprime y la cierra. Devuelve false si el navegador bloqueó el popup. */
export function printReceipt(
  header: ReceiptHeader | null,
  data: ReceiptData,
  paperWidthMm: number,
): boolean {
  const win = window.open('', '_blank', `width=${paperWidthMm * 4},height=700`);
  if (!win) return false;

  // onafterprint debe quedar asignado antes de print(): en escritorio print()
  // bloquea hasta que se cierra el diálogo y el evento se dispararía sin handler
  win.onafterprint = () => win.close();
  win.document.write(buildReceiptHtml(header, data, paperWidthMm));
  win.document.close();
  win.focus();
  win.print();
  return true;
}

export const PAPER_WIDTH_KEY = 'receipt_paper_width';

export const getPaperWidth = () => Number(localStorage.getItem(PAPER_WIDTH_KEY) || 80);
