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

export const Navbar = ({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (p: Page) => void }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isMenuOpen]);

  return (
    <nav className="fixed top-0 left-0 w-full h-[60px] md:h-[70px] bg-bg-white/90 backdrop-blur-md border-b border-border z-[1000] px-4 md:px-10 flex items-center justify-between">
      <div 
        className="font-ui font-semibold text-[11px] min-[380px]:text-[13px] sm:text-[15px] tracking-[0.1em] sm:tracking-[0.25em] cursor-pointer text-text-main whitespace-nowrap flex-shrink-0"
        onClick={() => onNavigate('home')}
      >
        WAVELET STUDIO
      </div>

      <div className="hidden md:flex gap-4 lg:gap-10">
        {NAV_LINKS.map((link) => (
          <button
            key={link.value}
            onClick={() => onNavigate(link.value)}
            className={`font-ui text-[10px] lg:text-[11px] tracking-[0.15em] lg:tracking-[0.2em] transition-all relative pb-1 font-medium ${
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

      <button className="md:hidden p-2 -mr-2" onClick={() => setIsMenuOpen(true)}>
        <Menu size={20} className="text-text-main" />
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100vw' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100vw' }}
            transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
            className="fixed inset-0 bg-white z-[2001] flex flex-col px-8 py-12 overflow-y-auto"
            style={{ backgroundColor: '#ffffff' }}
          >
            <div className="flex justify-between items-center mb-16 flex-shrink-0">
              <div className="font-ui font-semibold text-[12px] tracking-[0.15em] text-text-main uppercase">WAVELET STUDIO</div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 -mr-2">
                <X size={20} className="text-text-main" />
              </button>
            </div>
            
            <div className="flex flex-col space-y-6">
              {NAV_LINKS.map((link, index) => (
                <motion.button
                  key={link.value}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => {
                    onNavigate(link.value);
                    setIsMenuOpen(false);
                  }}
                  className={`font-ui text-[18px] text-left font-light tracking-[0.05em] py-2 flex items-baseline gap-4 ${
                    currentPage === link.value ? 'text-text-main' : 'text-text-sub opacity-60'
                  }`}
                >
                  <span className="text-[10px] tracking-widest font-medium opacity-40">
                    0{index + 1}
                  </span>
                  {link.label}
                </motion.button>
              ))}
            </div>

            <div className="mt-auto pt-10 flex items-center gap-4">
              <div className="w-8 h-[1px] bg-accent/30" />
              <div className="font-ui text-[9px] tracking-[0.2em] text-text-sub uppercase">Jeju Island</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
