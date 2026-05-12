// v1.5 Production Sync
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDown, LogIn } from 'lucide-react';
import { 
  db, auth, googleProvider,
  collection, doc, getDoc, setDoc, deleteDoc, 
  query, orderBy, onSnapshot, getDocs, writeBatch,
  signInWithPopup, signOut,
  handleFirestoreError, OperationType
} from './firebase';
import { Page, Project, GlobalSettings } from './types';
import { getProjectSlug } from './lib/slugUtils';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CategoryPage, ProjectPage } from './components/GalleryViews';
import { AdminDashboard } from './components/AdminDashboard';

const DEFAULT_SETTINGS: GlobalSettings = {
  homeHeadline: "Photography is the Poetry of Place",
  homeHeadlineSub: "Photography Studio in Jeju",
  homeIntro: "웨이블릿 스튜디오는 제주의 고유한 빛과 결을 담습니다.\n사진은 찰나의 순간을 기록하는 것을 넘어, 그 공간과 음식, 자연이 품고 있는 이야기를 시처럼 풀어내는 과정이라 믿습니다.",
  aboutHeadline: "Wavelet Studio",
  aboutSub: "제주의 빛과 결을 담는 스튜디오",
  aboutBody: "웨이블릿 스튜디오는 제주의 일상을 기록합니다. 우리는 사진 한 장에 담긴 빛과 그림자, 질감과 온도를 소중히 여깁니다. 그 순간들을 있는 그대로, 그러나 특별하게 담아냅니다.",
  heroImages: [],
  placeTitle: 'PLACE',
  placeDescription: '제주의 공간을 기록합니다. 카페, 숙소, 그리고 그 안의 이야기. 건축의 선과 공간이 머금은 온도를 사진이라는 언어로 번역합니다.',
  foodTitle: 'FOOD',
  foodDescription: '제주의 맛을 담습니다. 한 접시에 담긴 계절과 정성. 식재료 본연의 질감과 색감을 정제된 미학으로 포착합니다.',
  natureTitle: 'NATURE',
  natureDescription: '제주의 자연을 마주합니다. 바다, 오름, 빛의 순간들. 시시각각 변화하는 제주의 풍경 속에서 변하지 않는 아름다움을 기록합니다.'
};

const CATEGORY_META = {
  place: { 
    title: 'PLACE', 
    description: '제주의 공간을 기록합니다. 카페, 숙소, 그리고 그 안의 이야기. 건축의 선과 공간이 머금은 온도를 사진이라는 언어로 번역합니다.' 
  },
  food: { 
    title: 'FOOD', 
    description: '제주의 맛을 담습니다. 한 접시에 담긴 계절과 정성. 식재료 본연의 질감과 색감을 정제된 미학으로 포착합니다.' 
  },
  nature: { 
    title: 'NATURE', 
    description: '제주의 자연을 마주합니다. 바다, 오름, 빛의 순간들. 시시각각 변화하는 제주의 풍경 속에서 변하지 않는 아름다움을 기록합니다.' 
  }
};

const generateDummyProjects = (): Project[] => {
  const dummy: Project[] = [];
  const categories = ['place', 'food', 'nature'] as const;
  const clients = {
    place: ["OCEAN VIEW CAFE", "STONE HOUSE STAY", "SUNSET LOUNGE", "FOREST STUDIO", "MINIMALIST VILLA"],
    food: ["JEJU BLACK PORK", "HAENYEO KITCHEN", "CITRUS BAKERY", "MATCHA TEAHOUSE", "LOCAL FARM TABLE"],
    nature: ["HALLASAN SUNRISE", "WOLJEONGRI BEACH", "GOTJAWAL FOREST", "CAMELLIA GARDEN", "OREUM LIGHTS"]
  };
  
  categories.forEach((cat, ci) => {
    clients[cat].forEach((name, i) => {
      const photoCount = 6 + Math.floor(Math.random() * 4);
      dummy.push({
        id: `dummy-${cat}-${i}`,
        category: cat,
        clientName: name,
        description: `${name} - 제주의 정서를 담은 ${cat === 'place' ? '공간' : cat === 'food' ? '미식' : '풍경'} 프로젝트입니다.`,
        mainImage: `https://picsum.photos/800/1000?random=${ci * 10 + i}`,
        photos: Array.from({ length: photoCount }, (_, pi) => `https://picsum.photos/1000/1400?random=${ci * 20 + i * 10 + pi}`),
        order: i
      });
    });
  });
  return dummy;
};

