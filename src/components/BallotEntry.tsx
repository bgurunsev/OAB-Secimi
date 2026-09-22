import React, { useState, useEffect, useRef } from 'react';
import { Candidate } from '../types';
import { 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  FileText,
  AlertTriangle,
  RotateCcw,
  UserPlus,
  Zap,
  Layers,
  Check,
  X
} from 'lucide-react';

interface BallotEntryProps {
  candidates: Candidate[];
  onAddBallot: (selectedIds: string[]) => void;
  lastBallotsCount: number;
  onAddCandidate?: (candidate: Candidate) => void;
  onDirectVote?: (candidateId: string, delta: number) => void;
  onAddBlankVote?: () => void;
  onAddInvalidVote?: () => void;
  onLoadSampleCandidates?: () => void;
  invalidVotes?: number;
  blankVotes?: number;
}

export default function BallotEntry({
  candidates,
  onAddBallot,
  lastBallotsCount,
  onAddCandidate,
  onDirectVote,
  onAddBlankVote,
  onAddInvalidVote,
  onLoadSampleCandidates,
  invalidVotes = 0,
  blankVotes = 0
}: BallotEntryProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<'ballot' | 'tally'>('ballot');
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateType, setNewCandidateType] = useState<'board' | 'audit'>('board');
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Divide remaining pool to pick from directly
  const boardCandidates = candidates.filter(c => c.type === 'board');
  const auditCandidates = candidates.filter(c => c.type === 'audit');

  // Dismiss warning after 3 seconds
  useEffect(() => {
    if (!warningMessage) return;
    const timer = setTimeout(() => setWarningMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [warningMessage]);

  // Keyboard shortcut routing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If pressing Enter when search input has NO text and we have selected candidates: submit!
      if (e.key === 'Enter') {
        // If cursor is not in search input OR search input is completely empty:
        if (document.activeElement !== searchInputRef.current || searchTerm.trim() === '') {
          if (selectedIds.length > 0) {
            e.preventDefault();
            handleSubmitBallot();
          }
        }
      }
      if (e.key === 'Escape') {
        handleClearCurrent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, searchTerm]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleCandidate = (id: string) => {
    if (entryMode === 'tally') {
      // In direct tally mode, clicking adds +1 vote immediately
      if (onDirectVote) {
        onDirectVote(id, 1);
      }
      return;
    }

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
      setWarningMessage(null);
    } else {
      if (selectedIds.length >= 5) {
        setWarningMessage('Okul Aile Birliği pusulasında en fazla 5 aday seçilebilir! Önce bir adayı çıkarın.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
      setWarningMessage(null);
    }
    // Re-focus on search input after selecting from list
    searchInputRef.current?.focus();
  };

  const selectedCandidates = selectedIds
    .map(id => candidates.find(c => c.id === id))
    .filter(Boolean) as Candidate[];

  // Filter candidates for search with number & name support
  const filteredCandidates = searchTerm.trim() === ''
    ? []
    : candidates.filter(c => {
        if (selectedIds.includes(c.id)) return false;
        const term = searchTerm.trim().toLowerCase();
        
        // Match by candidate name
        if (c.name.toLowerCase().includes(term)) return true;

        // Match by Board index number (e.g. 1, 2, 15)
        if (c.type === 'board') {
          const boardIndex = boardCandidates.findIndex(bc => bc.id === c.id) + 1;
          if (String(boardIndex) === term || `y${boardIndex}` === term) return true;
        }

        // Match by Audit index number (e.g. d1, d2 or 1, 2)
        if (c.type === 'audit') {
          const auditIndex = auditCandidates.findIndex(ac => ac.id === c.id) + 1;
          if (`d${auditIndex}` === term || `denetim ${auditIndex}` === term || String(auditIndex) === term) return true;
        }

        return false;
      });

  const handleSelectFromSearch = (candidateId: string) => {
    if (selectedIds.length >= 5) {
      setWarningMessage('Pusulaya en fazla 5 aday eklenebilir!');
      return;
    }
    setSelectedIds([...selectedIds, candidateId]);
    setSearchTerm('');
    setShowDropdown(false);
    setWarningMessage(null);
    searchInputRef.current?.focus();
  };

  const handleSubmitBallot = () => {
    if (selectedIds.length === 0) {
      setWarningMessage('Lütfen önce pusuladaki adayları işaretleyin veya Boş/Geçersiz butonuna basın.');
      return;
    }
    onAddBallot(selectedIds);
    setSelectedIds([]);
    setSearchTerm('');
    setWarningMessage(null);
    searchInputRef.current?.focus();
  };

  const handleClearCurrent = () => {
    setSelectedIds([]);
    setSearchTerm('');
    setShowDropdown(false);
    setWarningMessage(null);
  };

  // Quick add custom candidate on the fly
  const handleCreateNewCandidate = (nameToAdd?: string) => {
    const name = (nameToAdd || newCandidateName).trim();
    if (!name) return;

    const newCandidate: Candidate = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      type: newCandidateType,
      votes: 0
    };

    if (onAddCandidate) {
      onAddCandidate(newCandidate);
      if (selectedIds.length < 5) {
        setSelectedIds(prev => [...prev, newCandidate.id]);
      }
    }

    setNewCandidateName('');
    setSearchTerm('');
    setShowDropdown(false);
    setShowAddCandidateModal(false);
    searchInputRef.current?.focus();
  };

  return (
    <div className="space-y-6">

      {/* TOP TOGGLE: Counting Mode Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono ml-2">
            Sayım Yöntemi:
          </span>
          <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setEntryMode('ballot')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                entryMode === 'ballot'
                  ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pusula Usulü Sayım (Zarf Zarf)</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('tally')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                entryMode === 'tally'
                  ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Hızlı Çetele Modu (Doğrudan +1 Oy)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onLoadSampleCandidates && candidates.length === 0 && (
            <button
              type="button"
              onClick={onLoadSampleCandidates}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Örnek Aday Listesini Yükle</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddCandidateModal(true)}
            className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Yeni Aday Ekle</span>
          </button>
        </div>
      </div>

      {/* WARNING BANNER IF REACHED 5 OR ERROR */}
      {warningMessage && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{warningMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            className="text-amber-700 hover:text-amber-900 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ZERO CANDIDATES CALLOUT */}
      {candidates.length === 0 && (
        <div className="bg-indigo-50/70 border-2 border-dashed border-indigo-300 rounded-2xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
          <h4 className="text-base font-bold text-slate-900 mb-1">
            Sistemde Kayıtlı Aday Bulunmuyor
          </h4>
          <p className="text-xs text-slate-600 max-w-md mx-auto mb-4">
            Seçim verilerini sıfırladınız. Sayıma başlamak için hazır 30 kişilik listeyi yükleyebilir veya doğrudan yeni aday ismi girebilirsiniz.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {onLoadSampleCandidates && (
              <button
                type="button"
                onClick={onLoadSampleCandidates}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                30 Kişilik Örnek Aday Listesini Yükle
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddCandidateModal(true)}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
            >
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Kendi Adayınızı Ekleyin
            </button>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Ballot Editor & Quick Search Input (5 Columns) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border-2 border-indigo-600 p-5 shadow-xs relative overflow-hidden">
            {/* Decorative badge indicating this is the active console */}
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-extrabold tracking-widest px-3 py-1 uppercase rounded-bl-xl font-mono">
              {entryMode === 'ballot' ? 'Pusula Masası' : 'Çetele Masası'}
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2 font-display">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>{entryMode === 'ballot' ? 'Yeni Pusula Girişi' : 'Doğrudan Çetele Girişi'}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {entryMode === 'ballot'
                ? 'Pusuladaki adayları yazarak veya havuzdan tıklayarak ekleyin.'
                : 'Sağdaki aday kutularına tıklayarak anında +1 oy ekleyin.'}
            </p>

            {/* Autocomplete Search Input */}
            <div className="relative mb-4" ref={dropdownRef}>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono flex items-center gap-1.5">
                  <span>Aday Bul / Ekle</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  İsim veya sıra no (örn: 1, 15, D2)
                </span>
              </div>
              
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (searchTerm.trim().length > 0) {
                        if (filteredCandidates.length > 0) {
                          // Select the first matched candidate
                          handleSelectFromSearch(filteredCandidates[0].id);
                        } else {
                          // No candidate matched, add as new candidate
                          handleCreateNewCandidate(searchTerm.trim());
                        }
                      } else if (selectedIds.length > 0) {
                        // Input is empty, submit ballot!
                        handleSubmitBallot();
                      }
                    } else if (e.key === 'Escape') {
                      setSearchTerm('');
                      setShowDropdown(false);
                    }
                  }}
                  placeholder="Aday ismini veya numarasını yazın..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-850 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown suggestions */}
              {showDropdown && searchTerm.trim() !== '' && (
                <div className="absolute z-30 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredCandidates.length > 0 ? (
                    filteredCandidates.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectFromSearch(c.id)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 flex justify-between items-center transition-colors cursor-pointer ${
                          idx === 0 ? 'bg-indigo-50/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{c.name}</span>
                          {idx === 0 && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">
                              Enter'a bas
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          c.type === 'board' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {c.type === 'board' ? 'Yönetim' : 'Denetim'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-50 text-center">
                      <p className="text-xs text-slate-600 mb-2">
                        "<strong>{searchTerm}</strong>" isimli aday bulunamadı.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCreateNewCandidate(searchTerm.trim())}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Bu İsimle Yeni Aday Ekle ve Seç (Enter)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CURRENT SELECTIONS */}
            <div className="space-y-3 mb-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                  Pusulaya Yazılan Adaylar ({selectedIds.length} / 5)
                </span>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCurrent}
                    className="text-xs text-red-600 hover:text-red-800 font-bold transition-colors cursor-pointer"
                  >
                    Temizle (Esc)
                  </button>
                )}
              </div>

              {selectedIds.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                  <FileText className="w-7 h-7 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Henüz Aday Seçilmedi</p>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                    Aday isimlerini arama kutusuna yazıp <strong>Enter</strong>'a basarak veya sağdaki aday havuzundan tıklayarak ekleyin.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedCandidates.map((c, idx) => (
                    <div 
                      key={c.id}
                      className={`flex justify-between items-center p-2.5 rounded-xl border font-semibold text-sm transition-all ${
                        c.type === 'board' 
                          ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950' 
                          : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold text-slate-600 bg-white rounded-md w-5 h-5 flex items-center justify-center border border-slate-200 shadow-2xs font-mono">
                          {idx + 1}
                        </span>
                        <span className="font-bold">{c.name}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          c.type === 'board' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {c.type === 'board' ? 'Yönetim' : 'Denetim'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCandidate(c.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-white rounded-lg p-1 transition-colors cursor-pointer"
                        title="Listeden Kaldır"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CAPACITY BADGE */}
            {selectedIds.length === 5 && (
              <div className="mb-4 flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>5 aday tamamlandı. Kaydetmek için Enter'a veya aşağıdaki butona basın.</span>
              </div>
            )}

            {/* MAIN ACTIONS */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={handleSubmitBallot}
                disabled={selectedIds.length === 0}
                className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                  selectedIds.length > 0
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ring-2 ring-indigo-500/20'
                    : 'bg-slate-200 text-slate-450 cursor-not-allowed shadow-none'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {selectedIds.length > 0
                    ? `OYLARI KAYDET (${selectedIds.length} Aday • Enter)`
                    : 'OYLARI KAYDET (Aday Seçiniz)'}
                </span>
              </button>

              {/* Quick Actions: Blank / Invalid Ballot Adders */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onAddBlankVote}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Boş oy olarak sisteme 1 adet pusula ekle"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>+1 Boş Pusula</span>
                  {blankVotes > 0 && (
                    <span className="ml-1 bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold">
                      {blankVotes}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onAddInvalidVote}
                  className="py-2.5 px-3 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Geçersiz oy olarak sisteme 1 adet pusula ekle"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span>+1 Geçersiz Pusula</span>
                  {invalidVotes > 0 && (
                    <span className="ml-1 bg-red-200 text-red-800 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold">
                      {invalidVotes}
                    </span>
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-400">
                Kısayollar: <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 font-mono text-[9px]">Enter</kbd> kaydeder, <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300 font-mono text-[9px]">Esc</kbd> siler.
              </p>
            </div>
          </div>

          {/* Counter Widget */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-md flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Toplam Sayılan Pusula</p>
              <h2 className="text-4xl font-black font-display tracking-tight mt-1 text-white">
                {lastBallotsCount} Adet
              </h2>
            </div>
            <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-right">
              <span className="text-xs text-indigo-400 font-bold font-mono">PUSULA #{lastBallotsCount + 1}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Sıradaki Zarf</p>
            </div>
          </div>
        </div>

        {/* RIGHT: Candidate Pools Grid (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 mb-4 gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Aday Seçim Havuzu</span>
                  <span className="text-xs text-slate-400 font-normal normal-case">
                    {entryMode === 'ballot'
                      ? 'Pusuladaki adayın üzerine tıklayarak seçin'
                      : 'Adayın üzerine tıklayarak anında +1 oy ekleyin'}
                  </span>
                </h3>
              </div>
              <div className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Toplam {candidates.length} Aday
              </div>
            </div>

            {/* Board Candidates Pool */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                  YÖNETİM KURULU ADAYLARI ({boardCandidates.length})
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">Asil 5 + Yedek 5</span>
              </div>
              
              {boardCandidates.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">Yönetim kurulu adayı bulunmuyor.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {boardCandidates.map((c, index) => {
                    const isSelected = selectedIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleCandidate(c.id)}
                        className={`p-2.5 text-left rounded-xl text-xs font-semibold border transition-all duration-150 flex flex-col justify-between min-h-[76px] relative select-none outline-hidden cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white ring-2 ring-indigo-500/30 shadow-sm scale-98'
                            : 'bg-slate-50/80 border-slate-200/90 text-slate-800 hover:bg-indigo-50/60 hover:border-indigo-300 hover:text-indigo-900 shadow-2xs'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200/80 text-slate-600'
                          }`}>
                            #{index + 1}
                          </span>
                          
                          {/* Vote badge or Selection check */}
                          {entryMode === 'tally' ? (
                            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                              {c.votes} Oy
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-mono font-semibold ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                {c.votes} oy
                              </span>
                              {isSelected && (
                                <span className="w-2 h-2 bg-white rounded-full"></span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="block font-bold mt-1.5 text-xs line-clamp-2 leading-snug">
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Audit Candidates Pool */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></span>
                  DENETİM KURULU ADAYLARI ({auditCandidates.length})
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">Asil 1 + Yedek 1</span>
              </div>
              
              {auditCandidates.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">Denetim kurulu adayı bulunmuyor.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {auditCandidates.map((c, index) => {
                    const isSelected = selectedIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleCandidate(c.id)}
                        className={`p-2.5 text-left rounded-xl text-xs font-semibold border transition-all duration-150 flex flex-col justify-between min-h-[76px] relative select-none outline-hidden cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white ring-2 ring-emerald-500/30 shadow-sm scale-98'
                            : 'bg-slate-50/80 border-slate-200/90 text-slate-800 hover:bg-emerald-50/60 hover:border-emerald-300 hover:text-emerald-900 shadow-2xs'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200/80 text-slate-600'
                          }`}>
                            #D{index + 1}
                          </span>
                          
                          {/* Vote badge or Selection check */}
                          {entryMode === 'tally' ? (
                            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                              {c.votes} Oy
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-mono font-semibold ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                                {c.votes} oy
                              </span>
                              {isSelected && (
                                <span className="w-2 h-2 bg-white rounded-full"></span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="block font-bold mt-1.5 text-xs line-clamp-2 leading-snug">
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* QUICK ADD CANDIDATE MODAL */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setShowAddCandidateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-1 font-display flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <span>Yeni Aday Tanımla</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Seçim pusulasında adı çıkan yeni bir veli veya adayı listeye ekleyin.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Aday Adı Soyadı:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNewCandidate();
                  }}
                  placeholder="Örn: Ayşe Yılmaz"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Adaylık Kurulu:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCandidateType('board')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newCandidateType === 'board'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-900 ring-1 ring-indigo-500'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Yönetim Kurulu
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCandidateType('audit')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newCandidateType === 'audit'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Denetim Kurulu
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCandidateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateNewCandidate()}
                  disabled={!newCandidateName.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Adayı Ekle ve Pusulaya Yaz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
export type { BallotEntryProps };
