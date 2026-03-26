import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next';
import YahooFinance from 'yahoo-finance2';

import dbConnect from '@/lib/dbConnect';
import RiskAlert from '@/models/RiskAlert';
import {authOptions} from '@/lib/auth';

// ─── Country ISO2 mapping ────────────────────────────────────────────────────
const COUNTRY_ISO: Record<string, string> = {
  Afghanistan: 'AF', Albania: 'AL', Algeria: 'DZ', Argentina: 'AR',
  Australia: 'AU', Austria: 'AT', Bangladesh: 'BD', Belarus: 'BY',
  Belgium: 'BE', Bolivia: 'BO', Brazil: 'BR', Bulgaria: 'BG',
  Cambodia: 'KH', Canada: 'CA', Chile: 'CL', China: 'CN',
  Colombia: 'CO', 'Costa Rica': 'CR', Croatia: 'HR', 'Czech Republic': 'CZ',
  Denmark: 'DK', Ecuador: 'EC', Egypt: 'EG', Ethiopia: 'ET',
  Finland: 'FI', France: 'FR', Germany: 'DE', Ghana: 'GH',
  Greece: 'GR', Guatemala: 'GT', Honduras: 'HN', Hungary: 'HU',
  India: 'IN', Indonesia: 'ID', Iran: 'IR', Iraq: 'IQ',
  Ireland: 'IE', Israel: 'IL', Italy: 'IT', Japan: 'JP',
  Jordan: 'JO', Kazakhstan: 'KZ', Kenya: 'KE', Kuwait: 'KW',
  Libya: 'LY', Malaysia: 'MY', Mexico: 'MX', Morocco: 'MA',
  Myanmar: 'MM', Netherlands: 'NL', 'New Zealand': 'NZ', Nigeria: 'NG',
  'North Korea': 'KP', Norway: 'NO', Pakistan: 'PK', Peru: 'PE',
  Philippines: 'PH', Poland: 'PL', Portugal: 'PT', Qatar: 'QA',
  Romania: 'RO', Russia: 'RU', 'Saudi Arabia': 'SA', Singapore: 'SG',
  'South Africa': 'ZA', 'South Korea': 'KR', Spain: 'ES', Sweden: 'SE',
  Switzerland: 'CH', Syria: 'SY', Taiwan: 'TW', Thailand: 'TH',
  Turkey: 'TR', UAE: 'AE', 'United Arab Emirates': 'AE',
  Ukraine: 'UA', 'United Kingdom': 'GB', UK: 'GB',
  USA: 'US', 'United States': 'US', Uruguay: 'UY',
  Venezuela: 'VE', Vietnam: 'VN', Zimbabwe: 'ZW',
};

// World Bank indicators: id → { label, higherIsBetter }
const WB_INDICATORS = [
  {id: 'NY.GDP.MKTP.KD.ZG', label: 'GDP Growth (%)', higherIsBetter: true},
  {id: 'FP.CPI.TOTL.ZG', label: 'Inflation (%)', higherIsBetter: false},
  {id: 'SL.UEM.TOTL.ZS', label: 'Unemployment (%)', higherIsBetter: false},
  {id: 'GC.DOD.TOTL.GD.ZS', label: 'Govt Debt (% GDP)', higherIsBetter: false},
  {id: 'NY.GDP.PCAP.CD', label: 'GDP per Capita (USD)', higherIsBetter: true},
  {id: 'IC.LGL.CRED.XQ', label: 'Strength of Legal Rights (0-12)', higherIsBetter: true},
  {id: 'CC.EST', label: 'Control of Corruption (−2.5 to +2.5)', higherIsBetter: true},
  {id: 'RL.EST', label: 'Rule of Law (−2.5 to +2.5)', higherIsBetter: true},
  {id: 'PV.EST', label: 'Political Stability (−2.5 to +2.5)', higherIsBetter: true},
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, timeoutMs = 9000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {signal: controller.signal, headers: {'User-Agent': 'SupplierRiskPlatform/1.0'}});
  } finally {
    clearTimeout(id);
  }
}

