import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Lightbox = ({ images, index, onClose, onPrev, onNext }: LightboxProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] bg-black/95 flex flex-col items-center justify-center p-4 cursor-default"
      onClick={onClose}
    >
      <button 
        className="absolute top-6 right-10 text-white/50 hover:text-white transition-colors z-50 p-4"
        onClick={onClose}
      >
        <X size={32} />
      </button>
      
      <div className="relative flex items-center justify-center w-full h-full max-w-[1400px]">
        <button 
          className="absolute left-0 text-white/30 hover:text-white p-4 h-full flex items-center z-50 transition-colors group"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <ChevronLeft size={48} strokeWidth={1} className="group-hover:scale-110 transition-transform" />
        </button>

        <motion.img
          key={images[index]}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          src={images[index]}
          className="max-w-[90vw] max-h-[85vh] object-contain shadow-2xl pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        />

        <button 
          className="absolute right-0 text-white/30 hover:text-white p-4 h-full flex items-center z-50 transition-colors group"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <ChevronRight size={48} strokeWidth={1} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <div className="absolute bottom-8 text-white/50 font-ui text-[12px] tracking-widest">
        {index + 1} / {images.length}
      </div>
    </motion.div>
  );
};
