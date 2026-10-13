"use client";

import * as React from "react";
import { motion } from "framer-motion";

export function LoadingState() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-4">
        <motion.div
          className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-4 h-4 rounded-full bg-teal-400/90 shadow-glow" />
        </motion.div>
        <div>
          <div className="text-lg font-extrabold">Analyzing lyrics with AI...</div>
          <div className="text-sm text-white/60 mt-1">Romanize • Translate • Score difficulty • Build practice priority</div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {new Array(8).fill(0).map((_, idx) => (
          <motion.div
            key={idx}
            className="h-10 rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.45, 0.9, 0.45] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: idx * 0.08 }}
          >
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-30%] animate-[shimmer_1.2s_infinite]">
              &nbsp;
            </div>
          </motion.div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-30%);
          }
          100% {
            transform: translateX(130%);
          }
        }
        .animate-[shimmer_1.2s_infinite] {
          animation: shimmer 1.2s infinite;
        }
      `}</style>
    </div>
  );
}

