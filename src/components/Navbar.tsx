import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Page } from '../types';

const NAV_LINKS: { label: string; value: Page }[] = [
  { label: 'HOME', value: 'home' },
  { label: 'PLACE', value: 'place' },
  { label: 'FOOD', value: 'food' },
  { label: 'NATURE', value: 'nature' },
  { label: 'ABOUT', value: 'about' },
];

export const Navbar = ({ currentPage, onNavigate, isMenuOpen, setIsMenuOpen }: { currentPage: Page; onNavigate: (p: Page) => void; isMenuOpen: boolean; setIsMenuOpen: (o: boolean) => void }) => {
  useEffect(() => {
    if (isMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isMenuOpen]);

  return (
    <nav className="fixed top-0 left-0 w-full h-[60px] md:h-[70px] bg-bg-white/90 backdrop-blur-md border-b border-border z-[1000] px-4 md:px-10 flex items-center justify-between">
      <div 
        className="font-ui font-semibold text-[11px] min-[380px]:text-[13px] sm:text-[15px] tracking-[0.1em] sm:tracking-[0.25em] cursor-pointer text-text-main uppercase whitespace-nowrap flex-shrink-0"
        onClick={() => { onNavigate('home'); setIsMenuOpen(false); }}
      >
        WAVELET STUDIO
      </div>

      <div className="hidden lg:flex gap-4 lg:gap-10">
        {NAV_LINKS.map((link) => (
          <button
            key={link.value}
            onClick={() => { onNavigate(link.value); setIsMenuOpen(false); }}
            className={`font-ui text-[10px] lg:text-[11px] tracking-[0.15em] lg:tracking-[0.2em] transition-all relative pb-1 font-medium whitespace-nowrap ${
              currentPage === link.value ? 'text-text-main' : 'text-text-sub hover:text-text-main'
            }`}
          >
            {link.label}
            {currentPage === link.value && (
              <motion.div 
                layoutId="nav-underline"
                className="absolute bottom-0 left-0 w-full h-[1px] bg-accent/60"
              />
            )}
          </button>
        ))}
      </div>

      <button 
        className="lg:hidden flex items-center gap-2 p-2 -mr-2" 
        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
      >
        <span className="font-ui text-[10px] tracking-widest text-text-main font-medium uppercase">
          {isMenuOpen ? 'Close' : 'Menu'}
        </span>
        {isMenuOpen ? <X size={18} className="text-text-main" /> : <Menu size={18} className="text-text-main" />}
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[998]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-[75%] max-w-[320px] bg-bg-white z-[999] flex flex-col shadow-2xl border-r border-border/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col p-6 pt-24 gap-2">
                <div className="font-ui text-[9px] tracking-[0.2em] text-accent font-semibold mb-6 px-4 opacity-60 uppercase">Menu</div>
                {NAV_LINKS.map((link, index) => (
                  <motion.button
                    key={link.value}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      onNavigate(link.value);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full p-4 text-left transition-all border rounded-sm ${
                      currentPage === link.value 
                        ? 'bg-bg-warm border-accent/20' 
                        : 'border-transparent hover:bg-bg-warm/30'
                    }`}
                  >
                    <div className={`font-ui text-[14px] tracking-[0.15em] ${
                      currentPage === link.value ? 'text-text-main font-semibold' : 'text-text-sub font-medium'
                    }`}>
                      {link.label}
                    </div>
                  </motion.button>
                ))}
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};
