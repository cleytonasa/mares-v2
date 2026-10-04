import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { PDFParse } from 'pdf-parse';

const INTERSAL_PDF_URL = 'https://intersal.com.br/assets/arquivos/programacao-navios.pdf';
const LAST_SYNC_FILE = path.resolve('scripts/last_sync.json');
const TARGET_TS_FILE = path.resolve('src/data/saltShipmentsData.ts');
const PUBLIC_PDF_FILE = path.resolve('public/programacao-navios.pdf');

const MONTH_NAMES = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro'
};

const SHORT_MONTHS = {
  1: 'Jan',
  2: 'Fev',
  3: 'Mar',
  4: 'Abr',
  5: 'Mai',
  6: 'Jun',
  7: 'Jul',
  8: 'Ago',
  9: 'Set',
  10: 'Out',
  11: 'Nov',
  12: 'Dez'
};

/**
 * Fetch HTTP headers following redirects with insecure SSL allowed
 */
function fetchHeaders(targetUrl) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(
      urlObj,
      {
        method: 'HEAD',
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IntersalMonitor/1.0'
        }
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).href;
          resolve(fetchHeaders(redirectUrl));
          return;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          finalUrl: targetUrl
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout fetching headers'));
    });
    req.end();
  });
}

/**
 * Download file buffer following redirects with insecure SSL allowed
 */
function downloadFile(targetUrl) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(
      urlObj,
      {
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) IntersalMonitor/1.0'
        }
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).href;
          resolve(downloadFile(redirectUrl));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download: status ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout downloading file'));
    });
    req.end();
  });
}

/**
 * Parse vessel table and generate complete dataset
 */
