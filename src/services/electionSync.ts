import { ElectionState } from '../types';

export type SyncStatus = 'connected' | 'syncing' | 'offline';

export async function fetchServerState(): Promise<ElectionState | null> {
  try {
    const res = await fetch('/api/election-state');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch state from server:', err);
    return null;
  }
}

export async function sendServerState(state: ElectionState): Promise<boolean> {
  try {
    const res = await fetch('/api/election-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not save state to server:', err);
    return false;
  }
}

export async function apiAddBallot(selectedCandidateIds: string[]): Promise<ElectionState | null> {
  try {
    const res = await fetch('/api/ballots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedCandidateIds })
    });
    if (!res.ok) throw new Error('Add ballot failed');
    const data = await res.json();
    return data.state || null;
  } catch (err) {
    console.warn('API add ballot error:', err);
    return null;
  }
}

export async function apiDeleteBallot(ballotId: string): Promise<ElectionState | null> {
  try {
    const res = await fetch(`/api/ballots/${ballotId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Delete ballot failed');
    const data = await res.json();
    return data.state || null;
  } catch (err) {
    console.warn('API delete ballot error:', err);
    return null;
  }
}

export async function apiDirectVote(candidateId: string, delta: number): Promise<ElectionState | null> {
  try {
    const res = await fetch('/api/direct-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, delta })
    });
    if (!res.ok) throw new Error('Direct vote failed');
    const data = await res.json();
    return data.state || null;
  } catch (err) {
    console.warn('API direct vote error:', err);
    return null;
  }
}

export async function apiAddBlankVote(): Promise<ElectionState | null> {
  try {
    const res = await fetch('/api/blank-vote', {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Add blank vote failed');
    const data = await res.json();
    return data.state || null;
  } catch (err) {
    console.warn('API add blank vote error:', err);
    return null;
  }
}

export async function apiAddInvalidVote(): Promise<ElectionState | null> {
  try {
    const res = await fetch('/api/invalid-vote', {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Add invalid vote failed');
    const data = await res.json();
    return data.state || null;
  } catch (err) {
    console.warn('API add invalid vote error:', err);
    return null;
  }
}

export async function apiResetVotes(): Promise<ElectionState | null> {
  try {
    const res = await fetch('/api/reset-votes', {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Reset votes failed');
    const data = await res.json();
    return data.state || null;
  } catch (err) {
    console.warn('API reset votes error:', err);
    return null;
  }
}

export async function apiResetAll(mode: 'empty' | 'default'): Promise<ElectionState | null> {
  try {
    const res = await fetch('/api/reset-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    if (!res.ok) throw new Error('Reset all failed');
    const data = await res.json();
    return data.state || null;
  } catch (err) {
    console.warn('API reset all error:', err);
    return null;
  }
}

export function subscribeToElectionSync(
  onUpdate: (state: ElectionState) => void,
  onStatusChange: (status: SyncStatus) => void
): () => void {
  let eventSource: EventSource | null = null;
  let pollingInterval: NodeJS.Timeout | null = null;
  let isClosed = false;

  const connectSSE = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        onStatusChange('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.candidates)) {
            onUpdate(data);
            onStatusChange('connected');
          }
        } catch (err) {
          console.error('Failed to parse SSE payload:', err);
        }
      };

      eventSource.onerror = () => {
        onStatusChange('syncing');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Retry SSE connection after 3 seconds
        if (!isClosed) {
          setTimeout(connectSSE, 3000);
        }
      };
    } catch (err) {
      console.warn('EventSource initialization failed, relying on polling:', err);
      onStatusChange('syncing');
    }
  };

  // Start SSE
  connectSSE();

  // Polling fallback every 2.5 seconds to guarantee synchronization across all devices
  pollingInterval = setInterval(async () => {
    if (isClosed) return;
    const serverState = await fetchServerState();
    if (serverState) {
      onUpdate(serverState);
      onStatusChange('connected');
    }
  }, 2500);

  // Return cleanup function
  return () => {
    isClosed = true;
    if (eventSource) eventSource.close();
    if (pollingInterval) clearInterval(pollingInterval);
  };
}
