"use client";

import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, Camera, Music, Brain, Edit3 } from "lucide-react";

export type TarambanaTab = "feed" | "flash" | "tarambana" | "cerebro" | "trazo";

interface TabBarProps {
  activeTab: TarambanaTab;
  onSelectTab: (tab: TarambanaTab) => void;
}

const TABS: { id: TarambanaTab; label: string; icon: React.ComponentType<{ size?: number; color?: string }>; color: string }[] = [
  { id: "feed", label: "Feed", icon: MessageSquare, color: "#38BDF8" },
  { id: "flash", label: "Flash", icon: Camera, color: "#FFE600" },
  { id: "tarambana", label: "Tarambana", icon: Music, color: "#FF007F" },
  { id: "cerebro", label: "Cerebro", icon: Brain, color: "#FB6107" },
  { id: "trazo", label: "Trazo", icon: Edit3, color: "#70E000" },
];

export function TarambanaTabBar({ activeTab, onSelectTab }: TabBarProps) {
  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-[#0A0A0C]/95 px-2 py-2 backdrop-blur-md transition-colors duration-300"
      style={{ borderTopColor: currentTab.color }}
      aria-label="Navegación del Club Tarambana"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="relative flex flex-col items-center justify-center px-3 py-1 text-center transition-transform active:scale-95"
            >
              <div className="relative">
                <Icon size={22} color={isActive ? tab.color : "#64748B"} />
                {isActive && (
                  <motion.div
                    layoutId="activeTabGlow"
                    className="absolute -inset-1 rounded-full opacity-35 blur-sm"
                    style={{ backgroundColor: tab.color }}
                  />
                )}
              </div>
              <span
                className="mt-1 text-[11px] font-black tracking-wide transition-colors duration-200"
                style={{ color: isActive ? tab.color : "#64748B" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