async function parseIntersalPdf(pdfBuffer) {
  const tempPdfPath = path.resolve('/tmp/intersal-sync-temp.pdf');
  fs.writeFileSync(tempPdfPath, pdfBuffer);

  const parser = new PDFParse({ url: tempPdfPath });
  const res = await parser.getText();

  const allText = res.pages.map((p) => p.text).join('\n');
  const updateMatch = allText.match(/Atualizado em:\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
  const lineupLastUpdated = updateMatch ? updateMatch[1] : new Date().toLocaleDateString('pt-BR');

  function detectMonthFromLines(vLines) {
    const monthCounts = {};
    for (const line of vLines) {
      const dates = [...line.matchAll(/\b\d{2}\/(\d{2})\/20\d{2,3}\b/g)];
      for (const d of dates) {
        const m = parseInt(d[1], 10);
        if (m >= 1 && m <= 12) {
          monthCounts[m] = (monthCounts[m] || 0) + 1;
        }
      }
    }
    let bestMonth = 10;
    let maxCount = -1;
    for (const [m, count] of Object.entries(monthCounts)) {
      if (count > maxCount) {
        maxCount = count;
        bestMonth = parseInt(m, 10);
      }
    }
    return bestMonth;
  }

  const parsedVessels = [];

  for (let p = 0; p < res.pages.length; p++) {
    const lines = res.pages[p].text.split('\n');
    let currentVesselLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^(SLN|SDB)\d{7}/)) {
        currentVesselLines.push(line);
      } else if (line.match(/^TOTAL\s+\d+(\.\d+)?/i) || line.match(/^\d+(\.\d+)?Atualizado em/i)) {
        if (currentVesselLines.length > 0) {
          const m = detectMonthFromLines(currentVesselLines);
          for (const vLine of currentVesselLines) {
            parsedVessels.push({ line: vLine, month: m });
          }
          currentVesselLines = [];
        }
      }
    }
    if (currentVesselLines.length > 0) {
      const m = detectMonthFromLines(currentVesselLines);
      for (const vLine of currentVesselLines) {
        parsedVessels.push({ line: vLine, month: m });
      }
    }
  }

  // Parse each vessel record
  const records = [];

  for (const item of parsedVessels) {
    const line = item.line;
    const month = item.month;
    const dateMatches = [...line.matchAll(/\b\d{2}\/\d{2}\/\d{4,5}\s+\d{2}:\d{2}\b/g)];
    const visitCode = line.slice(0, 10).trim();

    let vesselName = '';
    let loaMeters = 0;
    let dwt = 0;
    let eta = '';
    let etb = '';
    let etd = '';
    let status = 'Previsto';
    let scVolumeTons = 0;
    let sqVolumeTons = 0;
    let totalVolumeTons = 0;
    let trafficType = 'CBT';
    let shipper = 'SALINOR';

    if (dateMatches.length >= 2) {
      const firstDateIdx = line.indexOf(dateMatches[0][0]);
      const preDates = line.slice(10, firstDateIdx).trim();
      const tokens = preDates.split(/\s+/);

      const lastToken = tokens[tokens.length - 1];
      const secondLast = tokens[tokens.length - 2];

      if (
        tokens.length >= 3 &&
        lastToken &&
        secondLast &&
        secondLast.includes(',') &&
        !isNaN(parseFloat(secondLast.replace(',', '.')))
      ) {
        loaMeters = parseFloat(secondLast.replace(',', '.'));
        dwt = parseInt(lastToken.replace(/\./g, ''), 10);
        vesselName = tokens.slice(0, tokens.length - 2).join(' ');
      } else {
        vesselName = preDates;
      }

      eta = dateMatches[0][0].replace(/\/20\d{2,3}\b/, '/2026');
      etb = dateMatches.length >= 2 ? dateMatches[1][0].replace(/\/20\d{2,3}\b/, '/2026') : '';
      etd = dateMatches.length >= 3 ? dateMatches[2][0].replace(/\/20\d{2,3}\b/, '/2026') : '';

      const lastDate = dateMatches[dateMatches.length - 1];
      const postDates = line.slice(line.indexOf(lastDate[0]) + lastDate[0].length).trim();

      let afterStatus = postDates;
      if (postDates.startsWith('Em operação') || postDates.startsWith('Em operacao')) {
        status = 'Em operação';
        afterStatus = postDates.replace(/^Em opera[çc][ãa]o\s*/, '');
      } else if (postDates.startsWith('Concluído') || postDates.startsWith('Concluido')) {
        status = 'Concluído';
        afterStatus = postDates.replace(/^Conclu[íi]do\s*/, '');
      } else if (postDates.startsWith('Previsto')) {
        status = 'Previsto';
        afterStatus = postDates.replace(/^Previsto\s*/, '');
      }

      const postTokens = afterStatus.split(/\s+/);
      const numTokens = [];
      const wordTokens = [];
      for (const t of postTokens) {
        if (/^\d+(\.\d+)?$/.test(t)) {
          numTokens.push(parseFloat(t.replace(/\./g, '')));
        } else {
          wordTokens.push(t);
        }
      }

      if (numTokens.length === 1) {
        scVolumeTons = numTokens[0];
        sqVolumeTons = 0;
        totalVolumeTons = numTokens[0];
      } else if (numTokens.length === 2) {
        scVolumeTons = numTokens[0];
        sqVolumeTons = 0;
        totalVolumeTons = numTokens[1];
      } else if (numTokens.length >= 3) {
        scVolumeTons = numTokens[0];
        sqVolumeTons = numTokens[1];
        totalVolumeTons = numTokens[2];
      }

      for (const w of wordTokens) {
        if (w === 'EXP') trafficType = 'EXP';
        else if (w === 'CBT') trafficType = 'CBT';
        else if (w === 'SLN') shipper = 'SALINOR';
        else if (w === 'SDB') shipper = 'SDB';
        else if (w === 'SEA' || w === 'SALT') shipper = 'SEA SALT';
      }

      if (visitCode.startsWith('SDB')) shipper = 'SDB';

      records.push({
        id: visitCode.toLowerCase(),
        visitCode,
        vesselName: vesselName || 'TBN',
        loaMeters,
        dwt,
        eta,
        etb,
        etd,
        status,
        scVolumeTons,
        sqVolumeTons,
        totalVolumeTons,
        trafficType,
        trafficLabel: trafficType === 'EXP' ? 'Exportação' : 'Cabotagem',
        shipper,
        month,
        monthName: MONTH_NAMES[month] || 'Outubro',
        year: 2026
      });
    }
  }

  // Sort chronologically by month (1 to 12) and visit code
  records.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    return a.visitCode.localeCompare(b.visitCode);
  });

  // Calculate monthly summaries
  const monthlySummaries = [];
  const uniqueMonths = [...new Set(records.map((r) => r.month))].sort((a, b) => a - b);

  for (const m of uniqueMonths) {
    const monthVessels = records.filter((r) => r.month === m);
    const concluded = monthVessels.filter((r) => r.status === 'Concluído');
    const operating = monthVessels.filter((r) => r.status === 'Em operação');
    const planned = monthVessels.filter((r) => r.status === 'Previsto');

    const scTotal = monthVessels.reduce((sum, r) => sum + r.scVolumeTons, 0);
    const sqTotal = monthVessels.reduce((sum, r) => sum + r.sqVolumeTons, 0);
    const totalVolume = monthVessels.reduce((sum, r) => sum + r.totalVolumeTons, 0);

    const salinorVolume = monthVessels
      .filter((r) => r.shipper === 'SALINOR')
      .reduce((sum, r) => sum + r.totalVolumeTons, 0);
    const sdbVolume = monthVessels
      .filter((r) => r.shipper === 'SDB')
      .reduce((sum, r) => sum + r.totalVolumeTons, 0);

    const expVolume = monthVessels
      .filter((r) => r.trafficType === 'EXP')
      .reduce((sum, r) => sum + r.totalVolumeTons, 0);
    const cbtVolume = monthVessels
      .filter((r) => r.trafficType === 'CBT')
      .reduce((sum, r) => sum + r.totalVolumeTons, 0);

    const concludedTotalVolume = concluded.reduce((sum, r) => sum + r.totalVolumeTons, 0);
    const concludedScTotal = concluded.reduce((sum, r) => sum + r.scVolumeTons, 0);
    const concludedSqTotal = concluded.reduce((sum, r) => sum + r.sqVolumeTons, 0);

    const salinorConcludedVolume = concluded
      .filter((r) => r.shipper === 'SALINOR')
      .reduce((sum, r) => sum + r.totalVolumeTons, 0);
    const sdbConcludedVolume = concluded
      .filter((r) => r.shipper === 'SDB')
      .reduce((sum, r) => sum + r.totalVolumeTons, 0);

    const expConcludedVolume = concluded
      .filter((r) => r.trafficType === 'EXP')
      .reduce((sum, r) => sum + r.totalVolumeTons, 0);
    const cbtConcludedVolume = concluded
      .filter((r) => r.trafficType === 'CBT')
      .reduce((sum, r) => sum + r.totalVolumeTons, 0);

    monthlySummaries.push({
      month: m,
      monthName: MONTH_NAMES[m],
      shortMonth: SHORT_MONTHS[m],
      year: 2026,
      vesselCount: monthVessels.length,
      concludedCount: concluded.length,
      operatingCount: operating.length,
      plannedCount: planned.length,
      concludedTotalVolume,
      concludedScTotal,
      concludedSqTotal,
      scTotal,
      sqTotal,
      totalVolume,
      salinorVolume,
      sdbVolume,
      salinorConcludedVolume,
      sdbConcludedVolume,
      expVolume,
      cbtVolume,
      expConcludedVolume,
      cbtConcludedVolume
    });
  }

  // Calculate overall totals
  const allConcluded = records.filter((r) => r.status === 'Concluído');
  const allOperating = records.filter((r) => r.status === 'Em operação');
  const allPlanned = records.filter((r) => r.status === 'Previsto');

  const concludedTotalTons = allConcluded.reduce((sum, r) => sum + r.totalVolumeTons, 0);
  const concludedScTotalTons = allConcluded.reduce((sum, r) => sum + r.scVolumeTons, 0);
  const concludedSqTotalTons = allConcluded.reduce((sum, r) => sum + r.sqVolumeTons, 0);
  const concludedSalinorTons = allConcluded
    .filter((r) => r.shipper === 'SALINOR')
    .reduce((sum, r) => sum + r.totalVolumeTons, 0);
  const concludedSdbTons = allConcluded
    .filter((r) => r.shipper === 'SDB')
    .reduce((sum, r) => sum + r.totalVolumeTons, 0);
  const concludedExpTons = allConcluded
    .filter((r) => r.trafficType === 'EXP')
    .reduce((sum, r) => sum + r.totalVolumeTons, 0);
  const concludedCbtTons = allConcluded
    .filter((r) => r.trafficType === 'CBT')
    .reduce((sum, r) => sum + r.totalVolumeTons, 0);

  const operatingTotalTons = allOperating.reduce((sum, r) => sum + r.totalVolumeTons, 0);
  const plannedTotalTons = allPlanned.reduce((sum, r) => sum + r.totalVolumeTons, 0);
  const totalProgrammedTons = records.reduce((sum, r) => sum + r.totalVolumeTons, 0);

  const concludedMonthsCount = uniqueMonths.filter(
    (m) => records.some((r) => r.month === m && r.status === 'Concluído')
  ).length;

  const monthlyAverageTons = concludedMonthsCount > 0 ? Math.round(concludedTotalTons / concludedMonthsCount) : 0;
  const vesselAverageTons = allConcluded.length > 0 ? Math.round(concludedTotalTons / allConcluded.length) : 0;

  const overallTotals = {
    concludedTotalTons,
    concludedScTotalTons,
    concludedSqTotalTons,
    concludedVessels: allConcluded.length,
    concludedSalinorTons,
    concludedSdbTons,
    concludedExpTons,
    concludedCbtTons,
    totalTons: concludedTotalTons,
    scTotalTons: concludedScTotalTons,
    sqTotalTons: concludedSqTotalTons,
    totalVessels: allConcluded.length,
    salinorTotalTons: concludedSalinorTons,
    sdbTotalTons: concludedSdbTons,
    expTotalTons: concludedExpTons,
    cbtTotalTons: concludedCbtTons,
    monthlyAverageTons,
    vesselAverageTons,
    operatingTotalTons,
    operatingVessels: allOperating.length,
    plannedTotalTons,
    plannedVessels: allPlanned.length,
    totalProgrammedTons
  };

  return {
    lineupLastUpdated,
    records,
    monthlySummaries,
    overallTotals
  };
}

