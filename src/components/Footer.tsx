import React from 'react';
import { GlobalSettings } from '../types';

export const Footer = ({ onAdmin, settings }: { onAdmin?: () => void, settings?: GlobalSettings }) => (
  <footer className="bg-[#D4E4D9] px-6 md:px-10 py-[60px] text-[#1A1A1A] mt-auto relative">
    <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
      {/* Left: Symbol */}
      <div className="flex-shrink-0">
        {settings?.footerLogo ? (
          <img src={settings.footerLogo} alt="Footer Logo" className="h-10 w-auto object-contain" />
        ) : (
          <div className="w-8 h-8 rounded-full border border-[#1A1A1A]/30 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full" />
          </div>
        )}
      </div>

      {/* Center: Info */}
      <div className="flex-grow max-w-[500px]">
        <p className="font-kr font-light text-[13px] leading-[1.8] opacity-80 whitespace-pre-wrap">
          {settings?.footerIntro || (
            <>
              Wavelet Studio는 제주에 기반을 둔 포토그래피 스튜디오입니다.<br className="hidden md:block" />
              공간, 음식, 자연을 기록합니다.
            </>
          )}
        </p>
        <p className="font-ui text-[11px] mt-4 opacity-50 tracking-wider">
          {settings?.footerCopyright || "COPYRIGHT ©WAVELET STUDIO. ALL RIGHTS RESERVED."}
        </p>
      </div>

      {/* Right: Links */}
      <div className="flex flex-col gap-3 items-start md:items-end font-ui text-[13px] tracking-wide">
        {settings?.footerEmail && (
          <a href={`mailto:${settings.footerEmail}`} className="hover:text-accent transition-colors underline underline-offset-4 decoration-[#1A1A1A]/20">mail</a>
        )}
        {settings?.footerInstagram && (
          <a href={settings.footerInstagram} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors underline underline-offset-4 decoration-[#1A1A1A]/20">instagram</a>
        )}
        {settings?.footerKakao && (
          <a href={settings.footerKakao} target="_blank" rel="noreferrer" className="hover:text-accent transition-colors underline underline-offset-4 decoration-[#1A1A1A]/20">kakao talk</a>
        )}
        
        {/* Fallback links if no settings yet */}
        {!settings?.footerEmail && !settings?.footerInstagram && !settings?.footerKakao && (
          <>
            <a href="mailto:wavelet@example.com" className="hover:text-accent transition-colors underline underline-offset-4 decoration-[#1A1A1A]/20">mail</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-accent transition-colors underline underline-offset-4 decoration-[#1A1A1A]/20">instagram</a>
            <a href="https://open.kakao.com" target="_blank" rel="noreferrer" className="hover:text-accent transition-colors underline underline-offset-4 decoration-[#1A1A1A]/20">kakao talk</a>
          </>
        )}
      </div>
    </div>

    <button 
      onClick={onAdmin}
      className="absolute bottom-4 right-6 text-[9px] opacity-10 hover:opacity-50 transition-opacity"
    >
      ADMIN
    </button>
  </footer>
);
