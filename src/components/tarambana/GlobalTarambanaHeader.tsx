"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface HeaderProps {
  score: number;
  clubName?: string;
  avatarUrl?: string;
}

export function GlobalTarambanaHeader({ score, clubName = "El Club de los Tarambanas", avatarUrl }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-fuchsia-500/20 bg-[#070b16]/90 px-4 py-3 backdrop-blur-md shadow-[0_4px_20px_rgba(255,0,127,0.15)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl border-2 border-fuchsia-500 bg-[#070b16] shadow-[0_0_15px_rgba(255,0,127,0.5),0_0_25px_rgba(0,245,212,0.3)]">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <Image src="/logos/sincericidio-logo.jpg" alt="Sincericidio Logo" width={48} height={48} className="h-full w-full object-cover" priority />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-300 to-cyan-300 drop-shadow-[0_0_10px_rgba(255,0,127,0.6)]">
                SINCERICIDIO
              </span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                EN VIVO
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-300 tracking-tight">{clubName}</p>
          </div>
        </div>

        <motion.div
          key={score}
          initial={{ scale: 1.35 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="flex items-center gap-2 rounded-full border-2 border-[#00F5D4] bg-slate-900/90 px-4 py-1.5 shadow-[0_0_18px_rgba(0,245,212,0.35)]"
        >
          <span className="text-xs font-black tracking-wider text-[#00F5D4]">PTS</span>
          <span className="text-lg font-black text-white">{score}</span>
        </motion.div>
      </div>
    </header>
  );
}
