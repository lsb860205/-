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

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      onNext();
    } else if (info.offset.x > threshold) {
      onPrev();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] bg-black/95 flex flex-col items-center justify-center cursor-default"
      onClick={onClose}
    >
      <div className="absolute top-0 right-0 p-4 z-[3100]">
        <button 
          className="p-6 text-white/70 hover:text-white transition-colors flex items-center gap-2"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <span className="font-ui text-[11px] tracking-widest hidden sm:block">CLOSE</span>
          <X size={24} />
        </button>
      </div>
      
      <div className="relative flex items-center justify-center w-full h-full max-w-[1400px] touch-none">
        <button 
          className="absolute left-2 md:left-4 text-white/50 hover:text-white p-4 h-fit flex items-center z-[3050] transition-colors group bg-black/10 hover:bg-black/20 rounded-full"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <ChevronLeft size={28} strokeWidth={1} className="group-hover:scale-110 transition-transform md:w-12 md:h-12" />
        </button>

        <motion.div
          key={images[index]}
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          className="relative z-[3040] flex items-center justify-center w-full h-full"
        >
          <img
            src={images[index]}
            className="max-w-[95vw] md:max-w-[85vw] max-h-[75vh] md:max-h-[85vh] object-contain shadow-[0_20px_50px_rgba(0,0,0,0.5)] m-auto select-none"
            onClick={(e) => (e as any).stopPropagation()}
          />
          <div className="image-protection-overlay" onClick={(e) => (e as any).stopPropagation()} />
        </motion.div>

        <button 
          className="absolute right-2 md:right-4 text-white/50 hover:text-white p-4 h-fit flex items-center z-[3050] transition-colors group bg-black/10 hover:bg-black/20 rounded-full"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <ChevronRight size={28} strokeWidth={1} className="group-hover:scale-110 transition-transform md:w-12 md:h-12" />
        </button>
      </div>

      <div className="absolute bottom-8 left-0 w-full flex flex-col items-center gap-2 text-white/40 font-ui text-[10px] tracking-[0.3em] uppercase">
        <div className="flex gap-1">
          {images.map((_, i) => (
            <div 
              key={i} 
              className={`w-1 h-1 rounded-full transition-all ${i === index ? 'bg-white w-4' : 'bg-white/20'}`} 
            />
          ))}
        </div>
        <span>{index + 1} / {images.length}</span>
      </div>
    </motion.div>
  );
};
