import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Project, GlobalSettings } from '../types';
import { getProjectSlug } from '../lib/slugUtils';
import { Lightbox } from './Lightbox';
import { Footer } from './Footer';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface CategoryPageProps {
  type: string;
  projects: Project[];
  meta: { title: string; description: string };
  onNavigate: (p: string) => void;
  onAdmin: () => void;
  settings: GlobalSettings;
}

export const CategoryPage = ({ type, projects, meta, onNavigate, onAdmin, settings }: CategoryPageProps) => {
  return (
    <div className="pt-[110px] md:pt-[140px] min-h-screen flex flex-col bg-bg-white">
      <section className="px-6 md:px-10 pb-12 md:pb-20 max-w-[1200px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[500px]"
        >
          <h2 className="font-ui text-[28px] md:text-[40px] font-light text-text-main mb-6 uppercase tracking-tight">{meta?.title}</h2>
          <div className="w-12 h-[1px] bg-accent mb-6" />
          <p className="font-kr font-light text-[13px] md:text-[14px] tracking-[0.05em] leading-[2] text-text-sub whitespace-pre-line">
            {meta?.description}
          </p>
        </motion.div>
      </section>

      <section className="px-6 md:px-10 pb-20 md:pb-40 max-w-[1200px] mx-auto w-full flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 md:gap-x-[100px] gap-y-16 md:gap-y-[120px]">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.8 }}
              className="group cursor-pointer gallery-editorial-item"
              onClick={() => onNavigate(`${type}/${getProjectSlug(project.clientName)}`)}
            >
              <div className="relative aspect-[4/5] bg-bg-warm overflow-hidden shadow-sm image-protection-container">
                <img 
                  src={project.mainImage} 
                  alt={project.clientName}
                  className="w-full h-full object-cover grayscale-0 lg:grayscale opacity-90 transition-all duration-1000 group-hover:scale-105 lg:group-hover:grayscale-0 group-hover:opacity-100"
                />
                <div className="image-protection-overlay" />
                <div className="absolute inset-x-0 inset-y-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-700 pointer-events-none z-20">
                  <span className="text-white font-ui text-[11px] tracking-[0.4em] font-light border-b border-white/50 pb-1">VIEW PROJECT</span>
                </div>
              </div>
              <div className="mt-8 text-left">
                <h3 className="font-ui text-[14px] tracking-[0.2em] text-text-main uppercase font-medium mb-2">{project.clientName}</h3>
                <p className="font-ui text-[10px] tracking-[0.2em] text-accent/60 uppercase">COLLECTION</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      <Footer settings={settings} onAdmin={onAdmin} />
    </div>
  );
};

interface ProjectPageProps {
  project: Project;
  categoryProjects: Project[];
  onBack: () => void;
  onAdmin: () => void;
  onNavigate: (p: string) => void;
  settings: GlobalSettings;
}

