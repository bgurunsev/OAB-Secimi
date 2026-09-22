import React from 'react';
import { Ballot, Candidate } from '../types';
import { History, Undo2, Award, Calendar, AlertTriangle } from 'lucide-react';

interface BallotHistoryProps {
  ballots: Ballot[];
  candidates: Candidate[];
  onDeleteBallot: (ballotId: string) => void;
}

export default function BallotHistory({ ballots, candidates, onDeleteBallot }: BallotHistoryProps) {
  // Map ballot with actual candidate names for display
  const getCandidateNames = (selectedIds: string[]) => {
    return selectedIds
      .map(id => {
        const c = candidates.find(cand => cand.id === id);
        return c ? c.name : 'Unknown';
      })
      .join(', ');
  };

  // Sort ballots show newest first
  const sortedBallots = [...ballots].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-650" />
          Sayılması Tamamlanan Pusulalar ({ballots.length} adet)
        </h3>
        {ballots.length > 0 && (
          <span className="text-xs bg-slate-100 text-slate-650 px-2 py-1 rounded-md font-mono">
            Son girilen en üstte
          </span>
        )}
      </div>

      {ballots.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Calendar className="w-12 h-12 stroke-1 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold">Henüz Pusula Girilmedi</p>
          <p className="text-xs text-slate-400 mt-1">Sol taraftaki konsolu kullanarak ilk pusulayı kaydedin.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {sortedBallots.map((b, index) => (
            <div 
              key={b.id} 
              className="flex items-center justify-between p-3.5 rounded-lg border border-slate-150 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="grow mr-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md font-mono">
                    PUSULA #{b.ballotNumber}
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono">
                    {new Date(b.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mt-2">
                  {getCandidateNames(b.selectedCandidateIds)}
                </p>
              </div>

              <button
                onClick={() => onDeleteBallot(b.id)}
                className="text-red-650 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0"
                title="Pusulayı iptal et ve oyları geri al"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Geri Al (Sil)
              </button>
            </div>
          ))}
        </div>
      )}

      {ballots.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-250 rounded-lg flex items-start gap-2 text-[11px] text-amber-800 leading-normal">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Hata Düzeltme Notu:</strong> Sesli okuma sırasında yanlış girilen bir pusula olursa sağındaki "Geri Al" butonuna tıklayabilirsiniz. Bu işlem o pusuladaki tüm oyları adayların hanesinden düşecek ve sıralamayı anında güncelleyecektir.
          </span>
        </div>
      )}
    </div>
  );
}
export type { BallotHistoryProps };
