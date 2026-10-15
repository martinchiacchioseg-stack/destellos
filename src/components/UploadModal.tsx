import { useState, useRef, useEffect } from 'react';
import { X, Upload, Camera, Film, Sparkles, Check, AlertCircle, ExternalLink, Tag } from 'lucide-react';
import { TipoMedia, Publicidad } from '@/lib/types';
import { dispararConfeti } from '@/components/ConfettiCelebration';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  destelloExistente?: boolean;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  destelloExistente = false,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [tipoMedia, setTipoMedia] = useState<TipoMedia>('foto');
  const [pieDeFoto, setPieDeFoto] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Estados para la publicidad de 5 segundos previa a la confirmación
  const [mostrarAd, setMostrarAd] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(5);
  const [adPostSubida, setAdPostSubida] = useState<Publicidad | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mostrarAd) return;
    if (segundosRestantes > 0) {
      const timer = setTimeout(() => {
        setSegundosRestantes((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setConfirmado(true);
      dispararConfeti();
      const closeTimer = setTimeout(() => {
        onUploadSuccess();
        onClose();
        setMostrarAd(false);
        setConfirmado(false);
      }, 1800);
      return () => clearTimeout(closeTimer);
    }
  }, [mostrarAd, segundosRestantes, onClose, onUploadSuccess]);

  // Compresión de imagen en Canvas
  const comprimirImagen = (fileOriginal: File): Promise<{ mediaUrl: string; thumbnailUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 1. Imagen optimizada (máximo 1200px de ancho/alto)
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No se pudo inicializar canvas');
          ctx.drawImage(img, 0, 0, width, height);

          const mediaUrl = canvas.toDataURL('image/jpeg', 0.82);

          // 2. Miniatura thumbnail cuadrada o de 320px
          const thumbCanvas = document.createElement('canvas');
          const thumbSize = 320;
          thumbCanvas.width = thumbSize;
          thumbCanvas.height = Math.round((height * thumbSize) / width);
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
          }
          const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);

          resolve({ mediaUrl, thumbnailUrl });
        };
        img.onerror = () => reject('Error al procesar la imagen');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject('Error al leer el archivo');
      reader.readAsDataURL(fileOriginal);
    });
  };

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);

    // Validación de tipo
    if (selected.type.startsWith('video/')) {
      // Validar tamaño: máximo 50 MB
      if (selected.size > 50 * 1024 * 1024) {
        setError('El video supera el límite de 50 MB. Elegí un video más corto o liviano.');
        return;
      }

      // Validar duración: máximo 30 segundos usando un video temporal
      const videoTemp = document.createElement('video');
      videoTemp.preload = 'metadata';
      videoTemp.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoTemp.src);
        if (videoTemp.duration > 30.5) {
          setError(`El video dura ${Math.round(videoTemp.duration)}s. El máximo permitido es 30 segundos.`);
          setFile(null);
          setMediaPreview(null);
        } else {
          setTipoMedia('video');
          setFile(selected);
          setMediaPreview(URL.createObjectURL(selected));
        }
      };
      videoTemp.src = URL.createObjectURL(selected);
    } else if (selected.type.startsWith('image/')) {
      setTipoMedia('foto');
      setFile(selected);
      setMediaPreview(URL.createObjectURL(selected));
    } else {
      setError('Solo podés subir fotos o videos cortos.');
    }
  };

  const handleSubir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Seleccioná una foto o video primero.');
      return;
    }

    setProcesando(true);
    setError(null);

    try {
      let finalMediaUrl = '';
      let finalThumbnailUrl = '';

      if (tipoMedia === 'foto') {
        setMensajeEstado('Optimizando y comprimiendo foto...');
        const optimizado = await comprimirImagen(file);
        finalMediaUrl = optimizado.mediaUrl;
        finalThumbnailUrl = optimizado.thumbnailUrl;
      } else {
        setMensajeEstado('Procesando video...');
        finalMediaUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        finalThumbnailUrl = '';
      }

      setMensajeEstado('Publicando tu destello...');

      const res = await fetch('/api/destellos/subir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_url: finalMediaUrl,
          thumbnail_url: finalThumbnailUrl,
          tipo_media: tipoMedia,
          pie_de_foto: pieDeFoto,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo subir tu destello.');
        setProcesando(false);
        return;
      }

      // Traer la publicidad de post_subida para mostrar 5 segundos
      try {
        const socRes = await fetch('/api/destellos/social');
        if (socRes.ok) {
          const socData = await socRes.json();
          if (socData.publicidadPost) {
            setAdPostSubida(socData.publicidadPost);
          }
        }
      } catch {}

      // Iniciar cuenta regresiva de 5 segundos con publicidad
      setProcesando(false);
      setMostrarAd(true);
      setSegundosRestantes(5);
    } catch (err) {
      console.error('Error subiendo destello:', err);
      setError('Ocurrió un error al subir el archivo. Reintentá.');
      setProcesando(false);
      setMensajeEstado('');
    }
  };

  // Si está activa la publicidad de 5 segundos
  if (mostrarAd) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#201D24] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[var(--border-soft)] text-center space-y-4 animate-in zoom-in-95 duration-300">
          {!confirmado ? (
            <>
              {/* Barra de progreso de 5 segundos */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1 text-amber-600">
                    <Tag className="w-3.5 h-3.5" /> Espacio Auspiciado
                  </span>
                  <span>Confirmando en {segundosRestantes}s...</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF7043] transition-all duration-1000 ease-linear"
                    style={{ width: `${((5 - segundosRestantes) / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Publicidad configurada por Superadmin */}
              <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 rounded-2xl border border-orange-200/50 space-y-2.5 text-left">
                {adPostSubida?.imagen_url && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/5 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={adPostSubida.imagen_url}
                      alt={adPostSubida.titulo}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-black text-gray-800 dark:text-gray-100">
                    {adPostSubida?.titulo || 'Café & Dulces Los Abuelos ☕🥐'}
                  </h4>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                    {adPostSubida?.texto || 'Disfrutá de las mejores meriendas en familia los fines de semana.'}
                  </p>
                </div>
                {adPostSubida?.link_url && (
                  <a
                    href={adPostSubida.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF7043] hover:underline pt-1"
                  >
                    <span>Conocé más</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </>
          ) : (
            /* Confirmado tras 5 segundos */
            <div className="py-4 space-y-2 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-lg font-black text-gray-800 dark:text-gray-100">
                ¡Destello Confirmado! ✨
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sumaste +1 punto y tu foto ya participa por el Destello del Día.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-[#201D24] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[var(--border-soft)] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FF7043] flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-800 dark:text-gray-100">
                {destelloExistente ? 'Reemplazar mi destello' : 'Subir mi destello de hoy'}
              </h3>
              <p className="text-[11px] text-gray-400">
                1 foto o video (máx 30s / 50 MB) por día
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={procesando}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-600 dark:text-red-300 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubir} className="space-y-4 mt-3">
          {/* Zona de selección o preview */}
          {!mediaPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#FF7043]/40 hover:border-[#FF7043] rounded-3xl p-6 text-center cursor-pointer bg-orange-50/30 dark:bg-orange-950/10 transition-colors group"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/40 text-[#FF7043] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                Tocá acá para elegir tu foto o video
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Desde tu galería o cámara directa
              </p>
              <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-[#FF7043] font-bold">
                <span className="flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> Compresión automática
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Film className="w-3.5 h-3.5" /> Videos hasta 30s
                </span>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-black flex items-center justify-center shadow-md">
              {tipoMedia === 'video' ? (
                <video
                  src={mediaPreview}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaPreview}
                  alt="Vista previa"
                  className="w-full h-full object-cover"
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setMediaPreview(null);
                }}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm"
                title="Cambiar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleSeleccionarArchivo}
          />

          {/* Pie de foto */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Pie de foto (opcional)
            </label>
            <textarea
              rows={2}
              value={pieDeFoto}
              onChange={(e) => setPieDeFoto(e.target.value)}
              placeholder="Contá algo sobre este momento, un chiste o una dedicatoria..."
              className="w-full px-3 py-2 text-xs rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2A2630] dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#FF7043]"
            />
          </div>

          {/* Información de puntos */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <b>¡Sumás +1 punto</b> por participar hoy! Podés cambiar tu foto las veces que quieras hasta las 23:59 hs.
            </span>
          </div>

          {/* Botón de acción */}
          <button
            type="submit"
            disabled={!file || procesando}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF7043] to-[#FFA726] hover:from-[#F4511E] hover:to-[#FB8C00] text-white font-extrabold text-sm shadow-md shadow-[#FF7043]/30 flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
          >
            {procesando ? (
              <span>{mensajeEstado || 'Subiendo...'}</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{destelloExistente ? 'Actualizar mi destello de hoy' : 'Publicar mi destello ✨'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
