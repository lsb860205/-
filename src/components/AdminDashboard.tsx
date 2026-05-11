import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Save, RefreshCw, X, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { Project, GlobalSettings } from '../types';
import { compressImage } from '../lib/imageUtils';

interface AdminDashboardProps {
  settings: GlobalSettings;
  projects: Project[];
  onSaveSettings: (s: GlobalSettings) => Promise<void>;
  onAddProject: (item: Partial<Project>) => Promise<boolean>;
  onDeleteProject: (id: string) => Promise<void>;
  onSeedData: () => void;
  onLogout: () => void;
}

export const AdminDashboard = ({ 
  settings, 
  projects, 
  onSaveSettings, 
  onAddProject, 
  onDeleteProject,
  onSeedData,
  onLogout
}: AdminDashboardProps) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'projects'>('home');
  const [isUploading, setIsUploading] = useState(false);
  
  const [newProject, setNewProject] = useState({ 
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
      setNewProject(prev => ({ ...prev, mainImage: compressed }));
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
    try {
      const compressedUrls = await Promise.all(files.map(file => processFile(file, true)));
      setNewProject(prev => ({ ...prev, photos: [...prev.photos, ...compressedUrls] }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('파일을 읽는 데 실패했습니다.');
    } finally {
      setIsUploading(false);
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
    setNewProject(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  return (
    <div className="pt-[110px] md:pt-[140px] px-5 sm:px-6 md:px-10 pb-32 max-w-[1200px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8 mb-12 md:mb-16">
        <h1 className="font-ui text-xl md:text-3xl tracking-tighter font-light">관리자 대시보드</h1>
        <div className="flex flex-wrap gap-3 md:gap-8">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`font-ui text-[11px] tracking-[0.2em] transition-all ${activeTab === 'home' ? 'text-black border-b border-black pb-1' : 'text-gray-300'}`}
          >
            홈 설정
          </button>
          <button 
            onClick={() => setActiveTab('about')} 
            className={`font-ui text-[11px] tracking-[0.2em] transition-all ${activeTab === 'about' ? 'text-black border-b border-black pb-1' : 'text-gray-300'}`}
          >
            어바웃 설정
          </button>
          <button 
            onClick={() => setActiveTab('projects')} 
            className={`font-ui text-[11px] tracking-[0.2em] transition-all ${activeTab === 'projects' ? 'text-black border-b border-black pb-1' : 'text-gray-300'}`}
          >
            프로젝트 관리
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
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 메인 헤드라인</label>
            <input value={localSettings.homeHeadline} onChange={e => setLocalSettings(s => ({ ...s, homeHeadline: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm transition-colors bg-transparent text-text-main" />
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-ui text-[10px] tracking-widest text-gray-400 uppercase">홈 소개 문구</label>
            <textarea rows={3} value={localSettings.homeIntro} onChange={e => setLocalSettings(s => ({ ...s, homeIntro: e.target.value }))} className="border-b border-border py-3 focus:border-black outline-none font-kr text-sm resize-none transition-colors bg-transparent text-text-main" />
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

      {activeTab === 'projects' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-16">
          {/* New Project Form */}
          <div className="bg-bg-warm p-10 rounded-sm">
            <h3 className="font-ui text-2xl mb-10 flex items-center gap-3 font-light tracking-tighter"><Plus size={24}/> 새 프로젝트 추가</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="font-ui text-[10px] tracking-widest uppercase text-gray-400">카테고리 선택</label>
                  <select 
                    value={newProject.category} 
                    onChange={e => setNewProject(n => ({ ...n, category: e.target.value as any }))}
                    className="bg-bg-white border border-border p-3 outline-none font-ui text-xs text-text-main"
                  >
                    <option value="place">PLACE (공간)</option>
                    <option value="food">FOOD (음식)</option>
                    <option value="nature">NATURE (자연)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-ui text-[10px] tracking-widest uppercase text-gray-400">클라이언트 / 프로젝트 명</label>
                  <input value={newProject.clientName} onChange={e => setNewProject(n => ({ ...n, clientName: e.target.value }))} className="bg-bg-white border border-border p-3 outline-none font-kr text-sm focus:border-black transition-colors text-text-main" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-ui text-[10px] tracking-widest uppercase text-gray-400">설명 (선택사항)</label>
                  <textarea value={newProject.description} onChange={e => setNewProject(n => ({ ...n, description: e.target.value }))} className="bg-bg-white border border-border p-3 outline-none font-kr text-sm resize-none h-24 focus:border-black transition-colors text-text-main" />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="font-ui text-[10px] tracking-widest uppercase text-gray-400">대표 메인 이미지</label>
                  <div 
                    onClick={() => mainImageInputRef.current?.click()}
                    className="relative aspect-video bg-bg-white border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer group hover:border-black transition-colors overflow-hidden"
                  >
                    {newProject.mainImage ? (
                      <img src={newProject.mainImage} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
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
                  <label className="font-ui text-[10px] tracking-widest uppercase text-gray-400">갤러리 사진 ({newProject.photos.length}개)</label>
                  <button 
                    disabled={isUploading}
                    onClick={() => galleryPhotosInputRef.current?.click()}
                    className="font-ui text-[10px] tracking-widest text-accent flex items-center gap-2 hover:opacity-70 transition-opacity disabled:opacity-30"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} 
                    사진 여러장 추가
                  </button>
                  <input 
                    ref={galleryPhotosInputRef}
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    className="hidden" 
                  />
                </div>
                
                <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-2">
                  {newProject.photos.map((url, i) => (
                    <div key={i} className="relative aspect-square group bg-bg-white border border-border">
                      <img src={url} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removePhoto(i)}
                        className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {newProject.photos.length === 0 && (
                    <div className="col-span-4 aspect-video border border-dashed border-border flex items-center justify-center text-gray-200">
                      <ImageIcon size={40} strokeWidth={1} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <button 
              disabled={!newProject.clientName || !newProject.mainImage || newProject.photos.length === 0 || isUploading}
              onClick={() => onAddProject(newProject).then((success) => {
                if (success) {
                  setNewProject({ category: 'place', clientName: '', description: '', mainImage: '', photos: [] });
                }
              })}
              className="mt-12 bg-black text-white px-12 py-4 font-ui text-[11px] tracking-[0.2em] hover:bg-gray-800 disabled:bg-border transition-colors font-medium flex items-center gap-3"
            >
              {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              프로젝트 생성하기
            </button>
          </div>

          {/* Project List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {projects.map(project => (
              <div key={project.id} className="border border-border p-6 space-y-4 group hover:border-gray-400 transition-colors bg-bg-white shadow-sm">
                <div className="aspect-[4/5] bg-bg-warm overflow-hidden relative">
                  <img src={project.mainImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => onDeleteProject(project.id)}
                      className="bg-bg-white/90 p-2 text-gray-400 hover:text-red-500 transition-colors shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="font-ui text-[9px] tracking-[0.2em] text-accent/60 uppercase">{project.category}</span>
                  <h4 className="font-ui text-[14px] tracking-[0.1em] text-text-main mt-1 font-semibold">{project.clientName}</h4>
                  <p className="font-ui text-[10px] text-text-sub mt-1 flex items-center gap-1">
                    <ImageIcon size={12} strokeWidth={1.5} /> {project.photoCount ?? project.photos?.length ?? 0} 사진
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
