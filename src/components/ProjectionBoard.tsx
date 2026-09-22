import React, { useState, useMemo } from 'react';
import { Candidate } from '../types';
import { Award, Sun, Moon, ArrowUpDown, ChevronUp, ChevronDown, Percent, Info, Trophy, FileSpreadsheet, Wifi } from 'lucide-react';

interface ProjectionBoardProps {
  candidates: Candidate[];
  totalBallots: number;
  voterCount: number;
  invalidVotes: number;
  blankVotes: number;
  onExportExcel?: () => void;
  syncStatus?: 'connected' | 'syncing' | 'offline';
}

export default function ProjectionBoard({ 
  candidates, 
  totalBallots,
  voterCount,
  invalidVotes,
  blankVotes,
  onExportExcel,
  syncStatus = 'connected'
}: ProjectionBoardProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sortBy, setSortBy] = useState<'id' | 'votes'>('id');

  // Partition candidates
  const boardCandidates = useMemo(() => {
    const list = candidates.filter(c => c.type === 'board');
    if (sortBy === 'votes') {
      return [...list].sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
    }
    // Sort by id: board-1, board-2... needs numeric sort
    return [...list].sort((a, b) => {
      const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
      return aNum - bNum;
    });
  }, [candidates, sortBy]);

  const auditCandidates = useMemo(() => {
    const list = candidates.filter(c => c.type === 'audit');
    if (sortBy === 'votes') {
      return [...list].sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
    }
    return [...list].sort((a, b) => {
      const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
      return aNum - bNum;
    });
  }, [candidates, sortBy]);

  // Determine winners (Top 5 for Board, Top 2 for Audit)
  const topBoardThreshold = useMemo(() => {
    const sorted = candidates.filter(c => c.type === 'board').map(c => c.votes).sort((a, b) => b - a);
    return sorted.length >= 5 ? sorted[4] : 0;
  }, [candidates]);

  const topAuditThreshold = useMemo(() => {
    const sorted = candidates.filter(c => c.type === 'audit').map(c => c.votes).sort((a, b) => b - a);
    return sorted.length >= 2 ? sorted[1] : 0;
  }, [candidates]);

  const isLeadingBoard = (c: Candidate) => {
    if (c.votes === 0) return false;
    return c.votes >= topBoardThreshold;
  };

  const isLeadingAudit = (c: Candidate) => {
    if (c.votes === 0) return false;
    return c.votes >= topAuditThreshold;
  };

  const totalBoardVotes = useMemo(() => {
    return candidates.filter(c => c.type === 'board').reduce((acc, curr) => acc + curr.votes, 0);
  }, [candidates]);

  const totalAuditVotes = useMemo(() => {
    return candidates.filter(c => c.type === 'audit').reduce((acc, curr) => acc + curr.votes, 0);
  }, [candidates]);

  return (
    <div className={`p-6 rounded-[24px] transition-colors duration-200 ${
      theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900 border border-slate-200 shadow-sm'
    }`}>
      {/* HEADER CODES & CONTROLS FOR PROJECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5 mb-6 border-slate-200">
        <div>
          <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
            CANLI SEÇİM PROJEKSİYON EKRANI
          </span>
          <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight mt-1 flex items-center gap-3">
            <span>Oy Sayım Sonuçları</span>
            <span className={`text-xs px-2.5 py-1 rounded-full ${
              theme === 'dark' ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-100 text-indigo-800 font-bold'
            }`}>
              {totalBallots} Pusula Sayıldı
            </span>
          </h2>
        </div>

        {/* Projection controls - small and styling */}
        <div className="flex flex-wrap items-center gap-2 select-none shrink-0 print:hidden">
          {/* Live Sync Status Indicator */}
          <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 font-mono ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              syncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : syncStatus === 'syncing' ? 'bg-amber-500 animate-bounce' : 'bg-slate-400'
            }`}></span>
            <span className="text-[11px]">
              {syncStatus === 'connected' ? 'Canlı Bağlantı' : syncStatus === 'syncing' ? 'Eşitleniyor...' : 'Çevrimdışı'}
            </span>
          </div>

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
              title="Sonuçları Excel dosyası olarak indir (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel'e Aktar</span>
            </button>
          )}

          <button
            onClick={() => setSortBy(sortBy === 'id' ? 'votes' : 'id')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border cursor-pointer ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-100'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortBy === 'id' ? 'Oy Sayısına Göre Sırala' : 'Aday Sırasına Göre Sırala'}
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-100'
            }`}
            title={theme === 'dark' ? 'Gündüz Moduna Geç' : 'Gece Moduna Geç'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* DETAILED STATS BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {/* Card 1: Katılım Oranı */}
        <div className={`p-4 rounded-xl border transition-colors ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Katılım Oranı</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black font-display leading-none text-indigo-600">
              {voterCount && voterCount > 0 ? `%${Math.round((totalBallots / voterCount) * 100) > 100 ? 100 : Math.round((totalBallots / voterCount) * 100)}` : '%0'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Oran</span>
          </div>
        </div>

        {/* Card 2: Sayılan Pusula */}
        <div className={`p-4 rounded-xl border transition-colors ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Sayılan Pusula</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black font-display leading-none text-slate-800 dark:text-slate-100">{totalBallots}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Zarf</span>
          </div>
        </div>

        {/* Card 3: Toplam Veli */}
        <div className={`p-4 rounded-xl border transition-colors ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Toplam Seçmen</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black font-display leading-none text-slate-800 dark:text-slate-100">{voterCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Veli</span>
          </div>
        </div>

        {/* Card 4: Geçersiz */}
        <div className={`p-4 rounded-xl border transition-colors ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Geçersiz</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black font-display leading-none text-red-500">{invalidVotes}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Oy</span>
          </div>
        </div>

        {/* Card 5: Boş Oy */}
        <div className={`p-4 rounded-xl border transition-colors ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Boş Zarflar</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black font-display leading-none text-amber-500">{blankVotes}</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Zarf</span>
          </div>
        </div>

        {/* Card 6: Mevcut Lider */}
        <div className={`p-4 rounded-xl border transition-colors pr-2 truncate ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs py-2.5'
        }`}>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Mevcut Lider</p>
          <div className="mt-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {candidates.filter(c => c.type === 'board').reduce((max, c) => c.votes > max.votes ? c : max, { name: 'Yok', votes: -1 }).name}
            </p>
            <span className="text-[10px] text-indigo-500 font-bold uppercase font-mono">
              {candidates.filter(c => c.type === 'board').reduce((max, c) => c.votes > max.votes ? c : max, { name: 'Yok', votes: 0 }).votes} Oy
            </span>
          </div>
        </div>
      </div>

      {/* DUAL COLS: Management Board on Left, Audit Committee on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT: Management Board Candidates (8 Columns on desktop for beautiful dense card system) */}
        <div className="xl:col-span-8 space-y-4">
          <div className="flex justify-between items-center bg-indigo-600/10 text-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/40 p-3 rounded-xl">
            <span className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wide">
              <Award className="w-4 h-4 text-indigo-500" />
              YÖNETİM KURULU SEÇİMLERİ (EN FAZLA OY ALAN İLK 5 ASİL ÜYE)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {boardCandidates.map((c, index) => {
              const isLeading = isLeadingBoard(c);
              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                    isLeading 
                      ? theme === 'dark'
                        ? 'bg-slate-900 border-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                        : 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                      : theme === 'dark'
                        ? 'bg-slate-900 border-slate-850'
                        : 'bg-white border-slate-100 shadow-xs hover:border-slate-200'
                  }`}
                >
                  {/* Leading position ribbon */}
                  {isLeading && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                  )}

                  <div className="flex justify-between items-start gap-2">
                    <div className="truncate">
                      <span className={`text-[10px] font-mono rounded px-1.5 py-0.5 ${
                        theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        SIRA: {c.id.replace('board-', '')}
                      </span>
                      <h4 className="font-extrabold text-sm md:text-base tracking-tight truncate mt-1.5">
                        {c.name}
                      </h4>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100/10 pt-2">
                    {/* Position Highlight */}
                    {sortBy === 'votes' && isLeading ? (
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        İLKER 5
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        Yönetim
                      </span>
                    )}

                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl md:text-3xl font-black font-display tracking-tight ${
                        isLeading ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {c.votes}
                      </span>
                      <span className="text-xs text-slate-400 font-bold font-mono">OY</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Audit Committee Candidates (4 Columns on desktop for beautiful focused results) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="flex justify-between items-center bg-emerald-600/10 text-emerald-850 dark:text-emerald-300 dark:bg-emerald-950/40 p-3 rounded-xl">
            <span className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wide">
              <Award className="w-4 h-4 text-emerald-500" />
              DENETİM KURULU SEÇİMİ (ASİL)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            {auditCandidates.map((c, index) => {
              const isLeading = isLeadingAudit(c);
              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                    isLeading 
                      ? theme === 'dark'
                        ? 'bg-slate-900 border-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : 'bg-emerald-50/50 border-emerald-250 shadow-sm'
                      : theme === 'dark'
                        ? 'bg-slate-900 border-slate-850'
                        : 'bg-white border-slate-100 shadow-xs hover:border-slate-200'
                  }`}
                >
                  {/* Leading marker */}
                  {isLeading && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}

                  <div className="flex justify-between items-start gap-2">
                    <div className="truncate">
                      <span className={`text-[10px] font-mono rounded px-1.5 py-0.5 ${
                        theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        DENETMEN {c.id.replace('audit-', '')}
                      </span>
                      <h4 className="font-extrabold text-sm md:text-base tracking-tight truncate mt-1.5">
                        {c.name}
                      </h4>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100/10 pt-2">
                    {sortBy === 'votes' && isLeading ? (
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        ASİL ADAY
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        Denetim
                      </span>
                    )}

                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl md:text-3xl font-black font-display tracking-tight ${
                        isLeading ? 'text-emerald-650 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {c.votes}
                      </span>
                      <span className="text-xs text-slate-400 font-bold font-mono">OY</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Helpful legend printed out below */}
      <div className={`mt-8 p-4 rounded-lg flex items-start gap-3 text-xs leading-relaxed border ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
      }`}>
        <Info className={`w-4 h-4 mt-0.5 shrink-0 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
        <div>
          <span className="font-bold">Önemli Seçim Kuralı:</span> Bu kurul seçimlerinde her bir veli/veli temsilcisi pusulaya en fazla 5 isim yazar. Yönetim Kurulu seçiminde en yüksek oy alan ilk 5 asil üye seçilir. Denetim kurulunda ise en yüksek oy alan 1. asil üye seçilir. Sayılar anlık olarak oylama devam ettikçe projeksiyon ile salona canlı yansıtılmaktadır.
        </div>
      </div>
    </div>
  );
}
export type { ProjectionBoardProps };
