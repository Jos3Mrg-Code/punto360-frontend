import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, RefreshCw } from "lucide-react";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

const SCANNER_ID = "barcode-scanner-viewport";

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  // Listar cámaras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then(devices => {
        if (!devices.length) { setError("No se encontraron cámaras."); return; }
        setCameras(devices);
        // Preferir cámara trasera
        const back = devices.find(d => /back|rear|environment/i.test(d.label));
        setSelectedCamera(back?.id ?? devices[0].id);
      })
      .catch(() => setError("No se pudo acceder a la cámara. Verifica los permisos."));
  }, []);

  // Iniciar escáner cuando se elige cámara
  useEffect(() => {
    if (!selectedCamera) return;

    let scanner: Html5Qrcode;

    const start = async () => {
      try {
        // Detener instancia anterior si existe
        if (scannerRef.current) {
          try { await scannerRef.current.stop(); } catch { /* ya estaba detenida */ }
        }

        scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { deviceId: { exact: selectedCamera } },
          { fps: 10, qrbox: { width: 220, height: 140 }, aspectRatio: 1.333 },
          (decodedText) => { onDetected(decodedText); },
          () => { /* error por frame — ignorar */ }
        );
        setReady(true);
        setError("");
      } catch {
        setError("No se pudo iniciar la cámara. Verifica los permisos del navegador.");
      }
    };

    start();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      setReady(false);
    };
  }, [selectedCamera]);

  const switchCamera = () => {
    const idx = cameras.findIndex(c => c.id === selectedCamera);
    const next = cameras[(idx + 1) % cameras.length];
    if (next) setSelectedCamera(next.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-app-card border border-app-border rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-app-accent" />
            <span className="font-bold text-sm text-app-text">Escanear código</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-app-text-muted hover:text-app-text hover:bg-white/5 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Visor — html5-qrcode renderiza aquí */}
        <div className="relative bg-black" style={{ minHeight: 240 }}>
          <div id={SCANNER_ID} className="w-full" />

          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="w-6 h-6 border-2 border-app-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <p className="text-xs text-app-text-muted">Apunta la cámara al código de barras</p>
          {cameras.length > 1 && !error && (
            <button
              onClick={switchCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-bg border border-app-border text-xs text-app-text-muted hover:text-app-text transition-all"
            >
              <RefreshCw size={12} /> Cambiar cámara
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
