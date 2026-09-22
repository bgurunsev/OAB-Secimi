import * as XLSX from 'xlsx';
import { ElectionState, Candidate } from '../types';

export function exportElectionToExcel(state: ElectionState) {
  const wb = XLSX.utils.book_new();

  const totalBallots = state.ballots.length;
  const invalidVotes = state.invalidVotes || 0;
  const blankVotes = state.blankVotes || 0;
  const validBallots = totalBallots; // Sayılan pusulalar
  const totalEnvelopes = totalBallots + invalidVotes + blankVotes;
  const voterCount = state.voterCount || 0;
  const turnoutRate = voterCount > 0 ? ((totalEnvelopes / voterCount) * 100).toFixed(1) + '%' : '-';

  const boardCandidates = [...state.candidates.filter(c => c.type === 'board')]
    .sort((a, b) => b.votes - a.votes);

  const auditCandidates = [...state.candidates.filter(c => c.type === 'audit')]
    .sort((a, b) => b.votes - a.votes);

  const totalBoardVotes = boardCandidates.reduce((acc, c) => acc + c.votes, 0);
  const totalAuditVotes = auditCandidates.reduce((acc, c) => acc + c.votes, 0);

  // ==========================================
  // SHEET 1: GENEL SEÇİM ÖZETİ
  // ==========================================
  const summaryData = [
    ['OKUL AİLE BİRLİĞİ GENEL KURUL SEÇİMİ SONUÇ TUTANAĞI'],
    [''],
    ['Okul Adı:', state.schoolName || 'Okul Aile Birliği'],
    ['Seçim Başlığı:', state.title || 'Okul Aile Birliği Seçimi'],
    ['Tarih:', state.date || new Date().toLocaleDateString('tr-TR')],
    ['Rapor Oluşturma Saati:', new Date().toLocaleString('tr-TR')],
    [''],
    ['GENEL KATILIM VE PUSULA İSTATİSTİKLERİ', ''],
    ['Toplam Kayıtlı Seçmen Sayısı:', voterCount],
    ['Toplam Açılan Zarf / Kullanılan Oy:', totalEnvelopes],
    ['Geçerli Sayılan Pusula Sayısı:', validBallots],
    ['Boş Pusula Sayısı:', blankVotes],
    ['Geçersiz Pusula Sayısı:', invalidVotes],
    ['Seçime Katılım Oranı:', turnoutRate],
    [''],
    ['ADAY OYLARI TOPLAMI', ''],
    ['Yönetim Kurulu Adaylarına Verilen Toplam Oy:', totalBoardVotes],
    ['Denetim Kurulu Adaylarına Verilen Toplam Oy:', totalAuditVotes],
    ['Kayıtlı Toplam Aday Sayısı:', state.candidates.length]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 45 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Genel Özet');

  // ==========================================
  // SHEET 2: YÖNETİM KURULU SONUÇLARI
  // ==========================================
  const boardRows = [
    ['Sıra', 'Aday Adı Soyadı', 'Aldığı Oy', 'Oy Oranı (%)', 'Seçilme Durumu']
  ];

  boardCandidates.forEach((c, index) => {
    const rank = index + 1;
    let status = 'Aday';
    if (rank <= 5 && c.votes > 0) {
      status = 'ASİL ÜYE (KAZANDI)';
    } else if (rank <= 10 && c.votes > 0) {
      status = 'YEDEK ÜYE';
    }

    const pct = totalBallots > 0 ? ((c.votes / totalBallots) * 100).toFixed(1) + '%' : '0%';

    boardRows.push([
      rank.toString(),
      c.name,
      c.votes.toString(),
      pct,
      status
    ]);
  });

  const wsBoard = XLSX.utils.aoa_to_sheet(boardRows);
  wsBoard['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsBoard, 'Yönetim Kurulu');

  // ==========================================
  // SHEET 3: DENETİM KURULU SONUÇLARI
  // ==========================================
  const auditRows = [
    ['Sıra', 'Aday Adı Soyadı', 'Aldığı Oy', 'Oy Oranı (%)', 'Seçilme Durumu']
  ];

  auditCandidates.forEach((c, index) => {
    const rank = index + 1;
    let status = 'Aday';
    if (rank === 1 && c.votes > 0) {
      status = 'ASİL DENETÇİ (KAZANDI)';
    } else if (rank === 2 && c.votes > 0) {
      status = 'YEDEK DENETÇİ';
    }

    const pct = totalBallots > 0 ? ((c.votes / totalBallots) * 100).toFixed(1) + '%' : '0%';

    auditRows.push([
      rank.toString(),
      c.name,
      c.votes.toString(),
      pct,
      status
    ]);
  });

  const wsAudit = XLSX.utils.aoa_to_sheet(auditRows);
  wsAudit['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Denetim Kurulu');

  // ==========================================
  // SHEET 4: PUSULA SAYIM KAYITLARI (TUTANAK)
  // ==========================================
  const candidateMap = new Map<string, Candidate>();
  state.candidates.forEach(c => candidateMap.set(c.id, c));

  const ballotRows = [
    ['Pusula No', 'Kayıt Zamanı', 'İşaretlenen Aday Sayısı', 'Yazılan Adaylar']
  ];

  state.ballots.forEach((b) => {
    const timeStr = new Date(b.timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const candidateNames = b.selectedCandidateIds
      .map(id => candidateMap.get(id)?.name || id)
      .join(', ');

    ballotRows.push([
      `Pusula #${b.ballotNumber}`,
      timeStr,
      b.selectedCandidateIds.length.toString(),
      candidateNames
    ]);
  });

  const wsBallots = XLSX.utils.aoa_to_sheet(ballotRows);
  wsBallots['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsBallots, 'Pusula Kayıtları');

  // Generate and trigger download
  const dateSlug = (state.date || new Date().toISOString().slice(0, 10))
    .replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Okul_Aile_Birligi_Secim_Sonuclari_${dateSlug}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
