'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import TriviaDiaria from '@/components/TriviaDiaria';
import { Gamepad2, Brain, Sparkles } from 'lucide-react';
import { SesionUsuario } from '@/lib/types';

export default function JuegosPage() {
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setUsuario(data.usuario);
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-400">
        Cargando Minijuegos...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24 max-w-md mx-auto w-full min-h-screen bg-gray-50 dark:bg-[#121014]">
      <Header usuario={usuario} puntosTotales={10} />

      <main className="p-4 space-y-4">
        {/* Banner de Juegos */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 rounded-3xl text-white shadow-md space-y-1">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-purple-200" />
            <h2 className="text-lg font-black text-white">Minijuegos Familiares 🎮</h2>
          </div>
          <p className="text-xs text-purple-100">
            Desafíos interactivos diarios para sumar puntos y compartir con el grupo
          </p>
        </div>

        {/* Minijuego Principal: Trivia Diaria */}
        <div className="space-y-3">
          <TriviaDiaria
            usuario={usuario}
            onPuntosActualizados={() => {}}
          />
        </div>
      </main>

      <Navbar />
    </div>
  );
}
