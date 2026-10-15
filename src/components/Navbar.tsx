'use client';

import Link from 'next/navigation';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Gamepad2, Trophy, Images } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { label: 'Hoy', href: '/', icon: Sparkles, color: 'text-[#FF7043]', dot: 'bg-[#FF7043]' },
    { label: 'Juegos', href: '/juegos', icon: Gamepad2, color: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-600' },
    { label: 'Ranking', href: '/ranking', icon: Trophy, color: 'text-amber-500 dark:text-amber-400', dot: 'bg-amber-500' },
    { label: 'Galería', href: '/galeria', icon: Images, color: 'text-teal-600 dark:text-teal-400', dot: 'bg-teal-500' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/95 dark:bg-[#1E1B22]/95 backdrop-blur-md border-t border-[var(--border-soft)] py-2 px-4 flex items-center justify-around shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;

        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative ${
              isActive
                ? `${tab.color} font-bold scale-105`
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <div className="relative">
              <Icon className={`w-6 h-6 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {isActive && (
                <span className={`absolute -top-1 -right-1 w-2 h-2 ${tab.dot} rounded-full animate-ping`} />
              )}
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