/**
 * Format TypeScript output code
 */
function generateTypeScriptCode({ lineupLastUpdated, records, monthlySummaries, overallTotals }) {
  return `// Oficial Line-Up & Histórico de Embarque de Sal a Granel - INTERSAL (TERMISA)
// Período: Janeiro a Outubro de 2026
// Atualizado em: ${lineupLastUpdated}
// Gerado automaticamente via sincronizador Intersal

export interface SaltVesselRecord {
  id: string;
  visitCode: string;
  vesselName: string;
  loaMeters: number;
  dwt: number;
  eta: string;
  etb: string;
  etd: string;
  status: 'Concluído' | 'Em operação' | 'Previsto';
  scVolumeTons: number; // Sal Comum (SC)
  sqVolumeTons: number; // Sal Químico (SQ)
  totalVolumeTons: number;
  trafficType: 'EXP' | 'CBT'; // Exportação vs Cabotagem
  trafficLabel: string;
  shipper: 'SALINOR' | 'SDB' | 'SEA SALT';
  month: number; // 1 to 12
  monthName: string;
  year: number;
}

export interface MonthlySaltSummary {
  month: number;
  monthName: string;
  shortMonth: string;
  year: number;
  vesselCount: number;
  concludedCount?: number;
  operatingCount?: number;
  plannedCount?: number;
  concludedTotalVolume: number;
  concludedScTotal: number;
  concludedSqTotal: number;
  scTotal: number;
  sqTotal: number;
  totalVolume: number;
  salinorVolume: number;
  sdbVolume: number;
  salinorConcludedVolume?: number;
  sdbConcludedVolume?: number;
  expVolume: number;
  cbtVolume: number;
  expConcludedVolume?: number;
  cbtConcludedVolume?: number;
}

export const SALT_SHIPMENTS_2026: SaltVesselRecord[] = ${JSON.stringify(records, null, 2)};

export const MONTHLY_SALT_SUMMARIES: MonthlySaltSummary[] = ${JSON.stringify(monthlySummaries, null, 2)};

export const LINEUP_LAST_UPDATED = '${lineupLastUpdated}';

export const OVERALL_TOTALS = ${JSON.stringify(overallTotals, null, 2)};
`;
}

