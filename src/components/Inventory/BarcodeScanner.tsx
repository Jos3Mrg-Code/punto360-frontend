import { useEffect, useRef, useState } from "react";
import { X, Camera, RefreshCw } from "lucide-react";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const supported = "BarcodeDetector" in window;

  // Listar cámaras disponibles
  useEffect(() => {
    if (!supported) {
      setError("Tu navegador no soporta escaneo nativo. Usa Chrome en Android o Edge.");
      return;
    }
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        setCameras(videoDevices);
        const back = videoDevices.find(d => /back|rear|environment/i.test(d.label));
        setSelectedCamera(back?.deviceId ?? videoDevices[0]?.deviceId ?? "");
      })
      .catch(() => setError("No se pudo listar las cámaras."));
  }, []);

  // Iniciar stream y escaneo
  useEffect(() => {
    if (!selectedCamera || !videoRef.current || !supported) return;
    let stopped = false;

    const start = async () => {
      try {
        // Detener stream anterior
        streamRef.current?.getTracks().forEach(t => t.stop());

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera } },
        });
        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "code_93", "qr_code", "upc_a", "upc_e", "itf"],
        });

        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const barcodes: any[] = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              onDetected(barcodes[0].rawValue as string);
              return;
            }
          } catch {
            // frame no listo aún — continuar
          }
          rafRef.current = requestAnimationFrame(scan);
        };

        rafRef.current = requestAnimationFrame(scan);
      } catch {
        setError("No se pudo iniciar la cámara. Verifica los permisos del navegador.");
      }
    };

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      setReady(false);
    };
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
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

          {/* Guía de escaneo */}
          {ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-36">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-app-accent rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-app-accent rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-app-accent rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-app-accent rounded-br" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-app-accent/70 animate-pulse" />
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-app-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <p className="text-xs text-app-text-muted">
            {error ? "Solo funciona en Chrome / Edge" : "Apunta la cámara al código de barras"}
          </p>
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