// ─── Source 1: World Bank Country Risk ───────────────────────────────────────
async function getWorldBankData(country: string) {
  const iso = COUNTRY_ISO[country];
  if (!iso) return {isoCode: null, indicators: [], error: 'Unknown country code'};

  const results = await Promise.all(
    WB_INDICATORS.map(async ({id, label, higherIsBetter}) => {
      try {
        const url = `https://api.worldbank.org/v2/country/${iso}/indicator/${id}?format=json&mrv=5&per_page=5`;
        const res = await fetchWithTimeout(url, 7000);
        if (!res.ok) return null;
        const json = await res.json();
        const data = (json[1] as Array<{value: number | null; date: string}>)?.filter(d => d.value !== null);
        if (!data?.length) return null;
        const latest = data[0];
        const prev = data[1];
        return {
          indicator: id,
          label,
          value: latest.value,
          year: latest.date,
          trend: prev ? (latest.value! > prev.value! ? 'up' : latest.value! < prev.value! ? 'down' : 'stable') : 'stable',
          higherIsBetter,
          riskFlag:
            (higherIsBetter && latest.value! < 0) ||
            (!higherIsBetter && latest.value! > 15) ||
            (id === 'CC.EST' && latest.value! < -0.5) ||
            (id === 'RL.EST' && latest.value! < -0.5) ||
            (id === 'PV.EST' && latest.value! < -0.5),
        };
      } catch {
        return null;
      }
    }),
  );
  return {isoCode: iso, indicators: results.filter(Boolean), error: null};
}

// ─── Source 2: REST Countries ─────────────────────────────────────────────────
async function getCountryContext(country: string) {
  try {
    const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=name,region,subregion,population,area,currencies,languages,flags,landlocked,borders,timezones`;
    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return null;
    const json = await res.json();
    const c = json[0];
    if (!c) return null;
    return {
      officialName: c.name?.official,
      region: c.region,
      subregion: c.subregion,
      population: c.population,
      area: c.area,
      currencies: Object.keys(c.currencies || {}),
      languages: Object.values(c.languages || {}),
      flagUrl: c.flags?.svg,
      landlocked: c.landlocked,
      borderCount: c.borders?.length ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Source 3: GDELT Global News Monitor ─────────────────────────────────────
async function getGdeltNews(name: string, country: string) {
  try {
    // Build a targeted query
    const q = encodeURIComponent(`"${name}" OR "${name.split(/\s+/)[0]}" ${country}`);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=15&format=json&timespan=MONTH&sort=DateDesc`;
    const res = await fetchWithTimeout(url, 10000);
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.articles || []).map((a: any) => ({
      title: a.title,
      url: a.url,
      domain: a.domain,
      date: a.seendate,
      language: a.language,
      sourceCountry: a.sourcecountry,
      tone: typeof a.tone === 'number' ? a.tone : null, // negative = bad
      sentiment: typeof a.tone === 'number' ? (a.tone < -5 ? 'negative' : a.tone > 2 ? 'positive' : 'neutral') : 'unknown',
    }));
  } catch {
    return [];
  }
}

// ─── Source 4: OpenCorporates Company Registry ───────────────────────────────
async function getOpenCorporates(name: string, country: string) {
  try {
    const iso = (COUNTRY_ISO[country] || '').toLowerCase();
    const q = encodeURIComponent(name);
    const jurisdictionParam = iso ? `&jurisdiction_code=${iso}` : '';
    const url = `https://api.opencorporates.com/v0.4/companies/search?q=${q}${jurisdictionParam}&format=json&per_page=5`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.results?.companies || []).slice(0, 5).map((item: any) => {
      const c = item.company;
      return {
        name: c.name,
        jurisdiction: c.jurisdiction_code,
        status: c.current_status,
        incorporationDate: c.incorporation_date,
        dissolutionDate: c.dissolution_date,
        registrationNumber: c.company_number,
        profileUrl: c.opencorporates_url,
        inactive: c.inactive,
      };
    });
  } catch {
    return [];
  }
}

