import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Save, RefreshCw, X, Image as ImageIcon, Upload, Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { Project, GlobalSettings } from '../types';
import { compressImage } from '../lib/imageUtils';
import { getProjectSlug } from '../lib/slugUtils';
import { auth, db, collection, getDocs, query, orderBy, signInWithPopup, googleProvider, storage, ref, uploadBytes, getDownloadURL } from '../firebase';

interface AdminDashboardProps {
  settings: GlobalSettings;
  projects: Project[];
  onSaveSettings: (s: GlobalSettings) => Promise<void>;
  onAddProject: (item: Partial<Project>) => Promise<boolean>;
  onUpdateProject: (id: string, item: Partial<Project>) => Promise<boolean>;
  onDeleteProject: (id: string) => Promise<void>;
  onRestoreProject: (id: string) => Promise<void>;
  onPermanentlyDeleteProject: (id: string) => Promise<void>;
  onReorderProjects: (items: Project[]) => Promise<void>;
  onSeedData: () => void;
  onLogout: () => void;
}

export const AdminDashboard = ({ 
  settings, 
  projects, 
  onSaveSettings, 
  onAddProject, 
  onUpdateProject,
  onDeleteProject,
  onRestoreProject,
  onPermanentlyDeleteProject,
  onReorderProjects,
  onSeedData,
  onLogout
}: AdminDashboardProps) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'projects' | 'category' | 'footer'>('home');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({ 
    category: 'place' as const, 
    clientName: '', 
    description: '', 
    mainImage: '', 
    photos: [] as string[] 
  });

  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryPhotosInputRef = useRef<HTMLInputElement>(null);
  const heroImagesInputRef = useRef<HTMLInputElement>(null);
  const aboutImageInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File): Promise<Blob> => {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 1800;
    const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
    const canvas = new OffscreenCanvas(bitmap.width * scale, bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    }
    bitmap.close();
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
  };

  const uploadToStorage = async (blob: Blob, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    return getDownloadURL(storageRef);
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const blob = await processFile(file);
      const filename = `main_${Date.now()}_${file.name}`;
      const url = await uploadToStorage(blob, `uploads/${filename}`);
      setProjectForm(prev => ({ ...prev, mainImage: url }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const blob = await processFile(files[i]);
        const filename = `gallery_${Date.now()}_${i}_${files[i].name}`;
        const url = await uploadToStorage(blob, `uploads/${filename}`);
        newUrls.push(url);
      }
      setProjectForm(prev => ({ 
        ...prev, 
        photos: [...prev.photos, ...newUrls] 
      }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('갤러리 이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      if (galleryPhotosInputRef.current) galleryPhotosInputRef.current.value = '';
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const blob = await processFile(files[i]);
        const filename = `hero_${Date.now()}_${i}_${files[i].name}`;
        const url = await uploadToStorage(blob, `settings/${filename}`);
        urls.push(url);
      }
      setLocalSettings(prev => ({ ...prev, heroImages: [...prev.heroImages, ...urls] }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('히어로 이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      if (heroImagesInputRef.current) heroImagesInputRef.current.value = '';
    }
  };

  const handleAboutImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const blob = await processFile(file);
      const filename = `about_${Date.now()}_${file.name}`;
      const url = await uploadToStorage(blob, `settings/${filename}`);
      setLocalSettings(prev => ({ ...prev, aboutImage: url }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('어바웃 이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setProjectForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  const movePhoto = (index: number, direction: 'left' | 'right') => {
    setProjectForm(prev => {
      const newPhotos = [...prev.photos];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newPhotos.length) return prev;
      
      const temp = newPhotos[index];
      newPhotos[index] = newPhotos[targetIndex];
      newPhotos[targetIndex] = temp;
      return { ...prev, photos: newPhotos };
    });
  };

  const moveHero = (index: number, direction: 'left' | 'right') => {
    setLocalSettings(prev => {
      const newHeroes = prev.heroImages ? [...prev.heroImages] : [];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newHeroes.length) return prev;
      
      const temp = newHeroes[index];
      newHeroes[index] = newHeroes[targetIndex];
      newHeroes[targetIndex] = temp;
      return { ...prev, heroImages: newHeroes };
    });
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const categories: ('place' | 'food' | 'nature')[] = ['place', 'food', 'nature'];

  const moveProject = async (e: React.MouseEvent, category: string, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (!auth.currentUser) {
      alert('관리자 인증이 필요합니다.');
      return;
    }
    if (isReordering) return;
    
    setIsReordering(true);
    try {
      // 1. Get all projects in this category, stable sorted
      const catProjects = [...projects]
        .filter(p => p.category === category)
        .sort((a, b) => {
          const orderDiff = (a.order ?? 0) - (b.order ?? 0);
          if (orderDiff !== 0) return orderDiff;
          return a.id.localeCompare(b.id);
        });
      
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= catProjects.length) {
        setIsReordering(false);
        return;
      }
      
      // 2. We find the specific two projects to swap relative positions
      const p1 = catProjects[index];
      const p2 = catProjects[targetIndex];
      
      // 3. Construct a strictly ordered global list
      // We sort EVERYTHING globally first to define a baseline sequence
      const globalProjectsOrdered = [...projects].sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.id.localeCompare(b.id);
      });

      const gIdx1 = globalProjectsOrdered.findIndex(p => p.id === p1.id);
      const gIdx2 = globalProjectsOrdered.findIndex(p => p.id === p2.id);
      
      if (gIdx1 !== -1 && gIdx2 !== -1) {
        const temp = globalProjectsOrdered[gIdx1];
        globalProjectsOrdered[gIdx1] = globalProjectsOrdered[gIdx2];
        globalProjectsOrdered[gIdx2] = temp;
        
        // Map to guaranteed sequential orders [0, 1, 2, ...]
        const final = globalProjectsOrdered.map((p, i) => ({ ...p, order: i }));
        await onReorderProjects(final);
      }
    } catch (err) {
      console.error('Reorder error:', err);
      alert('순서 변경 중 오류가 발생했습니다.');
    } finally {
      setIsReordering(false);
    }
  };

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Login error:', err);
      setAuthError(err instanceof Error ? err.message : '인증 실패');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (!auth.currentUser) {
      alert('관리자 인증이 필요합니다.');
      return;
    }
    setDeleteConfirmId(project.id);
  };

  const confirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirmId) {
      const idToDelete = deleteConfirmId;
      setDeleteConfirmId(null); // Close overlay first for better UX
      await onDeleteProject(idToDelete);
    }
  };

  const handleEditProject = async (project: Project) => {
    setEditingId(project.id);
    
    // Fetch photos from subcollection since they aren't in the main project doc
    let photos: string[] = [];
    try {
      const photosRef = collection(db, `projects/${project.id}/gallery`);
      const q = query(photosRef, orderBy('order', 'asc'));
      const snap = await getDocs(q);
      photos = snap.docs.map(doc => doc.data().url);
    } catch (err) {
      console.error('Error fetching project photos:', err);
      photos = project.photos || []; // Fallback
    }

    setProjectForm({
      category: project.category,
      clientName: project.clientName,
      description: project.description || '',
      mainImage: project.mainImage,
      photos
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setProjectForm({ 
      category: 'place', 
      clientName: '', 
      description: '', 
      mainImage: '', 
      photos: [] 
    });
  };

  return (
    <div className="pt-[110px] md:pt-[140px] px-5 sm:px-6 md:px-10 pb-32 max-w-[1200px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8 mb-12 md:mb-16">
        <div className="flex flex-col gap-2">
          <h1 className="font-ui text-xl md:text-3xl tracking-tighter font-light flex items-center gap-3">
            관리자 대시보드
            <span className="text-[10px] font-mono text-gray-300 font-normal opacity-50">v1.2</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shadow-sm ${auth.currentUser ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-ui text-[10px] tracking-widest text-text-sub uppercase font-bold">
              {auth.currentUser ? `연결됨: ${auth.currentUser.email}` : '관리자 인증이 필요합니다'}
            </span>
            {!auth.currentUser && (
              <button 
                onClick={handleLogin}
                className="font-ui text-[11px] tracking-widest bg-black text-white px-3 py-1 rounded-sm hover:bg-zinc-800 transition-colors ml-2 uppercase font-bold"
              >
                인증하기 (Google Login)
              </button>
            )}
            {authError && (
              <div className="flex flex-col ml-4 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 max-w-md">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <h3 className="text-blue-900 font-kr text-[14px] font-extrabold pb-0.5 border-b-2 border-blue-200">중요: Firebase 도메인 승인 필요</h3>
                </div>
                
                <p className="text-blue-800 font-kr text-[11px] leading-relaxed mb-5">
                  현재 접속 중인 도메인이 Firebase에서 승인되지 않았습니다.<br/>
                  아래 주소를 복사하여 Firebase 콘솔 <span className="font-bold">{"설정 > 승인된 도메인"}</span>에 추가해 주세요.
                </p>
                
                <div className="bg-white p-4 rounded-md border border-blue-100 shadow-inner mb-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-kr text-[9px] font-bold uppercase tracking-widest">Authorized Domain</span>
                      <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold">COPY THIS</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="flex-1 text-blue-700 font-mono text-[13px] font-black break-all select-all">{window.location.hostname}</code>
                      <button 
                        onClick={() => {
                          const hostname = window.location.hostname;
                          navigator.clipboard.writeText(hostname).then(() => {
                            alert(`[${hostname}] 도메인이 복사되었습니다.\n\nFirebase 콘솔의 '승인된 도메인' 리스트에 추가해 주세요.`);
                          });
                        }}
                        className="whitespace-nowrap font-kr text-[11px] bg-blue-600 text-white px-4 py-2.5 rounded-md hover:bg-blue-700 active:scale-95 transition-all shadow-md font-black ring-4 ring-blue-100"
                      >
                        주소 복사하기
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-300 font-kr text-[9px] font-black uppercase">System Error Log</span>
                  </div>
                  <code className="text-[10px] text-blue-400 font-mono bg-blue-50/50 p-2 block rounded border border-blue-50 overflow-x-auto whitespace-pre-wrap">
                    {authError}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 md:gap-8">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`font-ui text-[11px] tracking-[0.2em] transition-all ${activeTab === 'home' ? 'text-black border-b border-black pb-1' : 'text-gray-300'}`}
          >
            홈 설정
          </button>
          <button 
            onClick={() => setActiveTab('projects')} 
            className={`font-ui text-[11px] tracking-[0.2em] transition-all ${activeTab === 'projects' ? 'text-black border-b border-black pb-1' : 'text-gray-300'}`}
          >
            프로젝트 관리
          </button>
          <button 
            onClick={() => setActiveTab('category')} 
            className={`font-ui text-[11px] tracking-[0.2em] transition-all ${activeTab === 'category' ? 'text-black border-b border-black pb-1' : 'text-gray-300'}`}
          >
            카테고리 문구 관리
          </button>
          <button 
            onClick={() => setActiveTab('about')} 
            className={`font-ui text-[11px] tracking-[0.2em] transition-all ${activeTab === 'about' ? 'text-black border-b border-black pb-1' : 'text-gray-300'}`}
          >
            어바웃 설정
          </button>
          <button 
            onClick={() => setActiveTab('footer')} 
            className={`font-ui text-[11px] tracking-[0.2em] transition-all ${activeTab === 'footer' ? 'text-black border-b border-black pb-1' : 'text-gray-300'}`}
          >
            푸터 설정
          </button>
          <button 
            onClick={onLogout}
            className="font-ui text-[11px] tracking-[0.2em] text-red-400 hover:text-red-600"
          >
            로그아웃
          </button>
        </div>
      </div>

      {activeTab === 'home' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 메인 헤드라인 (상단)</label>
            <input value={localSettings.homeHeadline} onChange={e => setLocalSettings(s => ({ ...s, homeHeadline: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm transition-colors bg-transparent text-text-main" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 메인 배경 문구 (하단)</label>
            <input value={localSettings.homeHeadlineSub || ''} onChange={e => setLocalSettings(s => ({ ...s, homeHeadlineSub: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm transition-colors bg-transparent text-text-main" placeholder="Photography Studio in Jeju" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 소개 섹션 제목</label>
            <input value={localSettings.homeIntroTitle || ''} onChange={e => setLocalSettings(s => ({ ...s, homeIntroTitle: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm transition-colors bg-transparent text-text-main" placeholder="홈 소개 섹션 제목을 입력하세요" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 소개 문구</label>
            <textarea rows={3} value={localSettings.homeIntro} onChange={e => setLocalSettings(s => ({ ...s, homeIntro: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm resize-none transition-colors bg-transparent text-text-main" />
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 슬라이더 이미지 ({localSettings.heroImages?.length || 0}개)</label>
              <div className="flex items-center gap-4">
                {isUploading && uploadProgress.total > 0 && activeTab === 'home' && (
                  <span className="font-ui text-[9px] text-accent animate-pulse">
                    업로드 중... ({uploadProgress.current}/{uploadProgress.total})
                  </span>
                )}
                <button 
                  disabled={isUploading}
                  onClick={() => heroImagesInputRef.current?.click()}
                  className="font-ui text-[10px] tracking-widest text-accent flex items-center gap-2 hover:opacity-70 transition-opacity disabled:opacity-30"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} 
                  이미지 추가
                </button>
              </div>
              <input 
                ref={heroImagesInputRef}
                type="file" 
                multiple 
                accept="image/*"
                onChange={handleHeroUpload}
                className="hidden" 
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {localSettings.heroImages?.map((url, i) => (
                <div key={i} className="relative aspect-[4/3] group bg-bg-white border border-border overflow-hidden">
                  <img src={url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => moveHero(i, 'left')}
                        disabled={i === 0}
                        className="bg-white/90 p-2 text-black hover:bg-white disabled:opacity-30 rounded-full"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        onClick={() => moveHero(i, 'right')}
                        disabled={i === (localSettings.heroImages?.length || 0) - 1}
                        className="bg-white/90 p-2 text-black hover:bg-white disabled:opacity-30 rounded-full"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(prev => ({ ...prev, heroImages: prev.heroImages?.filter((_, idx) => idx !== i) || [] }))}
                      className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {(localSettings.heroImages?.length || 0) === 0 && (
                <div className="col-span-full py-10 border border-dashed border-border flex items-center justify-center text-gray-300">
                  <ImageIcon size={40} strokeWidth={1} />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6 pt-10 border-t border-border">
            <h3 className="font-ui text-xs tracking-widest text-black uppercase font-bold">홈 대표 프로젝트 설정 (카테고리별 1개)</h3>
            <div className="grid md:grid-cols-3 gap-8">
              {(['place', 'food', 'nature'] as const).map(cat => (
                <div key={cat} className="flex flex-col gap-3">
                  <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">{cat.toUpperCase()} 대표 프로젝트</label>
                  <select 
                    value={cat === 'place' ? localSettings.featuredPlaceId : cat === 'food' ? localSettings.featuredFoodId : localSettings.featuredNatureId}
                    onChange={e => {
                      const id = e.target.value;
                      if (cat === 'place') setLocalSettings(s => ({ ...s, featuredPlaceId: id }));
                      if (cat === 'food') setLocalSettings(s => ({ ...s, featuredFoodId: id }));
                      if (cat === 'nature') setLocalSettings(s => ({ ...s, featuredNatureId: id }));
                    }}
                    className="bg-bg-white border border-border p-3 outline-none font-ui text-xs text-text-main focus:border-black transition-colors"
                  >
                    <option value="">선택 안함 (랜덤 표시)</option>
                    {Array.from(new Map(projects.filter(p => !p.isDeleted && p.category === cat).map(p => [p.id, p])).values()).map(p => (
                      <option key={p.id} value={p.id}>{p.clientName}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              onClick={() => onSaveSettings(localSettings)}
              className="bg-black text-white px-12 py-4 font-ui text-[11px] tracking-[0.2em] hover:bg-gray-800 transition-colors flex items-center gap-3 font-medium"
            >
              <Save size={16} /> 설정 저장하기
            </button>
            <button 
              onClick={onSeedData}
              className="border border-border px-8 py-4 font-ui text-[11px] tracking-[0.2em] hover:bg-bg-warm transition-colors flex items-center gap-3 text-text-main"
            >
              <RefreshCw size={16} /> 초기 데이터로 복구
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'about' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">어바웃 페이지 부제</label>
            <input value={localSettings.aboutSub} onChange={e => setLocalSettings(s => ({ ...s, aboutSub: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm transition-colors bg-transparent text-text-main" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">어바웃 본문 내용</label>
            <textarea rows={10} value={localSettings.aboutBody} onChange={e => setLocalSettings(s => ({ ...s, aboutBody: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm resize-none transition-colors bg-transparent text-text-main" />
          </div>

          <div className="flex flex-col gap-4">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">어바웃 페이지 사진</label>
            <div 
              onClick={() => aboutImageInputRef.current?.click()}
              className="relative aspect-[3/4] max-w-[300px] bg-bg-white border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer group hover:border-black transition-colors overflow-hidden"
            >
              {localSettings.aboutImage ? (
                <img src={localSettings.aboutImage} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-300">
                  <Upload size={32} />
                  <span className="text-[10px] tracking-widest text-center">이미지 업로드<br/>(클릭하여 파일 선택)</span>
                </div>
              )}
              <input 
                ref={aboutImageInputRef}
                type="file" 
                accept="image/*"
                onChange={handleAboutImageUpload}
                className="hidden" 
              />
            </div>
            {localSettings.aboutImage && (
              <button 
                onClick={() => setLocalSettings(s => ({ ...s, aboutImage: undefined }))}
                className="text-red-400 text-[10px] tracking-widest hover:text-red-600 self-start"
              >
                사진 삭제
              </button>
            )}
          </div>
          
          <div className="flex gap-4 pt-6">
            <button 
              onClick={() => onSaveSettings(localSettings)}
              className="bg-black text-white px-12 py-4 font-ui text-[11px] tracking-[0.2em] hover:bg-gray-800 transition-colors flex items-center gap-3 font-medium"
            >
              <Save size={16} /> 설정 저장하기
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'category' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-12">
          {(['place', 'food', 'nature'] as const).map(cat => (
            <div key={cat} className="flex flex-col gap-6 p-8 bg-bg-warm/30 border border-border/50 rounded-sm">
              <h3 className="font-ui text-sm tracking-widest text-black uppercase font-bold border-b border-border pb-3">
                {cat === 'place' ? 'PLACE' : cat === 'food' ? 'FOOD' : 'NATURE'} 카테고리 설정
              </h3>
              <div className="flex flex-col gap-3">
                <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">대제목 (Title)</label>
                <input 
                  value={localSettings[`${cat}Title` as keyof GlobalSettings] as string || ''} 
                  onChange={e => setLocalSettings(s => ({ ...s, [`${cat}Title`]: e.target.value }))} 
                  className="bg-bg-white border border-border p-3 outline-none font-kr text-sm focus:border-black transition-colors" 
                  placeholder={cat.toUpperCase()}
                />
              </div>
              <div className="flex flex-col gap-3">
                <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">설명 텍스트 (Description)</label>
                <textarea 
                  rows={4} 
                  value={localSettings[`${cat}Description` as keyof GlobalSettings] as string || ''} 
                  onChange={e => setLocalSettings(s => ({ ...s, [`${cat}Description`]: e.target.value }))} 
                  className="bg-bg-white border border-border p-3 outline-none font-kr text-sm resize-none focus:border-black transition-colors" 
                  placeholder="카테고리에 대한 설명을 입력하세요..."
                />
              </div>
            </div>
          ))}
          
          <div className="flex gap-4 pt-6">
            <button 
              onClick={() => onSaveSettings(localSettings)}
              className="bg-black text-white px-12 py-4 font-ui text-[11px] tracking-[0.2em] hover:bg-gray-800 transition-colors flex items-center gap-3 font-medium"
            >
              <Save size={16} /> 카테고리 설정 저장하기
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'footer' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10">
          <div className="bg-bg-warm/30 p-8 border border-border/50 rounded-sm space-y-8">
            <h3 className="font-ui text-sm tracking-widest text-black uppercase font-bold border-b border-border pb-3">푸터 연락처/링크 설정</h3>
            
            <div className="flex flex-col gap-3">
              <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">이메일 주소</label>
              <input 
                type="email"
                value={localSettings.footerEmail || ''} 
                onChange={e => setLocalSettings(s => ({ ...s, footerEmail: e.target.value }))} 
                className="bg-bg-white border border-border p-3 outline-none font-kr text-sm focus:border-black transition-colors" 
                placeholder="wavelet@example.com"
              />
              <p className="text-[10px] text-gray-400 font-kr">클릭 시 메일 앱이 자동으로 실행됩니다.</p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">인스타그램 URL</label>
              <input 
                value={localSettings.footerInstagram || ''} 
                onChange={e => setLocalSettings(s => ({ ...s, footerInstagram: e.target.value }))} 
                className="bg-bg-white border border-border p-3 outline-none font-kr text-sm focus:border-black transition-colors" 
                placeholder="https://instagram.com/studio_id"
              />
              <p className="text-[10px] text-gray-400 font-kr">https://를 포함한 전체 주소를 입력하세요.</p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">카카오톡 오픈채팅 URL</label>
              <input 
                value={localSettings.footerKakao || ''} 
                onChange={e => setLocalSettings(s => ({ ...s, footerKakao: e.target.value }))} 
                className="bg-bg-white border border-border p-3 outline-none font-kr text-sm focus:border-black transition-colors" 
                placeholder="https://open.kakao.com/me/..."
              />
              <p className="text-[10px] text-gray-400 font-kr">카카오톡 ID 대신 오픈채팅 링크 주소를 입력하세요.</p>
            </div>

            <div className="flex flex-col gap-3 pt-6 border-t border-border/50">
              <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">푸터 소개 문구</label>
              <textarea 
                rows={2}
                value={localSettings.footerIntro || ''} 
                onChange={e => setLocalSettings(s => ({ ...s, footerIntro: e.target.value }))} 
                className="bg-bg-white border border-border p-3 outline-none font-kr text-sm focus:border-black transition-colors resize-none" 
                placeholder="Wavelet Studio는 제주에 기반을 둔 포토그래피 스튜디오입니다. 공간, 음식, 자연을 기록합니다."
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">푸터 저작권 문구</label>
              <input 
                value={localSettings.footerCopyright || ''} 
                onChange={e => setLocalSettings(s => ({ ...s, footerCopyright: e.target.value }))} 
                className="bg-bg-white border border-border p-3 outline-none font-kr text-sm focus:border-black transition-colors" 
                placeholder="COPYRIGHT ©WAVELET STUDIO. ALL RIGHTS RESERVED."
              />
            </div>
          </div>
          
          <div className="flex gap-4 pt-6">
            <button 
              onClick={() => onSaveSettings(localSettings)}
              className="bg-black text-white px-12 py-4 font-ui text-[11px] tracking-[0.2em] hover:bg-gray-800 transition-colors flex items-center gap-3 font-medium"
            >
              <Save size={16} /> 푸터 설정 저장하기
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'projects' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-16">
          {/* New/Edit Project Form */}
          <div className="bg-bg-warm p-10 rounded-sm border border-border/50">
            <div className="flex justify-between items-center mb-10">
              <h3 className="font-ui text-2xl flex items-center gap-3 font-light tracking-tighter">
                {editingId ? <RefreshCw size={24}/> : <Plus size={24}/>} 
                {editingId ? '프로젝트 수정하기' : '새 프로젝트 추가'}
              </h3>
              {editingId && (
                <button 
                  onClick={resetForm}
                  className="font-ui text-[10px] tracking-widest text-text-sub hover:text-black flex items-center gap-1 uppercase"
                >
                  <X size={14} /> 취소하고 새로 만들기
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="font-ui text-[10px] tracking-widest uppercase text-gray-400">카테고리 선택</label>
                  <select 
                    value={projectForm.category} 
                    onChange={e => setProjectForm(n => ({ ...n, category: e.target.value as any }))}
                    className="bg-bg-white border border-border p-3 outline-none font-ui text-xs text-text-main"
                  >
                    <option value="place">PLACE (공간)</option>
                    <option value="food">FOOD (음식)</option>
                    <option value="nature">NATURE (자연)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-ui text-[10px] tracking-widest uppercase text-gray-400">클라이언트 / 프로젝트 명</label>
                  <input value={projectForm.clientName} onChange={e => setProjectForm(n => ({ ...n, clientName: e.target.value }))} className="bg-bg-white border border-border p-3 outline-none font-kr text-sm focus:border-black transition-colors text-text-main" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-ui text-[10px] tracking-widest uppercase text-gray-400">설명 (선택사항)</label>
                  <textarea value={projectForm.description} onChange={e => setProjectForm(n => ({ ...n, description: e.target.value }))} className="bg-bg-white border border-border p-3 outline-none font-kr text-sm resize-none h-24 focus:border-black transition-colors text-text-main" />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="font-ui text-[10px] tracking-widest uppercase text-gray-400">대표 메인 이미지 (4:5 비율 추천)</label>
                  <div 
                    onClick={() => mainImageInputRef.current?.click()}
                    className="relative aspect-[4/5] max-w-[200px] bg-bg-white border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer group hover:border-black transition-colors overflow-hidden mx-auto md:mx-0"
                  >
                    {projectForm.mainImage ? (
                      <img src={projectForm.mainImage} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-300">
                        <Upload size={32} />
                        <span className="text-[10px] tracking-widest text-center">이미지 업로드<br/>(클릭하여 파일 선택)</span>
                      </div>
                    )}
                    <input 
                      ref={mainImageInputRef}
                      type="file" 
                      accept="image/*"
                      onChange={handleMainImageUpload}
                      className="hidden" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="font-ui text-[10px] tracking-widest uppercase text-gray-400">갤러리 사진 ({projectForm.photos.length}개)</label>
                  <div className="flex items-center gap-4">
                    {isUploading && (
                      <span className="font-ui text-[9px] text-accent animate-pulse">
                        업로드 중... ({uploadProgress.current}/{uploadProgress.total})
                      </span>
                    )}
                    <button 
                      disabled={isUploading}
                      onClick={() => galleryPhotosInputRef.current?.click()}
                      className="font-ui text-[10px] tracking-widest text-accent flex items-center gap-2 hover:opacity-70 transition-opacity disabled:opacity-30"
                    >
                      {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} 
                      사진 여러장 추가
                    </button>
                  </div>
                  <input 
                    ref={galleryPhotosInputRef}
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    className="hidden" 
                  />
                </div>
                
                <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-2">
                  {projectForm.photos.map((url, i) => (
                    <div key={i} className="relative aspect-square group bg-bg-white border border-border overflow-hidden">
                      <img src={url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); movePhoto(i, 'left'); }}
                            disabled={i === 0}
                            className="bg-white/90 p-1.5 text-black hover:bg-white disabled:opacity-30 rounded-sm"
                            title="왼쪽으로 이동"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); movePhoto(i, 'right'); }}
                            disabled={i === projectForm.photos.length - 1}
                            className="bg-white/90 p-1.5 text-black hover:bg-white disabled:opacity-30 rounded-sm"
                            title="오른쪽으로 이동"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                          className="bg-red-500/90 p-1.5 text-white hover:bg-red-600 rounded-sm"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {projectForm.photos.length === 0 && (
                    <div className="col-span-full aspect-video border border-dashed border-border flex items-center justify-center text-gray-200">
                      <ImageIcon size={40} strokeWidth={1} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 mt-12">
              <button 
                disabled={!projectForm.clientName || !projectForm.mainImage || projectForm.photos.length === 0 || isUploading}
                onClick={() => {
                  if (editingId) {
                    onUpdateProject(editingId, projectForm).then(success => {
                      if (success) resetForm();
                    });
                  } else {
                    onAddProject(projectForm).then(success => {
                      if (success) resetForm();
                    });
                  }
                }}
                className="bg-black text-white px-12 py-4 font-ui text-[11px] tracking-[0.2em] hover:bg-gray-800 disabled:bg-border transition-colors font-medium flex items-center gap-3"
              >
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {editingId ? '프로젝트 수정 완료' : '프로젝트 생성하기'}
              </button>
              {editingId && (
                <button 
                  onClick={resetForm}
                  className="border border-border px-8 py-4 font-ui text-[11px] tracking-[0.2em] hover:bg-bg-warm transition-colors text-text-main"
                >
                  취소
                </button>
              )}
            </div>
          </div>

          {/* Project List Grouped by Category */}
          <div className="space-y-24 relative">
            {isReordering && (
              <div className="fixed inset-0 bg-white/40 backdrop-blur-[2px] z-[100] flex items-center justify-center cursor-wait">
                <div className="bg-black text-white px-6 py-3 rounded-full font-ui text-[10px] tracking-[0.3em] uppercase flex items-center gap-3 shadow-xl">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Order...
                </div>
              </div>
            )}
            
            {categories.map(cat => {
              const catProjects = projects
                .filter(p => p.category === cat && !p.isDeleted)
                .sort((a, b) => {
                  const diff = (a.order ?? 0) - (b.order ?? 0);
                  if (diff !== 0) return diff;
                  return a.id.localeCompare(b.id);
                });
              return (
                <div key={cat} className="space-y-10">
                  <div className="flex items-center gap-4 border-b border-border pb-4">
                    <h3 className="font-ui text-xl tracking-tighter uppercase font-light text-black">
                      {cat === 'place' ? 'PLACE (공간)' : cat === 'food' ? 'FOOD (음식/제품)' : 'NATURE (자연/기타)'}
                    </h3>
                    <span className="font-ui text-[10px] bg-bg-warm px-2 py-0.5 text-text-sub rounded-full">
                      {catProjects.length} projects
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {catProjects.map((project, idx) => (
                      <div 
                        key={project.id} 
                        onClick={() => handleEditProject(project)}
                        className={`group relative flex flex-col bg-bg-white border transition-all duration-300 hover:shadow-md cursor-pointer ${editingId === project.id ? 'border-black ring-1 ring-black' : 'border-border/50'}`}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-[4/5] bg-bg-warm overflow-hidden relative">
                          <img src={project.mainImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-grayscale duration-500" />
                          
                          {/* Always visible header for projects for quick actions */}
                          <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <button 
                              onClick={(e) => handleDeleteClick(e, project)}
                              className="bg-red-500 text-white p-2 rounded-sm shadow-sm hover:bg-red-600 transition-colors"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className="flex flex-col gap-1">
                              <button 
                                disabled={idx === 0}
                                onClick={(e) => moveProject(e, cat, idx, 'up')}
                                className="bg-black text-white p-2 rounded-sm shadow-sm hover:bg-gray-800 transition-colors disabled:opacity-20"
                                title="위로 이동"
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button 
                                disabled={idx === catProjects.length - 1}
                                onClick={(e) => moveProject(e, cat, idx, 'down')}
                                className="bg-black text-white p-2 rounded-sm shadow-sm hover:bg-gray-800 transition-colors disabled:opacity-20"
                                title="아래로 이동"
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Title & Info */}
                        <div className="p-4 flex flex-col gap-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-ui text-[13px] tracking-tight text-text-main font-medium truncate">{project.clientName}</h4>
                            <span className="font-mono text-[8px] text-gray-300 select-all ml-2 shrink-0">ID: {project.id}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-text-sub font-ui uppercase tracking-widest">
                            <span className="flex items-center gap-1"><ImageIcon size={10} /> {project.photoCount || 0}</span>
                            <a 
                              href={`#${project.category}/${getProjectSlug(project.clientName)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-black flex items-center gap-1"
                            >
                              VIEW <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>

                        {/* Delete Confirmation Overlay */}
                        {deleteConfirmId === project.id && (
                          <div className="absolute inset-0 bg-black/90 z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
                            <p className="text-white font-kr text-sm mb-6 leading-relaxed">이 프로젝트를<br/>삭제하시겠습니까?</p>
                            <div className="flex flex-col w-full gap-2">
                              <button 
                                onClick={confirmDelete}
                                className="w-full bg-red-500 text-white py-2.5 rounded-sm font-ui text-[11px] tracking-widest uppercase hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                className="w-full bg-white/10 text-white py-2.5 rounded-sm font-ui text-[11px] tracking-widest uppercase hover:bg-white/20 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {catProjects.length === 0 && (
                    <div className="py-12 text-center border border-dashed border-border/50 rounded-sm bg-bg-warm/30">
                      <p className="font-ui text-[10px] tracking-widest text-text-sub uppercase italic">no projects found in this category</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Trash Section */}
            {projects.some(p => p.isDeleted) && (
              <div className="mt-32 pt-20 border-t-4 border-double border-border/30">
                <div className="flex items-center gap-4 mb-12">
                  <h3 className="font-ui text-xl tracking-tighter uppercase font-bold text-red-800/60">
                    삭제된 프로젝트 (휴지통)
                  </h3>
                  <span className="font-ui text-[10px] bg-red-50 px-2 py-0.5 text-red-400 rounded-full">
                    {projects.filter(p => p.isDeleted).length} items
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                  {projects
                    .filter(p => p.isDeleted)
                    .sort((a, b) => b.id.localeCompare(a.id))
                    .map(project => (
                      <div key={project.id} className="relative flex flex-col bg-bg-white border border-border/50 group">
                        <div className="aspect-[4/5] bg-bg-warm overflow-hidden relative">
                          <img src={project.mainImage} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => onRestoreProject(project.id)}
                              className="w-full bg-white text-black py-2 rounded-sm font-ui text-[10px] tracking-widest uppercase hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                              <RefreshCw size={12} /> RESTORE
                            </button>
                            <button 
                              onClick={() => onPermanentlyDeleteProject(project.id)}
                              className="w-full bg-red-600 text-white py-2 rounded-sm font-ui text-[10px] tracking-widest uppercase hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Trash2 size={12} /> DELETE PERMANENTLY
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <h4 className="font-ui text-[13px] tracking-tight text-text-main font-medium truncate uppercase">{project.clientName}</h4>
                            <span className="font-mono text-[8px] text-gray-300 select-all ml-2 shrink-0">ID: {project.id}</span>
                          </div>
                          <span className="font-ui text-[9px] text-red-400 tracking-widest">{project.category.toUpperCase()}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