/**
 * Main execution
 */
async function main() {
  const force = process.argv.includes('--force');
  console.log(`[Intersal Sync] Verificando cabeçalhos em ${INTERSAL_PDF_URL}...`);

  let headerInfo;
  try {
    headerInfo = await fetchHeaders(INTERSAL_PDF_URL);
  } catch (err) {
    console.error(`[Intersal Sync] Erro ao consultar cabeçalhos:`, err.message);
    if (!force) process.exit(1);
  }

  const lastModified = headerInfo?.headers['last-modified'] || '';
  const etag = headerInfo?.headers['etag'] || '';
  const contentLength = headerInfo?.headers['content-length'] || '';

  console.log(`[Intersal Sync] Metadados do servidor:`, { lastModified, etag, contentLength });

  let lastSync = null;
  if (fs.existsSync(LAST_SYNC_FILE)) {
    try {
      lastSync = JSON.parse(fs.readFileSync(LAST_SYNC_FILE, 'utf-8'));
    } catch {
      lastSync = null;
    }
  }

  const isChanged = !lastSync || lastSync.etag !== etag || lastSync.lastModified !== lastModified;

  if (!isChanged && !force) {
    console.log(`[Intersal Sync] Nenhuma alteração detectada no portal Intersal. O line-up local já está atualizado.`);
    process.exit(0);
  }

  console.log(`[Intersal Sync] Nova versão detectada ou execução forçada. Baixando PDF...`);
  const pdfBuffer = await downloadFile(INTERSAL_PDF_URL);
  console.log(`[Intersal Sync] PDF baixado com sucesso (${pdfBuffer.length} bytes).`);

  // Save public copy
  try {
    fs.mkdirSync(path.dirname(PUBLIC_PDF_FILE), { recursive: true });
    fs.writeFileSync(PUBLIC_PDF_FILE, pdfBuffer);
    console.log(`[Intersal Sync] Cópia pública salva em ${PUBLIC_PDF_FILE}`);
  } catch (err) {
    console.warn(`[Intersal Sync] Aviso ao salvar cópia pública:`, err.message);
  }

  console.log(`[Intersal Sync] Extraindo e processando dados do PDF...`);
  const parsedData = await parseIntersalPdf(pdfBuffer);

  console.log(`[Intersal Sync] Extração concluída:`, {
    atualizadoEm: parsedData.lineupLastUpdated,
    totalNavios: parsedData.records.length,
    volumeTotal: parsedData.overallTotals.totalProgrammedTons
  });

  const tsCode = generateTypeScriptCode(parsedData);
  fs.writeFileSync(TARGET_TS_FILE, tsCode, 'utf-8');
  console.log(`[Intersal Sync] Arquivo atualizado: ${TARGET_TS_FILE}`);

  // Save sync state
  const syncState = {
    lastSyncTime: new Date().toISOString(),
    lastModified,
    etag,
    contentLength,
    lineupLastUpdated: parsedData.lineupLastUpdated,
    totalVessels: parsedData.records.length,
    totalProgrammedTons: parsedData.overallTotals.totalProgrammedTons
  };
  fs.mkdirSync(path.dirname(LAST_SYNC_FILE), { recursive: true });
  fs.writeFileSync(LAST_SYNC_FILE, JSON.stringify(syncState, null, 2), 'utf-8');
  console.log(`[Intersal Sync] Estado de sincronização salvo em ${LAST_SYNC_FILE}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[Intersal Sync] Erro fatal:`, err);
  process.exit(1);
});