export const ProjectPage = ({ project, categoryProjects, onBack, onAdmin, onNavigate, settings }: ProjectPageProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      const cacheKey = `gallery_${project.id}`;
      const lastFetchKey = `${cacheKey}_last_fetch`;
      
      // 1. Try cache first
      const cached = sessionStorage.getItem(cacheKey);
      const lastFetch = sessionStorage.getItem(lastFetchKey);
      
      if (cached) {
        setPhotos(JSON.parse(cached));
        setLoading(false);
      }

      const isCacheStale = !lastFetch || (now - parseInt(lastFetch)) > CACHE_DURATION;
      if (cached && !isCacheStale) return;

      try {
        const photosRef = collection(db, `projects/${project.id}/gallery`);
        const q = query(photosRef, orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        const fetchedPhotos = snapshot.docs.map(doc => doc.data().url as string);
        
        let finalPhotos = fetchedPhotos;
        if (fetchedPhotos.length === 0) {
          finalPhotos = project.photos || [];
        }

        setPhotos(finalPhotos);
        sessionStorage.setItem(cacheKey, JSON.stringify(finalPhotos));
        sessionStorage.setItem(lastFetchKey, now.toString());
      } catch (err) {
        console.warn('Gallery photos fetch error (likely quota):', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
    window.scrollTo(0, 0);
  }, [project.id, project.photos]);

  // Find prev/next projects
  const currentIndex = categoryProjects.findIndex(p => p.id === project.id);
  const prevProject = currentIndex > 0 ? categoryProjects[currentIndex - 1] : null;
  const nextProject = currentIndex < categoryProjects.length - 1 ? categoryProjects[currentIndex + 1] : null;

  const getSlug = (p: Project) => `${p.category}/${getProjectSlug(p.clientName)}`;

  return (
    <div className="pt-[140px] md:pt-[160px] min-h-screen flex flex-col bg-bg-white">
      <section className="px-6 md:px-10 max-w-[1200px] mx-auto w-full mb-16 md:mb-32">
        <button 
          onClick={onBack}
          className="font-ui text-[10px] tracking-[0.4em] text-text-sub hover:text-accent transition-colors mb-12 md:mb-20 flex items-center gap-3 uppercase font-medium"
        >
          <ChevronLeft size={14} strokeWidth={1.5} /> BACK TO {project.category}
        </button>
        
        <div className="text-center max-w-[800px] mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-ui text-[24px] min-[400px]:text-[32px] md:text-[48px] font-thin text-text-main mb-6 md:mb-8 tracking-tight text-balance"
          >
            {project.clientName}
          </motion.h1>
          
          {project.description && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-kr font-light text-[15px] text-text-sub max-w-[600px] mx-auto leading-[2.2] tracking-[0.02em]"
            >
              {project.description}
            </motion.p>
          )}
        </div>
      </section>

      {/* Artistic Photo Layout */}
      <section className="px-6 md:px-10 pb-20 max-w-[1300px] mx-auto w-full flex-grow">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-accent" size={32} />
            <span className="font-ui text-[10px] tracking-widest text-text-sub uppercase">LOADING GALLERY</span>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-5 md:gap-8">
            {photos.map((photo, i) => {
              let gridClasses = "col-span-12"; 
              if (i % 5 === 1 || i % 5 === 2) gridClasses = "col-span-12 sm:col-span-6";
              if (i % 5 === 3) gridClasses = "col-span-12 md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3";
              if (i % 5 === 4) gridClasses = "col-span-12 md:col-span-10 md:col-start-2";

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px 0px -150px 0px" }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`cursor-zoom-in group flex items-center justify-center ${gridClasses}`}
                  onClick={() => setLightboxIndex(i)}
                >
                  <div className="image-protection-container w-full h-full flex items-center justify-center">
                    <img 
                      src={photo} 
                      alt={`${project.clientName} ${i + 1}`}
                      className="w-full h-auto block opacity-95 group-hover:opacity-100 transition-opacity duration-1000"
                    />
                    <div className="image-protection-overlay" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom Navigation */}
      <section className="px-6 md:px-10 py-[40px] md:py-[60px] pb-[80px] md:pb-[100px] max-w-[1300px] mx-auto w-full flex justify-end">
        <div className="flex items-center gap-1 md:gap-[30px] font-ui text-[12px] md:text-[14px] text-text-sub tracking-[0.05em]">
          {prevProject ? (
            <button 
              onClick={() => onNavigate(getSlug(prevProject))}
              className="px-4 py-3 hover:text-accent transition-colors flex items-center"
            >
              ← before
            </button>
          ) : (
            <span className="px-4 py-3 opacity-20 cursor-default">← before</span>
          )}

          <button 
            onClick={onBack}
            className="px-6 py-3 hover:text-accent transition-colors underline underline-offset-4 decoration-text-sub/20 font-medium"
          >
            index
          </button>

          {nextProject ? (
            <button 
              onClick={() => onNavigate(getSlug(nextProject))}
              className="px-4 py-3 hover:text-accent transition-colors flex items-center"
            >
              next →
            </button>
          ) : (
            <span className="px-4 py-3 opacity-20 cursor-default">next →</span>
          )}
        </div>
      </section>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={photos}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onPrev={() => setLightboxIndex(prev => (prev! - 1 + photos.length) % photos.length)}
            onNext={() => setLightboxIndex(prev => (prev! + 1) % photos.length)}
          />
        )}
      </AnimatePresence>

      <Footer settings={settings} onAdmin={onAdmin} />
    </div>
  );
};
