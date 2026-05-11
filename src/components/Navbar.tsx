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
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-[2000] flex flex-col p-8"
          >
            <div className="flex justify-between items-center mb-16">
              <div className="font-ui font-semibold text-[13px] tracking-[0.15em] text-text-main">WAVELET STUDIO</div>
              <button onClick={() => setIsMenuOpen(false)}>
                <X size={24} className="text-text-main" />
              </button>
            </div>
            <div className="flex flex-col gap-6">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.value}
                  onClick={() => {
                    onNavigate(link.value);
                    setIsMenuOpen(false);
                  }}
                  className={`font-ui text-[28px] text-left font-thin tracking-tight ${
                    currentPage === link.value ? 'text-text-main' : 'text-text-sub'
                  }`}
                >
                  <span className="opacity-30 text-[12px] tracking-widest mr-4 inline-block transform -translate-y-2">
                    0{NAV_LINKS.findIndex(l => l.value === link.value) + 1}
                  </span>
                  {link.label}
                </button>
              ))}
            </div>
            <div className="mt-auto pt-10 border-t border-border flex flex-col gap-4">
              <div className="font-ui text-[10px] tracking-widest text-text-sub">CONTACT</div>
              <div className="font-kr text-[13px] text-text-main">lsb860205@gmail.com</div>
              <div className="flex gap-4 mt-2">
                <div className="w-10 h-[1px] bg-accent" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
