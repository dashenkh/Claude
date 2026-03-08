const { execSync } = require('child_process');

const BASE_URL = 'https://user.tender.gov.mn';
const API_ENDPOINT = '/mn/index/gettenderinvitationtable';

/**
 * Fetch JSON from a URL using curl (handles redirects reliably).
 */
function curlFetchJson(url, timeout = 15) {
  try {
    const result = execSync(
      `curl -s -L --max-time ${timeout} "${url}"`,
      { timeout: (timeout + 5) * 1000 }
    );
    return JSON.parse(result.toString());
  } catch (err) {
    console.error(`curlFetchJson error for ${url}:`, err.message);
    return null;
  }
}

/**
 * Fetch tenders from tender.gov.mn for a specific year.
 */
function fetchTendersByYear(year) {
  const url = `${BASE_URL}${API_ENDPOINT}?tenderYear=${year}`;
  const data = curlFetchJson(url);
  if (data && Array.isArray(data.invitationList)) {
    return data.invitationList;
  }
  return [];
}

/**
 * Fetch tenders from 2025 to present year.
 */
function fetchAllTenders() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = 2025; y <= currentYear; y++) {
    years.push(y);
  }

  const allTenders = [];
  for (const year of years) {
    try {
      const tenders = fetchTendersByYear(year);
      console.log(`Year ${year}: fetched ${tenders.length} tenders`);
      allTenders.push(...tenders);
    } catch (err) {
      console.error(`Year ${year}: failed - ${err.message}`);
    }
  }

  // Also fetch without year filter to get all recent tenders
  try {
    const defaultTenders = fetchTendersByYear('');
    if (defaultTenders.length > 0) {
      console.log(`Default (no year filter): fetched ${defaultTenders.length} tenders`);
      allTenders.push(...defaultTenders);
    }
  } catch (err) {
    console.error('Default fetch failed:', err.message);
  }

  // Normalize and deduplicate
  const seen = new Set();
  const normalized = [];
  for (const t of allTenders) {
    const key = String(t.invitationId);
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      id: t.invitationId,
      invitationNumber: t.invitationNumber || '',
      tenderCode: t.tenderCode || '',
      tenderName: t.tenderName || '',
      tenderYear: t.tenderYear,
      totalBudget: t.totalBudget || 0,
      yearBudget: t.yearBudget || 0,
      guaranteeAmount: t.guaranteeAmount || 0,
      fundName: t.fundName || '',
      ruleName: t.ruleName || '',
      tenderTypeName: t.tenderTypeName || '',
      clientName: t.clientName || '',
      positionName: t.positionName || '',
      statusName: t.wfmStatusName || '',
      openDate: t.openDate || '',
      receivedDate: t.receivedDate || '',
      confirmDate: t.confirmDate || '',
      remainDays: t.remainDay || 0,
      isElectronic: t.isElectronic || false,
      isSimpleElectronic: t.isSimpleElectronic || false,
      isForeignerAvailable: t.isForeignerAvailable || false,
      detailUrl: `${BASE_URL}/mn/invitation/detail/${t.invitationId}`,
      fetchedAt: new Date().toISOString(),
    });
  }

  // Sort by confirmDate descending (newest first), fallback to openDate
  normalized.sort((a, b) => {
    const da = a.confirmDate || a.openDate || '';
    const db = b.confirmDate || b.openDate || '';
    return db.localeCompare(da);
  });

  console.log(`Total unique tenders: ${normalized.length}`);
  return normalized;
}

module.exports = { fetchAllTenders, fetchTendersByYear };
