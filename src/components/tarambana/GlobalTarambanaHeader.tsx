"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface HeaderProps {
  score: number;
  clubName?: string;
  avatarUrl?: string;
}

export function GlobalTarambanaHeader({ score, clubName = "El Club Tarambana", avatarUrl }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0A0C]/90 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-[#FFE600] bg-neutral-900 shadow-[0_0_12px_rgba(255,230,0,0.3)]">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <Image src="/logos/rolf.jpg" alt="Logo" width={44} height={44} className="h-full w-full object-cover" />
            )}
          </div>
          <div>
            <span className="block text-[10px] font-black tracking-widest text-[#00F5D4] uppercase">SALA PRIVADA</span>
            <h1 className="text-base font-extrabold tracking-tight text-white">{clubName}</h1>
          </div>
        </div>

        <motion.div
          key={score}
          initial={{ scale: 1.35 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="flex items-center gap-2 rounded-full border-2 border-[#00F5D4] bg-[#1E1E24] px-4 py-1.5 shadow-[0_0_16px_rgba(0,245,212,0.25)]"
        >
          <span className="text-xs font-black tracking-wider text-[#00F5D4]">PTS</span>
          <span className="text-lg font-black text-white">{score}</span>
        </motion.div>
      </div>
    </header>
  );
}