// ─── Source 5: SEC EDGAR Filings ─────────────────────────────────────────────
async function getSecFilings(name: string) {
  try {
    const q = encodeURIComponent(`"${name}"`);
    const today = new Date().toISOString().split('T')[0];
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const url = `https://efts.sec.gov/LATEST/search-index?q=${q}&forms=10-K,10-Q,8-K,DEF+14A&dateRange=custom&startdt=${oneYearAgo}&enddt=${today}&hits.hits._source=period_of_report,entity_name,form_type,file_date,display_names`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.hits?.hits || []).slice(0, 8).map((h: any) => ({
      company: h._source?.entity_name || h._source?.display_names?.[0],
      form: h._source?.form_type,
      fileDate: h._source?.file_date,
      period: h._source?.period_of_report,
      edgarUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(name)}&type=${h._source?.form_type}&dateb=&owner=include&count=10`,
      isAdverseEvent: h._source?.form_type === '8-K',
    }));
  } catch {
    return [];
  }
}

// ─── Source 6: Yahoo Finance (public companies) ───────────────────────────────
async function getYahooFinance(name: string) {
  try {
    const yf = new YahooFinance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchRes = await (yf as any).search(name, {}, {validateResult: false});
    const quotes = searchRes?.quotes || [];
    // Find first equity result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const equity = quotes.find((q: any) => q.quoteType === 'EQUITY');
    if (!equity?.symbol) return null;

    // Soft match: first word of company name must partially match
    const symbolName = (equity.longname || equity.shortname || '').toLowerCase();
    const firstWord = name.split(/\s+/)[0].toLowerCase();
    if (!symbolName.includes(firstWord) && !firstWord.includes(symbolName.split(/\s+/)[0])) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary = await (yf as any).quoteSummary(
      equity.symbol,
      {modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'assetProfile']},
      {validateResult: false},
    );

    return {
      symbol: equity.symbol,
      name: equity.longname || equity.shortname,
      exchange: equity.exchange,
      price: summary?.price?.regularMarketPrice,
      priceChange1d: summary?.price?.regularMarketChangePercent,
      marketCap: summary?.price?.marketCap,
      currency: summary?.price?.currency,
      fiftyTwoWeekLow: summary?.summaryDetail?.fiftyTwoWeekLow,
      fiftyTwoWeekHigh: summary?.summaryDetail?.fiftyTwoWeekHigh,
      revenueGrowth: summary?.financialData?.revenueGrowth,
      grossMargins: summary?.financialData?.grossMargins,
      operatingMargins: summary?.financialData?.operatingMargins,
      debtToEquity: summary?.financialData?.debtToEquity,
      currentRatio: summary?.financialData?.currentRatio,
      quickRatio: summary?.financialData?.quickRatio,
      recommendationMean: summary?.financialData?.recommendationMean,
      recommendationKey: summary?.financialData?.recommendationKey,
      totalCash: summary?.financialData?.totalCash,
      totalDebt: summary?.financialData?.totalDebt,
      freeCashflow: summary?.financialData?.freeCashflow,
      trailingPE: summary?.summaryDetail?.trailingPE,
      forwardPE: summary?.summaryDetail?.forwardPE,
      industry: summary?.assetProfile?.industry,
      sector: summary?.assetProfile?.sector,
      fullTimeEmployees: summary?.assetProfile?.fullTimeEmployees,
      website: summary?.assetProfile?.website,
      longBusinessSummary: summary?.assetProfile?.longBusinessSummary?.substring(0, 400),
    };
  } catch {
    return null;
  }
}

// ─── Source 7: News API (requires free key) ───────────────────────────────────
async function getNewsApi(name: string, country: string) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];
  try {
    const q = encodeURIComponent(`"${name}" OR "${name.split(/\s+/)[0]}" ${country}`);
    const url = `https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&pageSize=8&language=en&apiKey=${apiKey}`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status !== 'ok') return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.articles || []).map((a: any) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      source: a.source?.name,
      date: a.publishedAt,
      imageUrl: a.urlToImage,
    }));
  } catch {
    return [];
  }
}

// ─── Source 8: OpenSanctions Entity Screening ─────────────────────────────────
async function getOpenSanctions(name: string, country: string) {
  const apiKey = process.env.OPENSANCTIONS_API_KEY;
  if (!apiKey) return {available: false, matches: []};
  try {
    const iso = COUNTRY_ISO[country] || '';
    const q = encodeURIComponent(name);
    const countryParam = iso ? `&countries=${iso.toLowerCase()}` : '';
    const res = await fetchWithTimeout(
      `https://api.opensanctions.org/search/default?q=${q}&schema=Company${countryParam}&limit=5&api_key=${apiKey}`,
      8000,
    );
    if (!res.ok) return {available: false, matches: []};
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = json.responses?.supplier?.results || [];
    return {
      available: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matches: results.slice(0, 5).map((e: any) => ({
        id: e.id,
        caption: e.caption,
        schema: e.schema,
        score: e.score,
        match: e.match,
        datasets: e.datasets,
        sanctionedBy: e.properties?.program,
        country: e.properties?.country,
      })),
    };
  } catch {
    return {available: false, matches: []};
  }
}

