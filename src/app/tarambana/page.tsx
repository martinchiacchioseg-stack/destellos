'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirección automática: TRIBOO es un solo portal unificado en la raíz (/).
 * Se eliminó cualquier separación o pantalla dividida.
 */
export default function TarambanaRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
