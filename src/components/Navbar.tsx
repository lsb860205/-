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
    <nav className="fixed top-0 left-0 w-full h-[70px] bg-bg-white/90 backdrop-blur-md border-b border-border z-[1000] px-10 flex items-center justify-between">
      <div 
        className="font-ui font-semibold text-[15px] tracking-[0.25em] cursor-pointer text-text-main"
        onClick={() => onNavigate('home')}
      >
        WAVELET STUDIO
      </div>

      <div className="hidden md:flex gap-[40px]">
        {NAV_LINKS.map((link) => (
          <button
            key={link.value}
            onClick={() => onNavigate(link.value)}
            className={`font-ui text-[11px] tracking-[0.2em] transition-all relative pb-1 font-medium ${
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

      <button className="md:hidden" onClick={() => setIsMenuOpen(true)}>
        <Menu size={24} />
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[2000] flex flex-col items-center justify-center text-center"
          >
            <button className="absolute top-6 right-10" onClick={() => setIsMenuOpen(false)}>
              <X size={32} />
            </button>
            <div className="flex flex-col gap-8">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.value}
                  onClick={() => {
                    onNavigate(link.value);
                    setIsMenuOpen(false);
                  }}
                  className={`font-ui text-[24px] font-medium tracking-[0.1em] ${
                    currentPage === link.value ? 'text-black' : 'text-gray-400'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