// ─── Source 9: Alpha Vantage Financial News Sentiment ────────────────────────
async function getAlphaVantageNewsSentiment(name: string) {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) return [];
  try {
    const q = encodeURIComponent(name);
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&q=${q}&limit=10&sort=LATEST&apikey=${apiKey}`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.feed) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return json.feed.slice(0, 8).map((item: any) => ({
      title: item.title,
      url: item.url,
      source: item.source,
      date: item.time_published,
      overallSentiment: item.overall_sentiment_label,
      overallSentimentScore: item.overall_sentiment_score,
      summary: item.summary?.substring(0, 200),
    }));
  } catch {
    return [];
  }
}

// ─── Source 10: ExchangeRate-API (currency risk) ──────────────────────────────
async function getCurrencyRisk(country: string) {
  try {
    // Map country → currency ISO
    const CURRENCY_MAP: Record<string, string> = {
      China: 'CNY', India: 'INR', Germany: 'EUR', Japan: 'JPY',
      UK: 'GBP', 'United Kingdom': 'GBP', France: 'EUR', Brazil: 'BRL',
      Canada: 'CAD', Australia: 'AUD', Mexico: 'MXN', 'South Korea': 'KRW',
      Indonesia: 'IDR', Turkey: 'TRY', 'Saudi Arabia': 'SAR', Vietnam: 'VND',
      Thailand: 'THB', Singapore: 'SGD', Malaysia: 'MYR', Philippines: 'PHP',
      'South Africa': 'ZAR', Nigeria: 'NGN', Egypt: 'EGP', Argentina: 'ARS',
      Colombia: 'COP', Chile: 'CLP', Pakistan: 'PKR', Bangladesh: 'BDT',
      Poland: 'PLN', Sweden: 'SEK', Norway: 'NOK', Denmark: 'DKK',
      Switzerland: 'CHF', Russia: 'RUB', Ukraine: 'UAH', Israel: 'ILS',
      UAE: 'AED', 'United Arab Emirates': 'AED', Qatar: 'QAR', Kuwait: 'KWD',
      Morocco: 'MAD', Kenya: 'KES', Myanmar: 'MMK', Belarus: 'BYN',
      Iran: 'IRR', Venezuela: 'VES',
    };
    const currency = CURRENCY_MAP[country] || 'USD';
    if (currency === 'USD') return {currency: 'USD', rate: 1, note: 'Base currency'};

    const res = await fetchWithTimeout(`https://open.er-api.com/v6/latest/USD`, 6000);
    if (!res.ok) return null;
    const json = await res.json();
    const rate = json.rates?.[currency];
    return rate ? {currency, ratePerUSD: rate, lastUpdated: json.time_last_update_utc} : null;
  } catch {
    return null;
  }
}

