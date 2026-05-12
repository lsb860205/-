// Version 1.5 - Forced Sync Update
import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Save, RefreshCw, X, Image as ImageIcon, Upload, Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { Project, GlobalSettings } from '../types';
import { CATEGORY_META } from '../constants';
import { compressImage } from '../lib/imageUtils';
import { getProjectSlug } from '../lib/slugUtils';
import { auth, signInWithPopup, googleProvider } from '../firebase';

interface AdminDashboardProps {
  settings: GlobalSettings;
  projects: Project[];
  onSaveSettings: (s: GlobalSettings) => Promise<void>;
  onAddProject: (item: Partial<Project>) => Promise<boolean>;
  onUpdateProject: (id: string, item: Partial<Project>) => Promise<boolean>;
  onDeleteProject: (id: string) => Promise<void>;
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
  onReorderProjects,
  onSeedData,
  onLogout
}: AdminDashboardProps) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync only on initial load or if explicitly requested (to avoid flickers while typing)
  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      setLocalSettings(settings);
    }
  }, [settings, hasUnsavedChanges]);

  const updateLocalSettings = (updater: (s: GlobalSettings) => GlobalSettings) => {
    setLocalSettings(updater);
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    await onSaveSettings(localSettings);
    setHasUnsavedChanges(false);
  };

  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'categories' | 'projects'>('home');
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

  const processFile = async (file: File, isGallery = false): Promise<string> => {
    const dataUrl = await readFileAsDataURL(file);
    // Main images and hero images compressed to 1600px, gallery to 1200px
    return compressImage(dataUrl, isGallery ? 1200 : 1600, 0.7);
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const compressed = await processFile(file);
      setProjectForm(prev => ({ ...prev, mainImage: compressed }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('파일을 읽는 데 실패했습니다.');
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
      // Process sequentially to ensure order and avoid memory spikes
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const url = await processFile(files[i], true);
        newUrls.push(url);
      }
      setProjectForm(prev => ({ ...prev, photos: [...prev.photos, ...newUrls] }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('파일을 읽는 데 실패했습니다.');
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
    try {
      const compressedUrls = await Promise.all(files.map(file => processFile(file)));
      setLocalSettings(prev => ({ ...prev, heroImages: [...prev.heroImages, ...compressedUrls] }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('파일을 읽는 데 실패했습니다.');
    } finally {
      setIsUploading(false);
      if (heroImagesInputRef.current) heroImagesInputRef.current.value = '';
    }
  };

  const handleAboutImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await processFile(file);
      setLocalSettings(prev => ({ ...prev, aboutImage: compressed }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('파일을 읽는 데 실패했습니다.');
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

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const categories: ('place' | 'food' | 'nature')[] = ['place', 'food', 'nature'];

  const moveProject = async (e: React.MouseEvent, category: string, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (!auth?.currentUser) {
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
    if (!auth) return;
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
    if (!auth?.currentUser) {
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

  const handleEditProject = (project: Project) => {
    setEditingId(project.id);
    setProjectForm({
      category: project.category,
      clientName: project.clientName,
      description: project.description || '',
      mainImage: project.mainImage,
      photos: project.photos || []
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
            <span className="text-[10px] font-mono text-gray-300 font-normal opacity-50">v2.0.0 - STABLE CORE</span>
          </h1>
            <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shadow-sm ${auth?.currentUser ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="font-ui text-[10px] tracking-widest text-text-sub uppercase font-bold">
                {auth?.currentUser ? `연결됨: ${auth.currentUser.email}` : '관리자 인증이 필요합니다'}
              </span>
              {!auth?.currentUser && (
                <button 
                  onClick={handleLogin}
                  className="font-ui text-[11px] tracking-widest bg-black text-white px-4 py-1.5 rounded-sm hover:bg-zinc-800 transition-all ml-2 uppercase font-black shadow-lg hover:scale-105 active:scale-95"
                >
                  구글 로그인하여 인증하기
                </button>
              )}
            </div>
            {!auth?.currentUser && window.location.hostname.includes('asia-northeast1.run.app') && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-blue-400 font-kr bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                  <ExternalLink size={8} /> 
                  로그인 안 될 때 등록할 주소: <span className="font-bold select-all">{window.location.hostname}</span>
                </span>
                <p className="text-[9px] text-gray-400 font-kr italic"> (로그인이 잘 된다면 무시하셔도 됩니다)</p>
              </div>
            )}
            {auth?.currentUser && (
              <p className="text-[9px] text-gray-400 font-kr mt-1">
                ※ 수정사항이 안 보이면 <span className="font-bold text-gray-600">Ctrl+Shift+R</span>을 눌러 새로고침 해주세요.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:gap-8 border-b border-gray-100 pb-4 w-full">
          {[
            { id: 'home', label: '홈 설정' },
            { id: 'about', label: '어바웃 설정' },
            { id: 'categories', label: '카테고리 문구 관리' },
            { id: 'projects', label: '프로젝트 업로드/관리' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)} 
              className={`font-kr text-[13px] tracking-tight transition-all py-3 px-4 rounded-md flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-black text-white font-bold shadow-md' 
                  : 'text-gray-400 hover:text-black hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
            </button>
          ))}
          <div className="flex-1" />
          <button 
            onClick={onLogout}
            className="font-kr text-[12px] text-red-400 hover:text-white hover:bg-red-500 transition-all px-4 py-2 rounded-md uppercase font-bold border border-red-100"
          >
            로그아웃
          </button>
        </div>
      </div>

      {authError && (
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-blue-600 p-8 rounded-xl shadow-2xl text-white border-4 border-blue-400">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <ExternalLink size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-[18px] font-kr font-black mb-2">도메인 승인 오류 해결 방법 (필독)</h3>
                <p className="text-[13px] font-kr opacity-90 leading-relaxed mb-6">
                  현재 보시는 화면은 파이어베이스(Firebase)에서 <span className="underline decoration-2 underline-offset-4">승인되지 않은 도메인</span>이라 로그인이 막혀있습니다.<br/>
                  <span className="font-bold">특히 AI Studio에서 '새 창에서 열기'를 할 경우 주소가 바뀌므로 매번 새 주소를 등록해줘야 합니다.</span>
                </p>

                <div className="bg-white/10 p-6 rounded-lg border border-white/20 mb-6">
                  <span className="block text-[10px] uppercase tracking-widest text-blue-200 mb-2 font-bold">현재 등록해야 할 주소</span>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <code className="flex-1 bg-black/30 px-4 py-3 rounded text-[16px] font-mono font-bold select-all break-all border border-white/10">
                      {window.location.hostname}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.hostname);
                        alert('도메인이 복사되었습니다.');
                      }}
                      className="whitespace-nowrap bg-white text-blue-700 px-6 py-3 rounded-md font-kr font-black text-[14px] hover:bg-blue-50 transition-all shadow-xl active:scale-95"
                    >
                      이 주소 복사하기
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3 items-center text-[13px] font-kr">
                    <div className="w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
                    <span>Firebase 콘솔 접속 후 <span className="font-bold">{"프로젝트 설정 > 서비스 설정 > 인증(Authentication) > 설정"}</span> 메뉴 이동</span>
                  </div>
                  <div className="flex gap-3 items-center text-[13px] font-kr">
                    <div className="w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
                    <span><span className="font-bold">승인된 도메인</span> 섹션에서 '도메인 추가' 클릭 후 위에서 복사한 주소를 붙여넣기</span>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 opacity-50 italic text-[11px] font-mono">
                  Error Details: {authError}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'home' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 메인 제목 (Wavelet Studio 부분)</label>
            <input value={localSettings.aboutHeadline || ''} onChange={e => updateLocalSettings(s => ({ ...s, aboutHeadline: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm transition-colors bg-transparent text-text-main" placeholder="Wavelet Studio." />
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 메인 헤드라인 (상단 이미지 위)</label>
            <input value={localSettings.homeHeadline} onChange={e => updateLocalSettings(s => ({ ...s, homeHeadline: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm transition-colors bg-transparent text-text-main" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 메인 배경 문구 (하단)</label>
            <input value={localSettings.homeHeadlineSub || ''} onChange={e => updateLocalSettings(s => ({ ...s, homeHeadlineSub: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm transition-colors bg-transparent text-text-main" placeholder="Photography Studio in Jeju" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 소개 문구</label>
            <textarea rows={3} value={localSettings.homeIntro} onChange={e => updateLocalSettings(s => ({ ...s, homeIntro: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm resize-none transition-colors bg-transparent text-text-main" />
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 슬라이더 이미지 ({localSettings.heroImages?.length || 0}개)</label>
              <button 
                disabled={isUploading}
                onClick={() => heroImagesInputRef.current?.click()}
                className="font-ui text-[10px] tracking-widest text-accent flex items-center gap-2 hover:opacity-70 transition-opacity disabled:opacity-30"
              >
                {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} 
                이미지 추가
              </button>
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
                  <button 
                    onClick={() => setLocalSettings(prev => ({ ...prev, heroImages: prev.heroImages?.filter((_, idx) => idx !== i) || [] }))}
                    className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
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
                    {projects.filter(p => p.category === cat).map(p => (
                      <option key={p.id} value={p.id}>{p.clientName}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              onClick={handleSaveSettings}
              className={`px-12 py-4 font-ui text-[11px] tracking-[0.2em] transition-all flex items-center gap-3 font-medium ${hasUnsavedChanges ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl scale-[1.02]' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              <Save size={16} /> {hasUnsavedChanges ? '변경사항 저장하기*' : '설정 저장하기'}
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
            <input value={localSettings.aboutSub} onChange={e => updateLocalSettings(s => ({ ...s, aboutSub: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm transition-colors bg-transparent text-text-main" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">어바웃 본문 내용</label>
            <textarea rows={10} value={localSettings.aboutBody} onChange={e => updateLocalSettings(s => ({ ...s, aboutBody: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm resize-none transition-colors bg-transparent text-text-main" />
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
                onClick={() => updateLocalSettings(s => ({ ...s, aboutImage: undefined }))}
                className="text-red-400 text-[10px] tracking-widest hover:text-red-600 self-start"
              >
                사진 삭제
              </button>
            )}
          </div>
          
          <div className="flex gap-4 pt-6">
            <button 
              onClick={handleSaveSettings}
              className={`px-12 py-4 font-ui text-[11px] tracking-[0.2em] transition-all flex items-center gap-3 font-medium ${hasUnsavedChanges ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl scale-[1.02]' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              <Save size={16} /> {hasUnsavedChanges ? '변경사항 저장하기*' : '설정 저장하기'}
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'categories' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-16">
          {(['place', 'food', 'nature'] as const).map(cat => (
            <div key={cat} className="flex flex-col gap-8 pb-10 border-b border-border last:border-0">
              <h3 className="font-ui text-sm tracking-[0.2em] text-black uppercase font-bold">
                {cat.toUpperCase()} 카테고리 설정
              </h3>
              <div className="flex flex-col gap-3">
                <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase font-black">대제목 (페이지 상단 크게 표시될 제목)</label>
                <input 
                  value={(localSettings as any)[`${cat}Title`] || ''} 
                  onChange={e => updateLocalSettings(s => ({ ...s, [`${cat}Title`]: e.target.value }))} 
                  className="border-b-2 border-black/10 py-3 focus:border-black outline-none font-ui text-[18px] tracking-widest transition-colors bg-transparent text-text-main uppercase"
                  placeholder={(CATEGORY_META as any)[cat].title}
                />
              </div>
              <div className="flex flex-col gap-3">
                <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">카테고리 설명 (Description - 페이지 소개 문구)</label>
                <textarea 
                  rows={4} 
                  value={(localSettings as any)[`${cat}Description`] || ''} 
                  onChange={e => updateLocalSettings(s => ({ ...s, [`${cat}Description`]: e.target.value }))} 
                  className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm resize-none transition-colors bg-transparent text-text-main leading-relaxed"
                  placeholder={(CATEGORY_META as any)[cat].description}
                />
              </div>
            </div>
          ))}
          
          <div className="flex gap-4 pt-6">
            <button 
              onClick={handleSaveSettings}
              className={`px-12 py-4 font-ui text-[11px] tracking-[0.2em] transition-all flex items-center gap-3 font-medium ${hasUnsavedChanges ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl scale-[1.02]' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              <Save size={16} /> {hasUnsavedChanges ? '변경사항 저장하기*' : '설정 저장하기'}
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
                .filter(p => p.category === cat)
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
                          <h4 className="font-ui text-[13px] tracking-tight text-text-main font-medium truncate">{project.clientName}</h4>
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
          </div>
        </motion.div>
      )}
    </div>
  );
};