const DUMMY_PROJECTS = generateDummyProjects();

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [currentProjectSlug, setCurrentProjectSlug] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => auth.onAuthStateChanged(u => setUser(u)), []);

  useEffect(() => {
    if (!db) {
      console.error('Database connection failed - forcing recovery mode');
      setIsInitialLoad(false);
      return;
    }

    let settingsLoaded = false;
    let projectsLoaded = false;
    let isMounted = true;

    const checkLoaded = () => {
      if (settingsLoaded && projectsLoaded && isMounted) {
        setIsInitialLoad(false);
      }
    };

    let unsubSettings: () => void = () => {};
    let unsubProjects: () => void = () => {};

    try {
      unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (snap) => {
        if (snap.exists()) setSettings(snap.data() as GlobalSettings);
        settingsLoaded = true;
        checkLoaded();
      }, (err) => {
        console.warn('Settings failed to load', err);
        settingsLoaded = true;
        checkLoaded();
      });

      unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
        items.sort((a, b) => {
          const diff = (a.order ?? 0) - (b.order ?? 0);
          if (diff !== 0) return diff;
          return a.id.localeCompare(b.id);
        });
        setProjects(items);
        projectsLoaded = true;
        checkLoaded();
      }, (err) => {
        console.warn('Projects failed to load', err);
        projectsLoaded = true;
        checkLoaded();
      });
    } catch (err) {
      console.error('Snapshot registration failed', err);
      setIsInitialLoad(false);
    }

    const timeout = setTimeout(() => {
      if (isMounted && isInitialLoad) {
        console.warn('Loading emergency override - showing dummy data');
        setIsInitialLoad(false);
      }
    }, 1500);

    return () => { 
      isMounted = false;
      unsubSettings(); 
      unsubProjects(); 
      clearTimeout(timeout); 
    };
  }, []);

  const displayProjects = useMemo(() => projects.length > 0 ? projects : DUMMY_PROJECTS, [projects]);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      const parts = hash.split('/');
      
      if (parts[0] === 'admin') {
        setCurrentPage('admin');
        setCurrentProjectSlug(null);
      } else if (['place', 'food', 'nature'].includes(parts[0])) {
        setCurrentPage(parts[0] as Page);
        setCurrentProjectSlug(parts[1] ? decodeURIComponent(parts[1]) : null);
      } else if (parts[0] === 'about') {
        setCurrentPage('about');
        setCurrentProjectSlug(null);
      } else {
        setCurrentPage('home');
        setCurrentProjectSlug(null);
      }
      window.scrollTo(0, 0);
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (path: string) => { window.location.hash = path; };

  // Standardized slug helper
  const activeProject = useMemo(() => {
    if (!currentProjectSlug) return null;
    return displayProjects.find(p => 
      p.category === currentPage && 
      getProjectSlug(p.clientName) === currentProjectSlug
    );
  }, [displayProjects, currentPage, currentProjectSlug]);

  // Firebase Handlers
  const saveSettings = async (s: GlobalSettings) => {
    let currentUser = auth.currentUser;
    if (!currentUser) { 
      try {
        const result = await signInWithPopup(auth, googleProvider); 
        currentUser = result.user;
      } catch (err) {
        console.error('Login failed', err);
        return;
      }
    }
    try {
      await setDoc(doc(db, 'settings', 'main'), { ...s, updatedAt: new Date().toISOString() });
      alert('설정이 저장되었습니다.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/main');
    }
  };

  const addProject = async (p: Partial<Project>) => {
    let currentUser = auth.currentUser;
    if (!currentUser) { 
      try {
        const result = await signInWithPopup(auth, googleProvider); 
        currentUser = result.user;
      } catch (err) {
        console.error('Login failed', err);
        return false;
      }
    }
    try {
      const id = Date.now().toString();
      const { photos, ...projectData } = p;
      
      // 1. Create main project doc WITHOUT heavy photos array
      await setDoc(doc(db, 'projects', id), { 
        ...projectData, 
        photoCount: photos?.length || 0,
        order: projects.length, 
        createdAt: new Date().toISOString() 
      });

      // 2. Create photos in subcollection
      if (photos && photos.length > 0) {
        const photoPromises = photos.map((url, i) => {
          const photoId = i.toString().padStart(3, '0');
          const photoDocRef = doc(db, `projects/${id}/gallery`, photoId);
          return setDoc(photoDocRef, { url, order: i });
        });
        await Promise.all(photoPromises);
      }
      
      alert('프로젝트가 성공적으로 생성되었습니다.');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projects');
      return false;
    }
  };

  const updateProject = async (id: string, p: Partial<Project>) => {
    let currentUser = auth.currentUser;
    if (!currentUser) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;
      } catch (err) {
        console.error('Login failed', err);
        return false;
      }
    }
    try {
      const { photos, ...projectData } = p;
      
      // 1. Update main doc
      await setDoc(doc(db, 'projects', id), { 
        ...projectData, 
        photoCount: photos?.length || 0,
        updatedAt: new Date().toISOString() 
      }, { merge: true });

      // 2. Update photos
      if (photos) {
        const photosRef = collection(db, `projects/${id}/gallery`);
        const photosSnapshot = await getDocs(photosRef);
        
        const deletePromises = photosSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        const photoPromises = photos.map((url, i) => {
          const photoId = i.toString().padStart(3, '0');
          const photoDocRef = doc(db, `projects/${id}/gallery`, photoId);
          return setDoc(photoDocRef, { url, order: i });
        });
        await Promise.all(photoPromises);
      }
      
      alert('프로젝트가 수정되었습니다.');
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projects/${id}`);
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    if (!auth.currentUser) {
      alert('관리자 인증이 필요합니다. 상단의 인증하기 버튼을 눌러주세요.');
      return;
    }
    
    try {
      // 1. Delete subcollection photos first
      const photosRef = collection(db, `projects/${id}/gallery`);
      const photosSnapshot = await getDocs(photosRef);
      
      const deletePromises = photosSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // 2. Delete main doc
      await deleteDoc(doc(db, 'projects', id));
      
      alert('삭제되었습니다.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
      alert('삭제 중 오류가 발생했습니다. 권한이 있는지 확인해주세요.');
    }
  };

  const reorderProjects = async (reorderedProjects: Project[]) => {
    if (!auth.currentUser) return;
    
    try {
      const batch = writeBatch(db);
      reorderedProjects.forEach((p, i) => {
        if (p.id) {
          batch.update(doc(db, 'projects', p.id), { order: i });
        }
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projects/reorder');
      alert('순서 저장 중 오류가 발생했습니다.');
    }
  };

  const seedData = async () => {
    let currentUser = auth.currentUser;
    if (!currentUser) { 
      try {
        const result = await signInWithPopup(auth, googleProvider); 
        currentUser = result.user;
      } catch (err) {
        console.error('Login failed', err);
        return;
      }
    }
    if (confirm('모든 데이터를 초기화하고 기본 데이터를 생성하시겠습니까?')) {
      try {
        // 1. Settings
        await setDoc(doc(db, 'settings', 'main'), { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() });
        
        // 2. Projects
        let globalOrder = 0;
        for (const p of DUMMY_PROJECTS) {
          const { photos, ...projectData } = p;
          await setDoc(doc(db, 'projects', p.id), { 
            ...projectData, 
            photoCount: photos?.length || 0,
            order: globalOrder++, 
            createdAt: new Date().toISOString() 
          });
          
          if (photos && photos.length > 0) {
            const batch = writeBatch(db);
            for (let i = 0; i < photos.length; i++) {
              const photoId = i.toString().padStart(3, '0');
              const photoDocRef = doc(db, `projects/${p.id}/gallery`, photoId);
              batch.set(photoDocRef, { url: photos[i], order: i });
            }
            await batch.commit();
          }
        }
        alert('데이터 초기화가 완료되었습니다.');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'projects');
      }
    }
  };

  if (currentPage === 'admin' && !isAdminLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-warm px-6">
        <form 
          onSubmit={(e) => { e.preventDefault(); if (password === '0724') setIsAdminLoggedIn(true); else alert('비밀번호가 틀렸습니다.'); }}
          className="bg-bg-white p-12 shadow-sm max-w-sm w-full border border-border flex flex-col items-center gap-10"
        >
          <h2 className="font-ui text-3xl font-light tracking-tighter">관리자 로그인</h2>
          <input 
            type="password" 
            placeholder="스튜디오 비밀번호" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border-b border-gray-100 bg-transparent py-3 text-center outline-none focus:border-black transition-colors"
          />
          <button type="submit" className="w-full bg-black text-white py-4 font-ui text-[12px] tracking-[0.2em] hover:bg-gray-800 transition-colors">
            로그인하기
          </button>
        </form>
      </div>
    );
  }

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-black/5 border-t-black rounded-full animate-spin mb-8" />
        <div className="text-center px-6">
          <p className="font-ui text-[12px] tracking-[0.4em] opacity-40 uppercase font-light">Wavelet Studio</p>
          <p className="font-ui text-[9px] tracking-[0.1em] opacity-20 uppercase mt-2">v1.6.1-STABLE-RECOVERY</p>
          <div className="mt-8 space-y-1">
            <p className="text-[10px] opacity-20 font-kr">연결을 최적화하고 있습니다.</p>
            <p className="text-[10px] opacity-10 font-kr italic">Domain verified. Initializing secure sync...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-white text-black font-sans selection:bg-black selection:text-white min-h-screen overflow-x-hidden">
      <Navbar 
        currentPage={currentPage} 
        onNavigate={navigateTo} 
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      
      <motion.div
        animate={{ 
          x: isMenuOpen ? (window.innerWidth < 640 ? '75%' : window.innerWidth < 1024 ? '320px' : 0) : 0,
          scale: isMenuOpen ? 0.98 : 1,
          opacity: isMenuOpen ? 0.6 : 1
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="min-h-screen"
        onClick={() => { if (isMenuOpen) setIsMenuOpen(false); }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentPage}-${currentProjectSlug}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {currentPage === 'home' && (
              <HomeView 
                settings={settings} 
                onNavigate={navigateTo} 
                allProjects={displayProjects} 
              />
            )}

            {['place', 'food', 'nature'].includes(currentPage) && (
              activeProject ? (
                <ProjectPage 
                  project={activeProject} 
                  categoryProjects={displayProjects.filter(p => p.category === currentPage)}
                  onBack={() => navigateTo(currentPage)} 
                  onAdmin={() => navigateTo('admin')}
                  onNavigate={navigateTo}
                />
              ) : (
                <CategoryPage 
                  type={currentPage}
                  projects={displayProjects.filter(p => p.category === currentPage)}
                  meta={{
                    title: (settings as any)[`${currentPage}Title`] || currentPage.toUpperCase(),
                    description: (settings as any)[`${currentPage}Description`] || ''
                  }}
                  onNavigate={navigateTo}
                  onAdmin={() => navigateTo('admin')}
                />
              )
            )}

            {currentPage === 'about' && (
              <AboutView settings={settings} onNavigate={navigateTo} />
            )}

            {currentPage === 'admin' && (
              <AdminDashboard 
                settings={settings}
                projects={projects}
                onSaveSettings={saveSettings}
                onAddProject={addProject}
                onUpdateProject={updateProject}
                onDeleteProject={deleteProject}
                onReorderProjects={reorderProjects}
                onSeedData={seedData}
                onLogout={() => { setIsAdminLoggedIn(false); setPassword(''); navigateTo('home'); }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// Sub-views to keep App.tsx clean
const HomeView = ({ settings, onNavigate, allProjects }: any) => {
  const [heroIndex, setHeroIndex] = useState(0);
  const heroes = settings?.heroImages || [];

  useEffect(() => {
    if (heroes.length <= 1) return;
    const interval = setInterval(() => setHeroIndex(v => (v + 1) % heroes.length), 6000);
    return () => clearInterval(interval);
  }, [heroes.length]);

  const featured = useMemo(() => {
    const findFeatured = (id?: string, cat?: string) => {
      if (id) {
        const found = allProjects.find((p: Project) => p.id === id);
        if (found) return found;
      }
      return allProjects.find((p: Project) => p.category === cat);
    };

    return [
      findFeatured(settings.featuredPlaceId, 'place'),
      findFeatured(settings.featuredFoodId, 'food'),
      findFeatured(settings.featuredNatureId, 'nature')
    ].filter(Boolean);
  }, [allProjects, settings]);

  return (
    <div className="pt-[70px]">
      <section className="relative h-[calc(100vh-70px)] overflow-hidden bg-[#e5e7eb] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {heroes.length > 0 && (
            <motion.div
              key={heroIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroes[heroIndex]})` }}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative text-white text-center px-6 md:px-10">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            transition={{ delay: 0.5, duration: 1.2 }}
            className="font-ui text-[20px] min-[360px]:text-[24px] min-[400px]:text-[32px] md:text-[54px] lg:text-[72px] font-thin tracking-normal leading-[1.3] md:leading-[1.1] mb-8 px-5 max-w-[1200px] mx-auto whitespace-normal break-words text-balance"
          >
            {settings.homeHeadline}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 1.2, duration: 1.5 }}
            className="font-ui text-[10px] md:text-[11px] lg:text-[14px] tracking-[0.3em] md:tracking-[0.5em] font-light uppercase opacity-80"
          >
            {settings.homeHeadlineSub || "Photography Studio in Jeju"}
          </motion.p>
          <p className="fixed bottom-2 left-2 text-[8px] text-white/40 select-none z-50 bg-black/20 px-2 py-1 rounded">v1.6.1-FINAL-SYNC</p>
        </div>
        <motion.div 
          animate={{ y: [0, 8, 0] }} 
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute bottom-12 text-white/50"
        >
          <ArrowDown size={30} strokeWidth={1} />
        </motion.div>
      </section>

      <section className="px-6 md:px-10 py-16 md:py-24 lg:py-40 grid lg:grid-cols-2 gap-10 lg:gap-24 max-w-[1200px] mx-auto items-start lg:items-center">
        <h2 className="font-ui text-[26px] sm:text-[32px] md:text-[40px] lg:text-[48px] text-text-main leading-[1.2] font-light tracking-tight lg:max-w-[500px]">
          {settings.homeHeadline}
        </h2>
        <div className="flex flex-col gap-6">
          <div className="w-12 h-[1px] bg-accent/30 hidden lg:block" />
          <p className="font-kr font-light text-[13px] md:text-[15px] lg:text-[16px] text-text-sub leading-[1.8] md:leading-[2] whitespace-pre-wrap max-w-[550px]">
            {settings.homeIntro}
          </p>
        </div>
      </section>

      <section className="px-6 md:px-10 pb-20 md:pb-40 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featured.map((project: Project) => (
            <motion.div 
              key={project.id} 
              className="cursor-pointer group flex flex-col"
              onClick={() => onNavigate(`${project.category}/${getProjectSlug(project.clientName)}`)}
            >
              <div className="overflow-hidden aspect-[4/5] bg-bg-warm">
                <img src={project.mainImage} className="w-full h-full object-cover grayscale-0 lg:grayscale opacity-90 group-hover:opacity-100 lg:group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105" />
              </div>
              <div className="mt-8">
                <span className="font-ui text-[10px] tracking-[0.4em] text-accent/60 uppercase">{project.category}</span>
                <h3 className="font-ui text-[14px] tracking-[0.15em] text-text-main mt-3 font-medium uppercase">{project.clientName}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer onAdmin={() => onNavigate('admin')} />
    </div>
  );
};

