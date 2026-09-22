/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Vote, 
  Presentation, 
  Settings as SettingsIcon, 
  School, 
  Calendar, 
  Flame, 
  HelpCircle,
  FileSpreadsheet,
  Undo2,
  Lock,
  Edit2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react';
import { Candidate, Ballot, ElectionState } from './types';
import { getInitialState } from './initialState';
import BallotEntry from './components/BallotEntry';
import ProjectionBoard from './components/ProjectionBoard';
import BallotHistory from './components/BallotHistory';
import CandidateBatchEdit from './components/CandidateBatchEdit';
import { exportElectionToExcel } from './utils/excelExport';
import { 
  subscribeToElectionSync, 
  apiAddBallot, 
  apiDeleteBallot, 
  apiDirectVote, 
  apiAddBlankVote, 
  apiAddInvalidVote, 
  apiResetVotes, 
  apiResetAll, 
  sendServerState,
  SyncStatus 
} from './services/electionSync';

export default function App() {
  const [state, setState] = useState<ElectionState>(() => {
    const saved = localStorage.getItem('oab_election_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing localStorage state:', e);
      }
    }
    return getInitialState();
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [activeTab, setActiveTab] = useState<'entry' | 'projection' | 'settings'>('entry');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [schoolInput, setSchoolInput] = useState(state.schoolName);
  const [titleInput, setTitleInput] = useState(state.title);

  // Reset modal and toast notifications
  const [resetModalType, setResetModalType] = useState<'none' | 'votes' | 'all'>('none');
  const [fullResetMode, setFullResetMode] = useState<'default' | 'blank'>('default');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real-time server synchronization across devices (Computer 1 & Computer 2 / Projector)
  useEffect(() => {
    const unsubscribe = subscribeToElectionSync(
      (serverState) => {
        setState(serverState);
        localStorage.setItem('oab_election_state', JSON.stringify(serverState));
      },
      (status) => {
        setSyncStatus(status);
      }
    );

    return unsubscribe;
  }, []);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Save state to localStorage on modification as offline cache
  useEffect(() => {
    localStorage.setItem('oab_election_state', JSON.stringify(state));
  }, [state]);

  // Sync state if school name/title edited from control console
  const handleSaveHeader = async () => {
    const updated = {
      ...state,
      schoolName: schoolInput.trim() || 'Örnek Okul',
      title: titleInput.trim() || 'Okul Aile Birliği Seçimi'
    };
    setState(updated);
    setIsEditingHeader(false);
    await sendServerState(updated);
  };

  // Add a newly scanned ballot
  const handleAddBallot = async (selectedCandidateIds: string[]) => {
    const nextNumber = state.ballots.length + 1;
    // Optimistic local update
    setState(prev => {
      const newBallot: Ballot = {
        id: `ballot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        selectedCandidateIds,
        timestamp: Date.now(),
        ballotNumber: nextNumber
      };

      const updatedCandidates = prev.candidates.map(candidate => {
        if (selectedCandidateIds.includes(candidate.id)) {
          return { ...candidate, votes: candidate.votes + 1 };
        }
        return candidate;
      });

      return {
        ...prev,
        ballots: [...prev.ballots, newBallot],
        candidates: updatedCandidates
      };
    });
    setToastMessage(`Pusula #${nextNumber} kaydedildi (${selectedCandidateIds.length} aday işaretlendi).`);

    // Sync to server and broadcast to other screens
    const serverResult = await apiAddBallot(selectedCandidateIds);
    if (serverResult) {
      setState(serverResult);
    }
  };

  // Add a blank vote (Boş Pusula)
  const handleAddBlankVote = async () => {
    setState(prev => ({
      ...prev,
      blankVotes: (prev.blankVotes ?? 0) + 1
    }));
    setToastMessage('1 adet Boş Pusula sisteme işlendi.');
    const serverResult = await apiAddBlankVote();
    if (serverResult) setState(serverResult);
  };

  // Add an invalid vote (Geçersiz Pusula)
  const handleAddInvalidVote = async () => {
    setState(prev => ({
      ...prev,
      invalidVotes: (prev.invalidVotes ?? 0) + 1
    }));
    setToastMessage('1 adet Geçersiz Pusula sisteme işlendi.');
    const serverResult = await apiAddInvalidVote();
    if (serverResult) setState(serverResult);
  };

  // Direct vote tally increment/decrement (+1 or -1)
  const handleDirectVote = async (candidateId: string, delta: number) => {
    const target = state.candidates.find(c => c.id === candidateId);
    setState(prev => ({
      ...prev,
      candidates: prev.candidates.map(c =>
        c.id === candidateId ? { ...c, votes: Math.max(0, c.votes + delta) } : c
      )
    }));
    if (target && delta > 0) {
      setToastMessage(`"${target.name}" adayına +1 oy eklendi.`);
    }
    const serverResult = await apiDirectVote(candidateId, delta);
    if (serverResult) setState(serverResult);
  };

  // Add single candidate on the fly
  const handleAddCandidate = async (newCand: Candidate) => {
    const updated = {
      ...state,
      candidates: [...state.candidates, newCand]
    };
    setState(updated);
    setToastMessage(`"${newCand.name}" aday listesine eklendi.`);
    await sendServerState(updated);
  };

  // Load sample candidates if empty
  const handleLoadSampleCandidates = async () => {
    const sample = getInitialState().candidates;
    const updated = {
      ...state,
      candidates: sample
    };
    setState(updated);
    setToastMessage('30 kişilik örnek aday listesi yüklendi.');
    await sendServerState(updated);
  };

  // Remove a ballot (Undo specified ballot)
  const handleDeleteBallot = async (ballotId: string) => {
    const ballotToRemove = state.ballots.find(b => b.id === ballotId);
    if (!ballotToRemove) return;

    if (!confirm(`Sayılan Pusula #${ballotToRemove.ballotNumber} silinecek ve bu pusuladaki tüm oylar adayların hanesinden düşülecektir. Emin misiniz?`)) {
      return;
    }

    const serverResult = await apiDeleteBallot(ballotId);
    if (serverResult) {
      setState(serverResult);
    } else {
      setState(prev => {
        const updatedCandidates = prev.candidates.map(candidate => {
          if (ballotToRemove.selectedCandidateIds.includes(candidate.id)) {
            return { ...candidate, votes: Math.max(0, candidate.votes - 1) };
          }
          return candidate;
        });

        const filteredBallots = prev.ballots.filter(b => b.id !== ballotId);
        const reindexedBallots = filteredBallots
          .sort((a, b) => a.timestamp - b.timestamp)
          .map((b, idx) => ({
            ...b,
            ballotNumber: idx + 1
          }));

        return {
          ...prev,
          ballots: reindexedBallots,
          candidates: updatedCandidates
        };
      });
    }
    setToastMessage(`Pusula #${ballotToRemove.ballotNumber} silindi ve oylar geri alındı.`);
  };

  // Callback to update candidates details (adding / bulk importing)
  const handleUpdateCandidates = async (updatedCandidates: Candidate[]) => {
    const updated = {
      ...state,
      candidates: updatedCandidates
    };
    setState(updated);
    await sendServerState(updated);
  };

  // Handler to update extra election stats dynamically
  const handleUpdateStats = async (voterCount: number, invalidVotes: number, blankVotes: number) => {
    const updated = {
      ...state,
      voterCount,
      invalidVotes,
      blankVotes
    };
    setState(updated);
    await sendServerState(updated);
  };

  // Trigger vote reset modal
  const handleInitiateResetVotes = () => {
    setResetModalType('votes');
  };

  // Confirm and execute vote reset
  const handleConfirmResetVotes = async () => {
    setState(prev => {
      const resetCandidates = prev.candidates.map(c => ({ ...c, votes: 0 }));
      return {
        ...prev,
        ballots: [],
        candidates: resetCandidates,
        invalidVotes: 0,
        blankVotes: 0
      };
    });
    setResetModalType('none');
    setToastMessage('Tüm oylar ve pusulalar sıfırlandı.');
    const serverResult = await apiResetVotes();
    if (serverResult) setState(serverResult);
  };

  // Trigger full factory reset modal
  const handleInitiateResetAll = () => {
    setResetModalType('all');
  };

  // Confirm and execute full reset of all election data
  const handleConfirmResetAll = async () => {
    localStorage.removeItem('oab_election_state');
    const mode = fullResetMode === 'default' ? 'default' : 'empty';
    if (mode === 'default') {
      const fresh = getInitialState();
      setState(fresh);
      setSchoolInput(fresh.schoolName);
      setTitleInput(fresh.title);
    } else {
      const fresh = {
        ...getInitialState(),
        candidates: [],
        schoolName: 'Okulumuz',
        title: 'Okul Aile Birliği Seçimi',
        voterCount: 0,
        invalidVotes: 0,
        blankVotes: 0
      };
      setState(fresh);
      setSchoolInput(fresh.schoolName);
      setTitleInput(fresh.title);
    }
    setResetModalType('none');
    setToastMessage('Tüm seçim verileri başarıyla sıfırlandı ve sistem hazırlandı.');
    const serverResult = await apiResetAll(mode);
    if (serverResult) setState(serverResult);
  };

  // Export to Excel function
  const handleExportExcel = () => {
    try {
      exportElectionToExcel(state);
      setToastMessage('Tüm seçim sonuçları ve pusula tutanağı Excel (.xlsx) olarak indirildi.');
    } catch (err) {
      console.error('Excel export failed:', err);
      setToastMessage('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans select-none antialiased text-slate-900 pb-12">
      
      {/* GLOBAL BENTO HEADER SECTION */}
      <div className="max-w-7xl mx-auto px-4 w-full mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bento Card 1: Institution Identity & Title (Left 8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-[28px] border border-slate-200/85 p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-indigo-50 text-indigo-700 text-[10px] font-bold tracking-widest px-4 py-1.5 uppercase rounded-bl-[20px] shadow-2xs">
            Okul Seçim Portalı
          </div>
          
          <div className="flex gap-4 items-start md:items-center">
            <div className="bg-indigo-650 text-white p-3.5 rounded-[20px] shadow-sm shrink-0 flex items-center justify-center">
              <Vote className="w-8 h-8" />
            </div>

            {isEditingHeader ? (
              <div className="space-y-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl w-full max-w-md">
                <input
                  type="text"
                  value={schoolInput}
                  onChange={(e) => setSchoolInput(e.target.value)}
                  placeholder="Okul İsmi (örn: Sev İlköğretim Okulu)"
                  className="w-full px-3 py-1.5 text-sm font-semibold bg-white border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500/10"
                />
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Seçim Başlığı"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden focus:ring-2 focus:ring-indigo-500/10"
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <button 
                    onClick={() => setIsEditingHeader(false)}
                    className="px-3 py-1 text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-semibold"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={handleSaveHeader}
                    className="px-3.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            ) : (
              <div className="grow">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black font-display tracking-tight text-slate-900">
                    {state.schoolName}
                  </h1>
                  <button 
                    onClick={() => setIsEditingHeader(true)}
                    className="text-slate-400 hover:text-indigo-600 p-1 rounded-full hover:bg-slate-50 transition-colors"
                    title="Okul İsmini Düzenle"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-550 mt-1">
                  <p className="font-semibold text-slate-700">{state.title}</p>
                  <span className="hidden md:inline text-slate-300">|</span>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-medium">{state.date}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            {/* APP NAVIGATION TABS IN BENTO STYLE */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-2xs w-full md:w-auto">
              <button
                id="tab-entry"
                onClick={() => setActiveTab('entry')}
                className={`flex-1 md:flex-initial py-2 px-5 rounded-[12px] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'entry'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/55'
                }`}
              >
                <Vote className="w-3.5 h-3.5" />
                <span>Oy Sayım Masası</span>
              </button>

              <button
                id="tab-projection"
                onClick={() => setActiveTab('projection')}
                className={`flex-1 md:flex-initial py-2 px-5 rounded-[12px] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'projection'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/55'
                }`}
              >
                <Presentation className="w-3.5 h-3.5" />
                <span>Projeksiyon Ekranı</span>
              </button>

              <button
                id="tab-settings"
                onClick={() => setActiveTab('settings')}
                className={`flex-1 md:flex-initial py-2 px-5 rounded-[12px] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/55'
                }`}
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Aday Yönetimi / Ayarlar</span>
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Excel Export Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer hover:shadow-sm"
                title="Tüm seçim sonuçlarını ve pusula dökümünü Excel (.xlsx) olarak indir"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel'e Aktar (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleInitiateResetAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer"
                title="Tüm seçim verilerini sıfırla"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Verileri Sıfırla</span>
              </button>

              {/* Multi-device Live Sync Badge */}
              <div 
                className="flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200"
                title="Bilgisayarlar arası (Sayım Masası ve Projeksiyon Ekranı) anlık canlı veri senkronizasyonu"
              >
                <span className={`w-2 h-2 rounded-full ${
                  syncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : syncStatus === 'syncing' ? 'bg-amber-500 animate-bounce' : 'bg-slate-400'
                }`}></span>
                <span className="text-[11px] font-bold text-slate-700 font-mono">
                  {syncStatus === 'connected' ? 'CANLI SENKRONİZE' : syncStatus === 'syncing' ? 'EŞİTLENİYOR...' : 'ÇEVRİMDİŞİ'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Card 2: Quick counter metrics (Right 4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 text-white rounded-[28px] p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-slate-800 text-slate-400 text-[9px] font-bold tracking-widest px-3 py-1 uppercase rounded-bl-lg">
            Anlık Rapor
          </div>
          
          <div>
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">TOPLAM SAYILAN PUSULA</h4>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-black font-display tracking-tight text-white">{state.ballots.length}</span>
              <span className="text-sm text-slate-400 font-semibold">Adet Zarf</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 mt-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Geçersiz / Boş</span>
              <p className="text-lg font-bold mt-1 text-red-400">{(state.invalidVotes ?? 0) + (state.blankVotes ?? 0)} Oy</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Katılım Oranı</span>
              <p className="text-lg font-bold mt-1 text-emerald-400">
                {state.voterCount && state.voterCount > 0 
                  ? `%${Math.round((state.ballots.length / state.voterCount) * 105) > 100 ? 100 : Math.round((state.ballots.length / state.voterCount) * 100)}` 
                  : '%0'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* DETAILED ACTIVE COMPONENT GRID */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full grow flex flex-col justify-start">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            {activeTab === 'entry' && (
              <div className="space-y-6">
                
                {/* Information Header on the Desk */}
                <div className="bg-white border border-slate-200/85 rounded-[20px] p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-650 shrink-0">
                      <Flame className="w-5 h-5 shrink-0" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">
                        Pusula Sayımına Başlayın
                      </p>
                      <p className="text-xs text-slate-550 mt-0.5">
                        Kutudan çıkan pusulalarda oy alan adayların isimlerini aşağıdaki seçim havuzundan tıklayarak işaretleyin, ardından "OYLARI KAYDET" veya klavyeden ENTER tuşuna basın.
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-100 px-3.5 py-1.5 rounded-xl shrink-0">
                    Sistem Durumu: Çevrimdışı (Kaydedildi)
                  </div>
                </div>

                {/* Main ballot console input */}
                <BallotEntry 
                  candidates={state.candidates}
                  onAddBallot={handleAddBallot}
                  lastBallotsCount={state.ballots.length}
                  onAddCandidate={handleAddCandidate}
                  onDirectVote={handleDirectVote}
                  onAddBlankVote={handleAddBlankVote}
                  onAddInvalidVote={handleAddInvalidVote}
                  onLoadSampleCandidates={handleLoadSampleCandidates}
                  invalidVotes={state.invalidVotes ?? 0}
                  blankVotes={state.blankVotes ?? 0}
                />

                {/* Live Counted Registry list below */}
                <BallotHistory 
                  ballots={state.ballots}
                  candidates={state.candidates}
                  onDeleteBallot={handleDeleteBallot}
                />
              </div>
            )}

            {activeTab === 'projection' && (
              <div className="space-y-6">
                
                {/* Banner explaining projection setup */}
                <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-800 print:hidden">
                  <div className="flex items-center gap-2">
                    <Presentation className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Okul projeksiyonunuza yansıtmak için bilgisayarınızda bir sekme açıp bu sayfayı yansıtabilirsiniz. Normal kullanıma oylama sekmesinde devam edin.
                    </span>
                  </div>
                </div>

                <ProjectionBoard 
                  candidates={state.candidates}
                  totalBallots={state.ballots.length}
                  voterCount={state.voterCount ?? 300}
                  invalidVotes={state.invalidVotes ?? 0}
                  blankVotes={state.blankVotes ?? 0}
                  onExportExcel={handleExportExcel}
                  syncStatus={syncStatus}
                />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200/80 p-4 rounded-[20px] text-xs flex justify-between items-center text-slate-655 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-xl text-slate-605">
                      <School className="w-4 h-4 text-slate-500" />
                    </div>
                    <span>Buradan okul aile birliği seçiminizin genel seçmen sayısını, boş/geçersiz oy oranını girebilir ve aday listesini toplu güncelleyebilirsiniz.</span>
                  </div>
                </div>

                <CandidateBatchEdit 
                  candidates={state.candidates}
                  onUpdateCandidates={handleUpdateCandidates}
                  onResetVotes={handleInitiateResetVotes}
                  onResetAllData={handleInitiateResetAll}
                  voterCount={state.voterCount ?? 300}
                  invalidVotes={state.invalidVotes ?? 0}
                  blankVotes={state.blankVotes ?? 0}
                  onUpdateStats={handleUpdateStats}
                  onExportExcel={handleExportExcel}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* TOAST NOTIFICATION BANNER */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-sm font-semibold"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESET CONFIRMATION MODAL */}
      <AnimatePresence>
        {resetModalType !== 'none' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-slate-200 overflow-hidden relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setResetModalType('none')}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>

              {resetModalType === 'all' ? (
                <div>
                  <div className="flex items-center gap-3 text-red-600 mb-4">
                    <div className="bg-red-100 p-3 rounded-2xl">
                      <AlertTriangle className="w-7 h-7 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black font-display text-slate-900">
                        Tüm Verileri Sıfırla
                      </h3>
                      <p className="text-xs text-red-600 font-semibold">
                        Fabrika Ayarlarına Dönüş
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    Bu işlem tüm seçim veritabanını temizler. Aşağıdaki veriler kalıcı olarak silinecektir:
                  </p>

                  <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 mb-5 space-y-2 text-xs text-red-900 font-medium">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-red-500">•</span>
                      <span>Kayıtlı <strong>{state.ballots.length} adet pusula</strong> ve sayım dökümleri</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-red-500">•</span>
                      <span>Mevcut tüm adayların oy sayıları</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-red-500">•</span>
                      <span>Geçersiz ve boş oy sayaçları ile seçmen sayısı</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-red-500">•</span>
                      <span>Tarayıcı yerel hafızası (LocalStorage)</span>
                    </div>
                  </div>

                  {/* Reset Configuration Option */}
                  <div className="mb-6 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider font-mono">
                      Sıfırlama Sonrası Aday Listesi Durumu:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFullResetMode('default')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          fullResetMode === 'default'
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-1 ring-indigo-500'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <p className="font-bold">Örnek Şablon ile Başla</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">30 adet örnek aday ve standart düzen</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFullResetMode('blank')}
                        className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          fullResetMode === 'blank'
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-1 ring-indigo-500'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <p className="font-bold">Tamamen Boş Başla</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">0 aday (kendi listenizi girmek için)</p>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setResetModalType('none')}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmResetAll}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Evet, Tüm Verileri Sıfırla
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 text-amber-600 mb-4">
                    <div className="bg-amber-100 p-3 rounded-2xl">
                      <RotateCcw className="w-7 h-7 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black font-display text-slate-900">
                        Oyları Sıfırla
                      </h3>
                      <p className="text-xs text-amber-700 font-semibold">
                        Yalnızca Pusulalar ve Oy Sayaçları Temizlenecek
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    Aday isimleriniz, okul bilgileriniz ve genel ayarlarınız <strong>korunacaktır</strong>. Yalnızca sisteme girilen <strong>{state.ballots.length} adet pusula</strong> ve adayların mevcut oy sayıları sıfırlanacaktır.
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setResetModalType('none')}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmResetVotes}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Oyları Sıfırla
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
export type { ElectionState };
