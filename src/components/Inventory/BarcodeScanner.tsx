import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { X, Camera, RefreshCw } from "lucide-react";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.listVideoInputDevices().then(devices => {
      setCameras(devices);
      // Preferir cámara trasera en móviles
      const back = devices.find(d => /back|rear|environment/i.test(d.label));
      const chosen = back?.deviceId ?? devices[0]?.deviceId ?? "";
      setSelectedCamera(chosen);
    }).catch(() => setError("No se pudo acceder a las cámaras"));

    return () => { reader.reset(); };
  }, []);

  useEffect(() => {
    if (!selectedCamera || !videoRef.current) return;

    const reader = readerRef.current;
    if (!reader) return;

    setScanning(true);
    setError("");

    reader.decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
      if (result) {
        onDetected(result.getText());
      }
      if (err && !(err instanceof NotFoundException)) {
        // Ignorar NotFoundException — es normal mientras no hay código frente a la cámara
      }
    }).catch(() => {
      setError("No se pudo iniciar la cámara. Verifica los permisos.");
      setScanning(false);
    });

    return () => { reader.reset(); setScanning(false); };
  }, [selectedCamera]);

  const switchCamera = () => {
    const idx = cameras.findIndex(c => c.deviceId === selectedCamera);
    const next = cameras[(idx + 1) % cameras.length];
    if (next) setSelectedCamera(next.deviceId);
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

        {/* Visor */}
        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
          <video ref={videoRef} className="w-full h-full object-cover" />

          {/* Guía de escaneo */}
          {scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-36">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-app-accent rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-app-accent rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-app-accent rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-app-accent rounded-br" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-app-accent/60 animate-pulse" />
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <p className="text-xs text-app-text-muted">Apunta la cámara al código de barras</p>
          {cameras.length > 1 && (
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