const AboutView = ({ settings, onNavigate }: any) => (
  <div className="pt-[100px] md:pt-[140px] bg-bg-white">
    <section className="px-6 md:px-10 grid md:grid-cols-2 gap-16 md:gap-24 max-w-[1200px] mx-auto mb-20 md:mb-40 items-center">
      <div className="space-y-8 md:space-y-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-ui text-[32px] min-[400px]:text-[48px] md:text-[60px] text-text-main font-thin tracking-tight mb-4 text-balance">
            {settings.aboutHeadline}
          </h1>
          <p className="font-ui text-[10px] md:text-[12px] tracking-[0.3em] md:tracking-[0.4em] text-accent uppercase font-medium">
            {settings.aboutSub}
          </p>
        </motion.div>
        <div className="font-kr font-light text-[14px] md:text-[15px] leading-[2.4] text-text-sub whitespace-pre-wrap max-w-[500px]">
          {settings.aboutBody}
        </div>
      </div>
      <div className="aspect-[4/5] bg-bg-warm overflow-hidden shadow-sm">
        {settings.aboutImage ? (
          <img 
            src={settings.aboutImage} 
            alt="About" 
            className="w-full h-full object-cover grayscale-0 lg:grayscale brightness-95 opacity-90 lg:hover:grayscale-0 hover:opacity-100 transition-all duration-1000" 
          />
        ) : (
          <img 
            src={settings.heroImages[0]} 
            alt="About" 
            className="w-full h-full object-cover grayscale-0 lg:grayscale brightness-95 opacity-90 lg:hover:grayscale-0 hover:opacity-100 transition-all duration-1000" 
          />
        )}
      </div>
    </section>
    <Footer onAdmin={() => onNavigate('admin')} />
  </div>
);
