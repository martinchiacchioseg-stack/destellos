'use client';

import { useState, useRef } from 'react';
import { X, Camera, Sparkles, Check, AlertCircle, RefreshCw, Upload } from 'lucide-react';
import { dispararConfeti } from '@/components/ConfettiCelebration';

interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: () => void;
  destelloExistente?: boolean;
}

export default function UploadModal({
  onClose,
  onUploadSuccess,
  destelloExistente = false,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [pieDeFoto, setPieDeFoto] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);

    // Validar tipo de imagen
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!tiposPermitidos.includes(selected.type.toLowerCase())) {
      setError('Formato no soportado. Se aceptan solo fotos JPG, PNG, WEBP y HEIC.');
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError('La foto supera el límite de 10 MB. Por favor elegí una foto más liviana.');
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaPreview(event.target?.result as string);
    };
    reader.readAsDataURL(selected);
  };

  const handleSubir = async () => {
    if (!mediaPreview) {
      setError('Por favor seleccioná una foto para tu destello.');
      return;
    }

    setSubiendo(true);
    setError(null);

    try {
      const res = await fetch('/api/destellos/subir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_url: mediaPreview,
          pie_de_foto: pieDeFoto.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo subir tu destello.');
        setSubiendo(false);
        return;
      }

      dispararConfeti();
      onUploadSuccess();
      onClose();
    } catch {
      setError('Error de conexión al subir la foto.');
      setSubiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1C1822] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF7043] flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              {destelloExistente ? 'Reemplazar tu Destello' : 'Tu Destello de Hoy'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-200">
            {error}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleSeleccionarArchivo}
        />

        {/* Zona de Vista Previa o Botón de Selección */}
        {mediaPreview ? (
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 px-3 py-1 bg-black/70 hover:bg-black/90 text-white text-[11px] font-bold rounded-full backdrop-blur-xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Cambiar foto</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Pie de foto (opcional)
              </label>
              <input
                type="text"
                placeholder="ej: El mate de la mañana con el perro ☕🐾"
                value={pieDeFoto}
                onChange={(e) => setPieDeFoto(e.target.value)}
                maxLength={140}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#25202D] text-xs dark:text-white"
              />
            </div>

            <button
              onClick={handleSubir}
              disabled={subiendo}
              className="w-full py-3 rounded-2xl bg-[#FF7043] hover:bg-[#F4511E] text-white font-black text-xs shadow-md shadow-[#FF7043]/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {subiendo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Optimizando y subiendo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Publicar Destello (+10 pts)</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#FF7043] rounded-3xl p-8 text-center space-y-3 cursor-pointer transition-colors bg-gray-50/50 dark:bg-[#1E1B24]/50"
          >
            <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF7043] flex items-center justify-center mx-auto shadow-inner">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black text-gray-800 dark:text-gray-200">
                Tocá acá para sacar una foto o elegirla de tu galería
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WEBP o HEIC (máx 10 MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
