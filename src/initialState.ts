import { Candidate, ElectionState } from './types';

export const getInitialCandidates = (): Candidate[] => {
  const candidates: Candidate[] = [];

  // 1 to 15: Board Candidates
  for (let i = 1; i <= 15; i++) {
    candidates.push({
      id: `board-${i}`,
      name: `Aday ${i}`,
      votes: 0,
      type: 'board'
    });
  }

  // 16 to 20: Audit Candidates (Denetmen)
  for (let i = 1; i <= 5; i++) {
    candidates.push({
      id: `audit-${i}`,
      name: `Denetmen ${i}`,
      votes: 0,
      type: 'audit'
    });
  }

  // 21 to 30: Board Candidates
  for (let i = 21; i <= 30; i++) {
    candidates.push({
      id: `board-${i}`,
      name: `Aday ${i}`,
      votes: 0,
      type: 'board'
    });
  }

  return candidates;
};

export const getInitialState = (): ElectionState => {
  return {
    candidates: getInitialCandidates(),
    ballots: [],
    title: 'Okul Aile Birliği Seçimi',
    schoolName: 'Örnek Okul',
    date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }),
    voterCount: 300,
    invalidVotes: 0,
    blankVotes: 0
  };
};
