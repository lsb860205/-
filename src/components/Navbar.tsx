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
        className="font-ui font-semibold text-[11px] min-[380px]:text-[13px] sm:text-[15px] tracking-[0.1em] sm:tracking-[0.25em] cursor-pointer text-text-main uppercase whitespace-nowrap flex-shrink-0"
        onClick={() => onNavigate('home')}
      >
        WAVELET STUDIO
      </div>

      <div className="hidden md:flex gap-4 lg:gap-10">
        {NAV_LINKS.map((link) => (
          <button
            key={link.value}
            onClick={() => onNavigate(link.value)}
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
        className="md:hidden flex items-center gap-2 p-2 -mr-2" 
        onClick={() => setIsMenuOpen(true)}
      >
        <span className="font-ui text-[10px] tracking-widest text-text-main font-medium uppercase">Menu</span>
        <Menu size={18} className="text-text-main" />
      </button>

      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[2000] flex">
            {/* Background Backdrop - Blurred area on the right */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/5 backdrop-blur-sm"
            />

            {/* Side Drawer - Left aligned, solid white box */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
              className="relative w-[75%] sm:w-[320px] h-full bg-white flex flex-col shadow-2xl z-20"
            >
              <div className="pt-24 px-6 flex flex-col">
                <div className="font-ui text-[9px] tracking-[0.2em] text-accent font-semibold mb-6 px-2 opacity-60">MENU</div>
                <div className="flex flex-col gap-3">
                  {NAV_LINKS.map((link, index) => (
                    <motion.button
                      key={link.value}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      onClick={() => {
                        onNavigate(link.value);
                        setIsMenuOpen(false);
                      }}
                      className={`w-full p-4 text-left transition-all border ${
                        currentPage === link.value 
                          ? 'bg-gray-50 border-accent/20' 
                          : 'border-transparent hover:bg-gray-50/50'
                      }`}
                    >
                      <div className={`font-ui text-[14px] tracking-[0.15em] ${
                        currentPage === link.value ? 'text-text-main font-medium' : 'text-text-sub'
                      }`}>
                        {link.label}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Close button - Positioned on the right area of the screen */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-6 right-6 flex items-center gap-2 font-ui text-[11px] tracking-widest text-text-main hover:text-accent transition-colors z-30"
            >
              <span>CLOSE</span>
              <X size={16} />
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};