// ─── Auto-alert creation ──────────────────────────────────────────────────────
async function maybeCreateAlerts(
  userEmail: string,
  supplierId: string,
  supplierName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
) {
  const alertsToCreate: object[] = [];

  // Sanctions hit
  if (data.sanctions?.available && data.sanctions.matches?.some((m: any) => m.match)) {
    alertsToCreate.push({
      userEmail, supplierId, supplierName,
      severity: 'Critical', category: 'Compliance',
      title: 'Sanctions Match Detected',
      description: `OpenSanctions match found for ${supplierName}. Immediate compliance review required.`,
      source: 'OpenSanctions API',
    });
  }

  // Highly negative GDELT news
  const negativeArticles = (data.gdeltNews || []).filter((a: any) => a.tone !== null && a.tone < -10);
  if (negativeArticles.length >= 3) {
    alertsToCreate.push({
      userEmail, supplierId, supplierName,
      severity: 'High', category: 'News',
      title: `High Volume of Negative News (${negativeArticles.length} articles)`,
      description: `GDELT global news monitoring detected significant negative coverage: "${negativeArticles[0]?.title}"`,
      source: 'GDELT News Intelligence',
    });
  }

  // Adverse 8-K SEC filing
  const adverseFilings = (data.secFilings || []).filter((f: any) => f.isAdverseEvent);
  if (adverseFilings.length > 0) {
    alertsToCreate.push({
      userEmail, supplierId, supplierName,
      severity: 'Warning', category: 'Financial',
      title: `SEC 8-K Material Event Filing Detected`,
      description: `${adverseFilings.length} 8-K filing(s) found for ${supplierName} in the past 12 months (${adverseFilings[0]?.fileDate}).`,
      source: 'SEC EDGAR',
    });
  }

  // World Bank: high political instability
  const pvStat = data.countryRisk?.indicators?.find((i: any) => i?.indicator === 'PV.EST');
  if (pvStat && pvStat.value < -1.0) {
    alertsToCreate.push({
      userEmail, supplierId, supplierName,
      severity: 'Warning', category: 'Operational',
      title: 'High Country Political Instability Risk',
      description: `World Bank Political Stability score for ${supplierName}'s country is ${pvStat.value.toFixed(2)} (scale: -2.5 to +2.5). Elevated supply disruption risk.`,
      source: 'World Bank Governance Indicators',
    });
  }

  // Yahoo Finance: heavily leveraged
  if (data.financials?.debtToEquity && data.financials.debtToEquity > 200) {
    alertsToCreate.push({
      userEmail, supplierId, supplierName,
      severity: 'Warning', category: 'Financial',
      title: 'High Debt-to-Equity Ratio Detected',
      description: `${supplierName} has a debt-to-equity ratio of ${data.financials.debtToEquity.toFixed(0)}%, indicating significant financial leverage.`,
      source: 'Yahoo Finance',
    });
  }

  if (alertsToCreate.length > 0) {
    await dbConnect();
    await RiskAlert.insertMany(alertsToCreate);
  }

  return alertsToCreate.length;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'});

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({error: 'Unauthorized'});

  const {name, country, category, supplierId, createAlerts} = req.query as Record<string, string>;
  if (!name || !country) return res.status(400).json({error: 'name and country are required'});

  // Run all fetches in parallel
  const [
    worldBankResult,
    countryContextResult,
    gdeltResult,
    openCorpResult,
    secResult,
    yahooResult,
    newsApiResult,
    sanctionsResult,
    alphaVantageResult,
    currencyResult,
  ] = await Promise.allSettled([
    getWorldBankData(country),
    getCountryContext(country),
    getGdeltNews(name, country),
    getOpenCorporates(name, country),
    getSecFilings(name),
    getYahooFinance(name),
    getNewsApi(name, country),
    getOpenSanctions(name, country),
    getAlphaVantageNewsSentiment(name),
    getCurrencyRisk(country),
  ]);

  const ok = <T>(r: PromiseSettledResult<T>, fallback: T) =>
    r.status === 'fulfilled' ? r.value : fallback;

  const responseData = {
    supplier: {name, country, category: category || ''},
    fetchedAt: new Date().toISOString(),
    config: {
      hasNewsApi: !!process.env.NEWS_API_KEY,
      hasOpenSanctions: !!process.env.OPENSANCTIONS_API_KEY,
      hasAlphaVantage: !!process.env.ALPHA_VANTAGE_KEY,
    },
    sources: {
      countryRisk: ok(worldBankResult, {isoCode: null, indicators: [], error: 'Fetch failed'}),
      countryContext: ok(countryContextResult, null),
      gdeltNews: ok(gdeltResult, []),
      companyRegistry: ok(openCorpResult, []),
      secFilings: ok(secResult, []),
      financials: ok(yahooResult, null),
      newsApi: ok(newsApiResult, []),
      sanctions: ok(sanctionsResult, {available: false, matches: []}),
      alphaVantageNews: ok(alphaVantageResult, []),
      currencyRisk: ok(currencyResult, null),
    },
  };

  // Optionally auto-create alerts from findings
  let alertsCreated = 0;
  if (createAlerts === 'true' && supplierId) {
    try {
      alertsCreated = await maybeCreateAlerts(
        session.user.email,
        supplierId,
        name,
        responseData.sources,
      );
    } catch {
      // non-fatal
    }
  }

  return res.status(200).json({...responseData, alertsCreated});
}
