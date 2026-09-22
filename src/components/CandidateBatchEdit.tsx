import React, { useState } from 'react';
import { Candidate } from '../types';
import { ListPlus, Save, RefreshCw, Edit, Trash2, Plus, RotateCcw, AlertTriangle, FileSpreadsheet, Download } from 'lucide-react';

interface CandidateBatchEditProps {
  candidates: Candidate[];
  onUpdateCandidates: (candidates: Candidate[]) => void;
  onResetVotes: () => void;
  voterCount: number;
  invalidVotes: number;
  blankVotes: number;
  onUpdateStats: (voterCount: number, invalidVotes: number, blankVotes: number) => void;
  onResetAllData: () => void;
  onExportExcel?: () => void;
}

export default function CandidateBatchEdit({
  candidates,
  onUpdateCandidates,
  onResetVotes,
  voterCount,
  invalidVotes,
  blankVotes,
  onUpdateStats,
  onResetAllData,
  onExportExcel
}: CandidateBatchEditProps) {
  const [boardText, setBoardText] = useState('');
  const [auditText, setAuditText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateType, setNewCandidateType] = useState<'board' | 'audit'>('board');

  const handleBatchImportBoard = () => {
    if (!boardText.trim()) return;
    const lines = boardText.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Replace names of 'board' candidates with loaded names
    const currentBoardCandidates = candidates.filter(c => c.type === 'board');
    const auditCandidates = candidates.filter(c => c.type === 'audit');
    
    const updatedBoard = [...currentBoardCandidates];
    
    lines.forEach((name, idx) => {
      if (idx < updatedBoard.length) {
        updatedBoard[idx].name = name;
      } else {
        // Create new board candidates if batch is larger
        updatedBoard.push({
          id: `board-new-${Date.now()}-${idx}`,
          name: name,
          votes: 0,
          type: 'board'
        });
      }
    });

    onUpdateCandidates([...updatedBoard, ...auditCandidates]);
    setBoardText('');
    alert(`Yönetim Kurulu için ${lines.length} aday ismi güncellendi / eklendi.`);
  };

  const handleBatchImportAudit = () => {
    if (!auditText.trim()) return;
    const lines = auditText.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Replace names of 'audit' candidates with loaded names
    const boardCandidates = candidates.filter(c => c.type === 'board');
    const currentAuditCandidates = candidates.filter(c => c.type === 'audit');
    
    const updatedAudit = [...currentAuditCandidates];
    
    lines.forEach((name, idx) => {
      if (idx < updatedAudit.length) {
        updatedAudit[idx].name = name;
      } else {
        // Create new audit candidates if batch is larger
        updatedAudit.push({
          id: `audit-new-${Date.now()}-${idx}`,
          name: name,
          votes: 0,
          type: 'audit'
        });
      }
    });

    onUpdateCandidates([...boardCandidates, ...updatedAudit]);
    setAuditText('');
    alert(`Denetim Kurulu için ${lines.length} aday ismi güncellendi / eklendi.`);
  };

  const handleEditStart = (c: Candidate) => {
    setEditingId(c.id);
    setEditingName(c.name);
  };

  const handleEditSave = (id: string) => {
    if (!editingName.trim()) return;
    const updated = candidates.map(c => 
      c.id === id ? { ...c, name: editingName.trim() } : c
    );
    onUpdateCandidates(updated);
    setEditingId(null);
  };

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateName.trim()) return;

    const newCand: Candidate = {
      id: `${newCandidateType}-new-${Date.now()}`,
      name: newCandidateName.trim(),
      votes: 0,
      type: newCandidateType
    };

    onUpdateCandidates([...candidates, newCand]);
    setNewCandidateName('');
  };

  const handleDeleteCandidate = (id: string, name: string) => {
    const cand = candidates.find(c => c.id === id);
    if (!cand) return;
    
    if (cand.votes > 0) {
      if (!confirm(`"${name}" adayının ${cand.votes} oyu bulunuyor. Silmek istediğinizden emin misiniz? Oyları geçersiz olacaktır.`)) {
        return;
      }
    } else {
      if (!confirm(`"${name}" adayını listedken kaldırmak istediğinizden emin misiniz?`)) {
        return;
      }
    }

    onUpdateCandidates(candidates.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Grid of Candidates for Quick Inline Editing */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
          <Edit className="w-5 h-5 text-indigo-600" />
          Aday Listesini Düzenle (Tıklayarak İsim Değiştirebilirsiniz)
        </h3>

        {/* Board Candidates */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-indigo-700 mb-3 uppercase tracking-wider">
            Yönetim Kurulu Adayları ({candidates.filter(c => c.type === 'board').length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {candidates.filter(c => c.type === 'board').map((c, index) => (
              <div 
                key={c.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-150 hover:border-slate-350 transition-colors"
              >
                {editingId === c.id ? (
                  <div className="flex items-center gap-1 w-full">
                    <span className="text-xs text-slate-400 font-mono select-none w-5">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleEditSave(c.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSave(c.id)}
                      className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-md focus:outline-hidden focus:border-indigo-500 w-full"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleEditSave(c.id)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div 
                      onClick={() => handleEditStart(c)}
                      className="flex items-center gap-2 cursor-pointer grow py-1 pr-4"
                    >
                      <span className="text-xs text-slate-400 font-mono select-none">
                        {index + 1}.
                      </span>
                      <span className="text-sm font-medium text-slate-800 hover:text-indigo-600">
                        {c.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-sm font-mono mr-1">
                        {c.votes} Oy
                      </span>
                      <button
                        onClick={() => handleDeleteCandidate(c.id, c.name)}
                        className="text-slate-400 hover:text-red-600 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Adayı Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Audit Candidates */}
        <div>
          <h4 className="text-sm font-semibold text-emerald-700 mb-3 uppercase tracking-wider">
            Denetim Kurulu Adayları ({candidates.filter(c => c.type === 'audit').length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {candidates.filter(c => c.type === 'audit').map((c, index) => (
              <div 
                key={c.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-150 hover:border-slate-350 transition-colors"
              >
                {editingId === c.id ? (
                  <div className="flex items-center gap-1 w-full">
                    <span className="text-xs text-slate-400 font-mono select-none w-5">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleEditSave(c.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSave(c.id)}
                      className="px-2 py-1 text-sm bg-white border border-slate-300 rounded-md focus:outline-hidden focus:border-emerald-500 w-full"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleEditSave(c.id)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div 
                      onClick={() => handleEditStart(c)}
                      className="flex items-center gap-2 cursor-pointer grow py-1 pr-4"
                    >
                      <span className="text-xs text-slate-400 font-mono select-none">
                        D{index + 1}.
                      </span>
                      <span className="text-sm font-medium text-slate-800 hover:text-emerald-600">
                        {c.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-sm font-mono mr-1">
                        {c.votes} Oy
                      </span>
                      <button
                        onClick={() => handleDeleteCandidate(c.id, c.name)}
                        className="text-slate-400 hover:text-red-600 p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Adayı Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual / Form Add & Batch Loader Side-By-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Add Candidate Form */}
        <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 font-display">
            <Plus className="w-5 h-5 text-indigo-600" />
            Yeni Aday Ekle
          </h3>
          <form onSubmit={handleAddCandidate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Aday Tipi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewCandidateType('board')}
                  className={`py-2 px-3 text-sm rounded-lg border font-medium transition-colors ${
                    newCandidateType === 'board'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Yönetim Kurulu
                </button>
                <button
                  type="button"
                  onClick={() => setNewCandidateType('audit')}
                  className={`py-2 px-3 text-sm rounded-lg border font-medium transition-colors ${
                    newCandidateType === 'audit'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Denetim Kurulu
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Aday Adı & Soyadı
              </label>
              <input
                type="text"
                value={newCandidateName}
                onChange={(e) => setNewCandidateName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={!newCandidateName.trim()}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adayı Ekle
            </button>
          </form>
        </div>

        {/* Election General Stats Form */}
        <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 font-display">
            <RefreshCw className="w-5 h-5 text-indigo-600 hover:rotate-45 transition-transform" />
            Genel Seçim İstatistikleri
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Toplam Seçmen / Veli Sayısı
              </label>
              <input
                type="number"
                min="0"
                value={voterCount}
                onChange={(e) => onUpdateStats(Math.max(1, parseInt(e.target.value) || 0), invalidVotes, blankVotes)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-205 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Katılım yüzdesini hesaplamak için gereklidir.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Geçersiz Zarflar / Oylar
              </label>
              <input
                type="number"
                min="0"
                value={invalidVotes}
                onChange={(e) => onUpdateStats(voterCount, Math.max(0, parseInt(e.target.value) || 0), blankVotes)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-205 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Boş Atılan Zarflar / Oylar
              </label>
              <input
                type="number"
                min="0"
                value={blankVotes}
                onChange={(e) => onUpdateStats(voterCount, invalidVotes, Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-205 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Batch Load Board Candidates */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-indigo-600" />
            Yönetim Kurulu Toplu İsimler
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Her satıra bir isim gelecek şekilde yapıştırın. Mevcut adayların isimleri sırayla değiştirilecektir.
          </p>
          <textarea
            rows={4}
            value={boardText}
            onChange={(e) => setBoardText(e.target.value)}
            placeholder="Aslı Yılmaz&#10;Murat Kaya&#10;Cem Demir"
            className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
          <button
            onClick={handleBatchImportBoard}
            disabled={!boardText.trim()}
            className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            İsimleri Güncelle
          </button>
        </div>

        {/* Batch Load Audit Candidates */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-emerald-600" />
            Denetim Kurulu Toplu İsimler
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Her satıra bir isim gelecek şekilde yapıştırın. Mevcut denetmenlerin isimleri sırayla değiştirilecektir.
          </p>
          <textarea
            rows={4}
            value={auditText}
            onChange={(e) => setAuditText(e.target.value)}
            placeholder="Kamil Şen&#10;Lale Bulut"
            className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
          />
          <button
            onClick={handleBatchImportAudit}
            disabled={!auditText.trim()}
            className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-350 text-white py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            İsimleri Güncelle
          </button>
        </div>
      </div>

      {/* Excel Export Zone */}
      {onExportExcel && (
        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-[24px] p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xs shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-950 font-display">
                Resmi Seçim Tutanağı ve Excel Dökümü (.xlsx)
              </h4>
              <p className="text-xs text-emerald-800/90 mt-1 max-w-xl">
                Tüm yönetim ve denetim kurulu adaylarının oy sayıları, yüzdeleri, asil/yedek kazanma durumları, açılan zarflar ve pusula kayıtları dahil tüm verileri Excel dosyası olarak anında indirin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExportExcel}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Excel Dosyasını İndir (.xlsx)</span>
          </button>
        </div>
      )}

      {/* Dangerous Operations Zone */}
      <div className="bg-red-50/70 border border-red-200/90 rounded-[24px] p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2 text-red-900">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <h4 className="text-base font-bold font-display">
            Sıfırlama ve Tehlikeli İşlemler
          </h4>
        </div>
        <p className="text-xs text-red-700/90 mb-5">
          Bu işlemler veritabanını ve sayaçları temizler. İhtiyacınıza uygun sıfırlama seçeneğini belirleyin.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Reset Votes Only */}
          <div className="bg-white border border-red-200 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <span>Yalnızca Oyları Sıfırla</span>
              </div>
              <p className="text-xs text-slate-550 mb-4">
                Aday listeleri, okul adı ve seçmen sayısı korunur. Sadece sayılmış oy pusulaları ve aday oy sayaçları sıfırlanır.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetVotes}
              className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Oyları ve Pusulaları Sıfırla
            </button>
          </div>

          {/* Card 2: Reset ALL Data (Factory Reset) */}
          <div className="bg-white border border-red-300 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-1">
                <RotateCcw className="w-4 h-4 text-red-600" />
                <span>Tüm Verileri Sıfırla (Fabrika Ayarları)</span>
              </div>
              <p className="text-xs text-slate-550 mb-4">
                Tüm adaylar, oylar, pusulalar, okul bilgileri ve genel seçim istatistikleri dahil tüm sistem verilerini tamamen sıfırlar.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetAllData}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tüm Verileri Sıfırla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export type { CandidateBatchEditProps };
