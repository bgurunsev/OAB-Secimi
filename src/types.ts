export interface Candidate {
  id: string;
  name: string;
  votes: number;
  type: 'board' | 'audit'; // 'board' -> Yönetim Kurulu, 'audit' -> Denetim Kurulu
}

export interface Ballot {
  id: string;
  selectedCandidateIds: string[];
  timestamp: number;
  ballotNumber: number;
}

export interface ElectionState {
  candidates: Candidate[];
  ballots: Ballot[];
  title: string;
  schoolName: string;
  date: string;
  voterCount?: number;
  invalidVotes?: number;
  blankVotes?: number;
}
