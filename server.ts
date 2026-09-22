import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'election_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Generate default initial state if no saved file exists
function getDefaultElectionState() {
  const candidates = [];
  // 1 to 15: Board Candidates
  for (let i = 1; i <= 15; i++) {
    candidates.push({
      id: `board-${i}`,
      name: `Aday ${i}`,
      votes: 0,
      type: 'board'
    });
  }
  // 1 to 5: Audit Candidates
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

  return {
    candidates,
    ballots: [],
    title: 'Okul Aile Birliği Seçimi',
    schoolName: 'Örnek Okul',
    date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }),
    voterCount: 300,
    invalidVotes: 0,
    blankVotes: 0,
    lastUpdated: Date.now()
  };
}

// In-memory election state
let electionState = (function loadInitialState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.candidates)) {
        return {
          ...parsed,
          lastUpdated: parsed.lastUpdated || Date.now()
        };
      }
    }
  } catch (err) {
    console.error('Failed to load saved state from file, using defaults:', err);
  }
  const defaultState = getDefaultElectionState();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write initial default state to file:', err);
  }
  return defaultState;
})();

function persistState() {
  electionState.lastUpdated = Date.now();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(electionState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist election state to disk:', err);
  }
}

// SSE Clients Registry
const sseClients = new Set<express.Response>();

function broadcastStateUpdate() {
  const payload = `data: ${JSON.stringify(electionState)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // API ROUTES FIRST

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', clientCount: sseClients.size, lastUpdated: electionState.lastUpdated });
  });

  // 1. Get current full state
  app.get('/api/election-state', (req, res) => {
    res.json(electionState);
  });

  // 2. Real-time Server-Sent Events (SSE) endpoint
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send immediate initial state
    res.write(`data: ${JSON.stringify(electionState)}\n\n`);
    sseClients.add(res);

    // Keep-alive heartbeat ping every 20 seconds
    const interval = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (err) {
        clearInterval(interval);
        sseClients.delete(res);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(interval);
      sseClients.delete(res);
    });
  });

  // 3. Save full state (from client updates)
  app.post('/api/election-state', (req, res) => {
    const updatedState = req.body;
    if (!updatedState || !Array.isArray(updatedState.candidates)) {
      return res.status(400).json({ error: 'Invalid election state payload' });
    }

    electionState = {
      ...electionState,
      ...updatedState,
      lastUpdated: Date.now()
    };
    persistState();
    broadcastStateUpdate();
    res.json({ success: true, state: electionState });
  });

  // 4. Add Ballot atomically
  app.post('/api/ballots', (req, res) => {
    const { selectedCandidateIds } = req.body;
    if (!Array.isArray(selectedCandidateIds)) {
      return res.status(400).json({ error: 'selectedCandidateIds must be an array' });
    }

    const nextNumber = electionState.ballots.length + 1;
    const newBallot = {
      id: `ballot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      selectedCandidateIds,
      timestamp: Date.now(),
      ballotNumber: nextNumber
    };

    const updatedCandidates = electionState.candidates.map((c: any) => {
      if (selectedCandidateIds.includes(c.id)) {
        return { ...c, votes: (c.votes || 0) + 1 };
      }
      return c;
    });

    electionState.ballots.push(newBallot);
    electionState.candidates = updatedCandidates;

    persistState();
    broadcastStateUpdate();
    res.json({ success: true, newBallot, state: electionState });
  });

  // 5. Delete / Undo Ballot
  app.delete('/api/ballots/:id', (req, res) => {
    const ballotId = req.params.id;
    const ballotToRemove = electionState.ballots.find((b: any) => b.id === ballotId);

    if (!ballotToRemove) {
      return res.status(404).json({ error: 'Ballot not found' });
    }

    const updatedCandidates = electionState.candidates.map((c: any) => {
      if (ballotToRemove.selectedCandidateIds.includes(c.id)) {
        return { ...c, votes: Math.max(0, (c.votes || 0) - 1) };
      }
      return c;
    });

    const filteredBallots = electionState.ballots
      .filter((b: any) => b.id !== ballotId)
      .sort((a: any, b: any) => a.timestamp - b.timestamp)
      .map((b: any, idx: number) => ({
        ...b,
        ballotNumber: idx + 1
      }));

    electionState.ballots = filteredBallots;
    electionState.candidates = updatedCandidates;

    persistState();
    broadcastStateUpdate();
    res.json({ success: true, state: electionState });
  });

  // 6. Direct Vote (+1 or -1)
  app.post('/api/direct-vote', (req, res) => {
    const { candidateId, delta } = req.body;
    if (!candidateId || typeof delta !== 'number') {
      return res.status(400).json({ error: 'candidateId and numeric delta are required' });
    }

    electionState.candidates = electionState.candidates.map((c: any) => {
      if (c.id === candidateId) {
        return { ...c, votes: Math.max(0, (c.votes || 0) + delta) };
      }
      return c;
    });

    persistState();
    broadcastStateUpdate();
    res.json({ success: true, state: electionState });
  });

  // 7. Increment blank / invalid votes
  app.post('/api/blank-vote', (req, res) => {
    electionState.blankVotes = (electionState.blankVotes || 0) + 1;
    persistState();
    broadcastStateUpdate();
    res.json({ success: true, state: electionState });
  });

  app.post('/api/invalid-vote', (req, res) => {
    electionState.invalidVotes = (electionState.invalidVotes || 0) + 1;
    persistState();
    broadcastStateUpdate();
    res.json({ success: true, state: electionState });
  });

  // 8. Reset Votes (keeps candidates)
  app.post('/api/reset-votes', (req, res) => {
    electionState.candidates = electionState.candidates.map((c: any) => ({ ...c, votes: 0 }));
    electionState.ballots = [];
    electionState.invalidVotes = 0;
    electionState.blankVotes = 0;
    persistState();
    broadcastStateUpdate();
    res.json({ success: true, state: electionState });
  });

  // 9. Reset All Data
  app.post('/api/reset-all', (req, res) => {
    const { mode } = req.body; // 'empty' or 'default'
    if (mode === 'empty') {
      electionState = {
        ...electionState,
        candidates: [],
        ballots: [],
        invalidVotes: 0,
        blankVotes: 0,
        lastUpdated: Date.now()
      };
    } else {
      electionState = getDefaultElectionState();
    }
    persistState();
    broadcastStateUpdate();
    res.json({ success: true, state: electionState });
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Election Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
