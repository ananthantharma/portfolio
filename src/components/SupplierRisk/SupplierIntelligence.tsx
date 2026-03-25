'use client';

import React, {useState} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorldBankIndicator {
  indicator: string;
  label: string;
  value: number;
  year: string;
  trend: 'up' | 'down' | 'stable';
  higherIsBetter: boolean;
  riskFlag: boolean;
}

interface GdeltArticle {
  title: string;
  url: string;
  domain: string;
  date: string;
  language: string;
  tone: number | null;
  sentiment: 'positive' | 'negative' | 'neutral' | 'unknown';
}

interface OpenCorpCompany {
  name: string;
  jurisdiction: string;
  status: string;
  incorporationDate: string | null;
  dissolutionDate: string | null;
  registrationNumber: string;
  profileUrl: string;
  inactive: boolean;
}

interface SecFiling {
  company: string;
  form: string;
  fileDate: string;
  period: string;
  edgarUrl: string;
  isAdverseEvent: boolean;
}

interface YahooFinancials {
  symbol: string;
  name: string;
  exchange: string;
  price: number | null;
  priceChange1d: number | null;
  marketCap: number | null;
  currency: string;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  revenueGrowth: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  recommendationKey: string | null;
  freeCashflow: number | null;
  totalDebt: number | null;
  trailingPE: number | null;
  industry: string | null;
  sector: string | null;
  fullTimeEmployees: number | null;
  website: string | null;
  longBusinessSummary: string | null;
}

interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  source: string;
  date: string;
  imageUrl?: string | null;
}

interface SanctionsData {
  available: boolean;
  matches: Array<{id: string; caption: string; score: number; match: boolean; datasets: string[]; sanctionedBy?: string[]}>;
}

interface CountryContext {
  officialName: string;
  region: string;
  subregion: string;
  population: number;
  area: number;
  currencies: string[];
  languages: string[];
  flagUrl: string;
  landlocked: boolean;
  borderCount: number;
}

interface CurrencyRisk {
  currency: string;
  ratePerUSD?: number;
  lastUpdated?: string;
  note?: string;
}

interface AlphaVantageItem {
  title: string;
  url: string;
  source: string;
  date: string;
  overallSentiment: string;
  overallSentimentScore: number;
  summary: string;
}

interface IntelligenceData {
  supplier: {name: string; country: string; category: string};
  fetchedAt: string;
  alertsCreated: number;
  config: {hasNewsApi: boolean; hasOpenSanctions: boolean; hasAlphaVantage: boolean};
  sources: {
    countryRisk: {isoCode: string | null; indicators: WorldBankIndicator[]; error: string | null};
    countryContext: CountryContext | null;
    gdeltNews: GdeltArticle[];
    companyRegistry: OpenCorpCompany[];
    secFilings: SecFiling[];
    financials: YahooFinancials | null;
    newsApi: NewsArticle[];
    sanctions: SanctionsData;
    alphaVantageNews: AlphaVantageItem[];
    currencyRisk: CurrencyRisk | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtNumber = (n: number | null | undefined, decimals = 1) =>
  n == null ? '—' : n.toLocaleString(undefined, {maximumFractionDigits: decimals});

const fmtBillions = (n: number | null | undefined) => {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
};

const fmtPct = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const SectionHeader = ({icon, title, count, badge}: {icon: string; title: string; count?: number; badge?: string}) => (
  <div className="mb-4 flex items-center gap-2">
    <span className="text-xl">{icon}</span>
    <h3 className="font-semibold text-gray-800">{title}</h3>
    {count !== undefined && (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        {count}
      </span>
    )}
    {badge && (
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
        {badge}
      </span>
    )}
  </div>
);

const Card = ({children, className = ''}: {children: React.ReactNode; className?: string}) => (
  <div className={`rounded-xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>{children}</div>
);

const TrendArrow = ({trend, higherIsBetter}: {trend: 'up' | 'down' | 'stable'; higherIsBetter: boolean}) => {
  const isGood = (trend === 'up' && higherIsBetter) || (trend === 'down' && !higherIsBetter);
  const isBad = (trend === 'up' && !higherIsBetter) || (trend === 'down' && higherIsBetter);
  if (trend === 'stable') return <span className="text-gray-400">→</span>;
  if (isGood) return <span className="text-emerald-500">{trend === 'up' ? '↑' : '↓'}</span>;
  if (isBad) return <span className="text-red-500">{trend === 'up' ? '↑' : '↓'}</span>;
  return null;
};

const SentimentPill = ({sentiment}: {sentiment: string}) => {
  const colors: Record<string, string> = {
    positive: 'bg-emerald-100 text-emerald-700',
    negative: 'bg-red-100 text-red-700',
    neutral: 'bg-gray-100 text-gray-600',
    unknown: 'bg-gray-100 text-gray-500',
    Bullish: 'bg-emerald-100 text-emerald-700',
    'Somewhat-Bullish': 'bg-teal-100 text-teal-700',
    Neutral: 'bg-gray-100 text-gray-600',
    'Somewhat-Bearish': 'bg-orange-100 text-orange-700',
    Bearish: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[sentiment] || 'bg-gray-100 text-gray-600'}`}>
      {sentiment}
    </span>
  );
};

// ─── Setup Guide for missing API keys ─────────────────────────────────────────
const ApiKeySetupGuide = ({hasNewsApi, hasOpenSanctions, hasAlphaVantage}: {
  hasNewsApi: boolean; hasOpenSanctions: boolean; hasAlphaVantage: boolean;
}) => {
  const missing = [
    !hasNewsApi && {name: 'News API', env: 'NEWS_API_KEY', url: 'https://newsapi.org/', free: '100 req/day free'},
    !hasOpenSanctions && {name: 'OpenSanctions', env: 'OPENSANCTIONS_API_KEY', url: 'https://www.opensanctions.org/', free: '10k req/mo free'},
    !hasAlphaVantage && {name: 'Alpha Vantage', env: 'ALPHA_VANTAGE_KEY', url: 'https://www.alphavantage.co/', free: '500 req/day free'},
  ].filter(Boolean) as Array<{name: string; env: string; url: string; free: string}>;

  if (missing.length === 0) return null;
  return (
    <Card className="border-blue-100 bg-blue-50">
      <div className="flex items-start gap-3">
        <span className="text-blue-500">💡</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">Unlock more intelligence sources</p>
          <p className="mt-0.5 text-xs text-blue-600">Add these free API keys to your environment variables:</p>
          <div className="mt-2 space-y-1">
            {missing.map(m => (
              <div key={m.env} className="flex items-center gap-2 text-xs">
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-blue-700">{m.env}</code>
                <span className="text-blue-600">— {m.free} —</span>
                <a href={m.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  Sign up free →
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// ─── Section: Country Risk (World Bank) ───────────────────────────────────────
const CountryRiskSection = ({data, context}: {
  data: IntelligenceData['sources']['countryRisk'];
  context: CountryContext | null;
}) => (
  <Card>
    <SectionHeader icon="🌍" title="Country Risk Intelligence" badge="World Bank" />
    {context && (
      <div className="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
        {context.flagUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={context.flagUrl} alt={context.officialName} className="h-8 w-12 rounded object-cover shadow-sm" />
        )}
        <div>
          <p className="font-medium text-gray-800">{context.officialName}</p>
          <p className="text-xs text-gray-500">
            {context.region} · {context.subregion} · Pop. {(context.population / 1e6).toFixed(0)}M ·{' '}
            {context.currencies.join(', ')} · {context.landlocked ? '🔒 Landlocked' : '🌊 Coastal'}
          </p>
        </div>
      </div>
    )}
    {data.indicators.length === 0 ? (
      <p className="text-sm text-gray-400">{data.error || 'No data available'}</p>
    ) : (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.indicators.map(
          ind =>
            ind && (
              <div
                key={ind.indicator}
                className={`rounded-lg border p-3 ${ind.riskFlag ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                <p className="text-xs text-gray-500">{ind.label}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`text-lg font-bold ${ind.riskFlag ? 'text-red-700' : 'text-gray-800'}`}>
                    {fmtNumber(ind.value)}
                  </span>
                  <TrendArrow trend={ind.trend} higherIsBetter={ind.higherIsBetter} />
                  {ind.riskFlag && <span className="text-xs text-red-600">⚠</span>}
                </div>
                <p className="text-xs text-gray-400">as of {ind.year}</p>
              </div>
            ),
        )}
      </div>
    )}
  </Card>
);

// ─── Section: Currency Risk ───────────────────────────────────────────────────
const CurrencySection = ({data}: {data: CurrencyRisk | null}) => {
  if (!data) return null;
  return (
    <Card>
      <SectionHeader icon="💱" title="Currency Risk" badge="ExchangeRate-API" />
      {data.note ? (
        <p className="text-sm text-gray-500">{data.note}</p>
      ) : (
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-400">Currency</p>
            <p className="text-xl font-bold text-gray-800">{data.currency}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Rate vs USD</p>
            <p className="text-xl font-bold text-gray-800">{fmtNumber(data.ratePerUSD ?? null, 4)}</p>
          </div>
          {data.lastUpdated && (
            <p className="ml-auto text-xs text-gray-400">Updated: {fmtDate(data.lastUpdated)}</p>
          )}
        </div>
      )}
    </Card>
  );
};

// ─── Section: Sanctions ───────────────────────────────────────────────────────
const SanctionsSection = ({data, hasKey}: {data: SanctionsData; hasKey: boolean}) => (
  <Card className={data.matches.some(m => m.match) ? 'border-red-200' : ''}>
    <SectionHeader icon="🚫" title="Sanctions & Watchlist Screening" badge="OpenSanctions" />
    {!hasKey ? (
      <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
        Add <code className="rounded bg-gray-100 px-1">OPENSANCTIONS_API_KEY</code> to enable sanctions screening
      </div>
    ) : !data.available ? (
      <p className="text-sm text-gray-400">Screening unavailable</p>
    ) : data.matches.length === 0 ? (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
        <span>✅</span> No matches found in global sanctions & watchlists
      </div>
    ) : (
      <div className="space-y-2">
        {data.matches.map(m => (
          <div
            key={m.id}
            className={`rounded-lg border p-3 ${m.match ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800">{m.caption}</span>
              {m.match && <span className="rounded-full bg-red-100 px-2 text-xs font-bold text-red-700">MATCH</span>}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">Score: {(m.score * 100).toFixed(0)}% · Datasets: {m.datasets?.join(', ')}</p>
          </div>
        ))}
      </div>
    )}
  </Card>
);

// ─── Section: Company Registry ────────────────────────────────────────────────
const CompanyRegistrySection = ({data}: {data: OpenCorpCompany[]}) => (
  <Card>
    <SectionHeader icon="🏢" title="Company Registry" count={data.length} badge="OpenCorporates" />
    {data.length === 0 ? (
      <p className="text-sm text-gray-400">No registry matches found</p>
    ) : (
      <div className="space-y-3">
        {data.map((c, i) => (
          <div key={i} className={`rounded-lg border p-3 ${c.inactive || c.dissolutionDate ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <a href={c.profileUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">
                  {c.name}
                </a>
                <p className="text-xs text-gray-500">
                  #{c.registrationNumber} · {c.jurisdiction?.toUpperCase()}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  c.inactive || c.dissolutionDate
                    ? 'bg-red-100 text-red-700'
                    : c.status?.toLowerCase().includes('active')
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                {c.status || (c.inactive ? 'Inactive' : 'Unknown')}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Incorporated: {fmtDate(c.incorporationDate)}
              {c.dissolutionDate && ` · Dissolved: ${fmtDate(c.dissolutionDate)}`}
            </p>
          </div>
        ))}
      </div>
    )}
  </Card>
);

// ─── Section: SEC Filings ─────────────────────────────────────────────────────
const SecFilingsSection = ({data}: {data: SecFiling[]}) => (
  <Card>
    <SectionHeader icon="📋" title="SEC Regulatory Filings" count={data.length} badge="EDGAR" />
    {data.length === 0 ? (
      <p className="text-sm text-gray-400">No SEC filings found (US public companies only)</p>
    ) : (
      <div className="space-y-2">
        {data.map((f, i) => (
          <div
            key={i}
            className={`flex items-center justify-between rounded-lg border p-3 text-sm ${f.isAdverseEvent ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                    f.isAdverseEvent ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-700'
                  }`}>
                  {f.form}
                </span>
                <span className="font-medium text-gray-700">{f.company}</span>
                {f.isAdverseEvent && <span className="text-xs text-orange-600">⚠ Material Event</span>}
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                Filed: {fmtDate(f.fileDate)} · Period: {fmtDate(f.period)}
              </p>
            </div>
            <a href={f.edgarUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
              EDGAR →
            </a>
          </div>
        ))}
      </div>
    )}
  </Card>
);

// ─── Section: Yahoo Finance ───────────────────────────────────────────────────
const FinancialsSection = ({data}: {data: YahooFinancials | null}) => {
  if (!data) return (
    <Card>
      <SectionHeader icon="📈" title="Public Market Financials" badge="Yahoo Finance" />
      <p className="text-sm text-gray-400">No publicly traded match found for this supplier</p>
    </Card>
  );

  const recColor: Record<string, string> = {
    buy: 'text-emerald-600', hold: 'text-yellow-600', sell: 'text-red-600',
    'strong buy': 'text-emerald-700', 'strong sell': 'text-red-700',
  };

  return (
    <Card>
      <SectionHeader icon="📈" title="Public Market Financials" badge="Yahoo Finance" />
      <div className="mb-3 flex items-center gap-3">
        <div>
          <p className="text-xs text-gray-400">{data.exchange}: {data.symbol}</p>
          <p className="font-semibold text-gray-800">{data.name}</p>
          {data.sector && <p className="text-xs text-gray-500">{data.sector} · {data.industry}</p>}
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-gray-900">
            {data.currency} {fmtNumber(data.price)}
          </p>
          {data.priceChange1d != null && (
            <p className={`text-sm font-medium ${data.priceChange1d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {data.priceChange1d >= 0 ? '+' : ''}{fmtPct(data.priceChange1d)} today
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 sm:grid-cols-3 lg:grid-cols-4">
        {[
          {label: 'Market Cap', val: fmtBillions(data.marketCap)},
          {label: 'Rev Growth', val: fmtPct(data.revenueGrowth)},
          {label: 'Gross Margin', val: fmtPct(data.grossMargins)},
          {label: 'Op Margin', val: fmtPct(data.operatingMargins)},
          {label: 'Debt/Equity', val: data.debtToEquity ? `${fmtNumber(data.debtToEquity)}%` : '—'},
          {label: 'Current Ratio', val: fmtNumber(data.currentRatio)},
          {label: 'Quick Ratio', val: fmtNumber(data.quickRatio)},
          {label: 'Free CF', val: fmtBillions(data.freeCashflow)},
          {label: 'P/E Ratio', val: fmtNumber(data.trailingPE)},
          {label: 'Total Debt', val: fmtBillions(data.totalDebt)},
          {label: 'Employees', val: data.fullTimeEmployees ? data.fullTimeEmployees.toLocaleString() : '—'},
          {label: 'Analyst Rating', val: data.recommendationKey ? (
            <span className={`font-semibold capitalize ${recColor[data.recommendationKey] || 'text-gray-700'}`}>
              {data.recommendationKey}
            </span>
          ) : '—'},
        ].map(({label, val}) => (
          <div key={label} className="rounded-lg bg-gray-50 p-2.5">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-0.5 font-semibold text-gray-800">{val}</p>
          </div>
        ))}
      </div>

      {data.longBusinessSummary && (
        <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500">
          {data.longBusinessSummary}…
        </p>
      )}
      {data.website && (
        <a href={data.website} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-blue-600 hover:underline">
          {data.website} →
        </a>
      )}
    </Card>
  );
};

// ─── Section: GDELT Global News ───────────────────────────────────────────────
const GdeltNewsSection = ({data}: {data: GdeltArticle[]}) => {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? data : data.slice(0, 6);
  return (
    <Card>
      <SectionHeader icon="🌐" title="Global News Monitor" count={data.length} badge="GDELT (30-day)" />
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">No recent news found in global media</p>
      ) : (
        <>
          <div className="space-y-2">
            {shown.map((a, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-gray-100 p-3 hover:border-gray-200">
                <div className="min-w-0 flex-1">
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-800 hover:text-blue-700 hover:underline line-clamp-2">
                    {a.title}
                  </a>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {a.domain} · {fmtDate(a.date)}
                    {a.language !== 'English' && ` · ${a.language}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <SentimentPill sentiment={a.sentiment} />
                  {a.tone != null && (
                    <span className="text-xs text-gray-400">tone: {a.tone.toFixed(1)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {data.length > 6 && (
            <button onClick={() => setShowAll(v => !v)} className="mt-2 text-xs text-blue-600 hover:underline">
              {showAll ? 'Show less' : `Show all ${data.length} articles`}
            </button>
          )}
        </>
      )}
    </Card>
  );
};

// ─── Section: News API ────────────────────────────────────────────────────────
const NewsApiSection = ({data, hasKey}: {data: NewsArticle[]; hasKey: boolean}) => {
  if (!hasKey) return null;
  return (
    <Card>
      <SectionHeader icon="📰" title="News Headlines" count={data.length} badge="News API" />
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">No recent headlines found</p>
      ) : (
        <div className="space-y-2">
          {data.map((a, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
              {a.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.imageUrl} alt="" className="h-14 w-20 shrink-0 rounded object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <a href={a.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-800 hover:underline line-clamp-2">
                  {a.title}
                </a>
                {a.description && <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{a.description}</p>}
                <p className="mt-1 text-xs text-gray-400">{a.source} · {fmtDate(a.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ─── Section: Alpha Vantage News Sentiment ────────────────────────────────────
const AlphaVantageSection = ({data, hasKey}: {data: AlphaVantageItem[]; hasKey: boolean}) => {
  if (!hasKey || data.length === 0) return null;
  return (
    <Card>
      <SectionHeader icon="📊" title="Financial News Sentiment" count={data.length} badge="Alpha Vantage" />
      <div className="space-y-2">
        {data.map((a, i) => (
          <div key={i} className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 p-3">
            <div className="min-w-0 flex-1">
              <a href={a.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-800 hover:underline line-clamp-2">
                {a.title}
              </a>
              {a.summary && <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{a.summary}</p>}
              <p className="mt-1 text-xs text-gray-400">{a.source} · {fmtDate(a.date)}</p>
            </div>
            <SentimentPill sentiment={a.overallSentiment} />
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  supplierId: string;
  supplierName: string;
  supplierCountry: string;
  supplierCategory: string;
  onAlertsCreated?: () => void;
}

export const SupplierIntelligence: React.FC<Props> = ({
  supplierId,
  supplierName,
  supplierCountry,
  supplierCategory,
  onAlertsCreated,
}) => {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoAlerts, setAutoAlerts] = useState(false);

  const fetchIntelligence = async (withAlerts = autoAlerts) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        name: supplierName,
        country: supplierCountry,
        category: supplierCategory,
        supplierId,
        createAlerts: String(withAlerts),
      });
      const res = await fetch(`/api/supplier-risk/intelligence?${params}`);
      if (!res.ok) throw new Error('Failed to fetch intelligence');
      const json = await res.json();
      setData(json);
      if (json.alertsCreated > 0 && onAlertsCreated) onAlertsCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading && !error) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <div className="mb-4 text-5xl">🔍</div>
        <h3 className="mb-2 text-lg font-semibold text-gray-800">Supplier Intelligence</h3>
        <p className="mb-6 text-sm text-gray-500">
          Pull live data from 10 free sources: World Bank, GDELT news, OpenCorporates registry,
          SEC EDGAR filings, Yahoo Finance, exchange rates, and more.
        </p>
        <div className="mb-4 flex items-center justify-center gap-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={autoAlerts}
              onChange={e => setAutoAlerts(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-gray-600">Auto-create alerts from findings</span>
          </label>
        </div>
        <button
          onClick={() => fetchIntelligence()}
          className="btn-primary px-6 py-2 text-sm">
          Run Intelligence Scan
        </button>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {['🌍 World Bank', '📰 GDELT News', '🏢 OpenCorporates', '📋 SEC EDGAR',
            '📈 Yahoo Finance', '💱 FX Rates', '🚫 OpenSanctions*', '📰 NewsAPI*', '📊 AlphaVantage*',
          ].map(s => (
            <span key={s} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
              {s}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">* requires free API key</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <div className="mb-3 text-4xl">⏳</div>
        <p className="font-medium text-gray-700">Scanning intelligence sources…</p>
        <p className="mt-1 text-sm text-gray-400">Querying World Bank, GDELT, SEC EDGAR, Yahoo Finance, and more in parallel</p>
        <div className="mt-4 flex justify-center gap-1">
          {[0.1, 0.2, 0.3, 0.4, 0.5].map(d => (
            <div
              key={d}
              className="h-2 w-2 animate-bounce rounded-full bg-blue-500"
              style={{animationDelay: `${d}s`}}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center">
        <p className="font-medium text-red-700">Intelligence scan failed: {error}</p>
        <button onClick={() => fetchIntelligence()} className="mt-3 text-sm text-red-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const s = data.sources;
  const totalNewsItems = s.gdeltNews.length + s.newsApi.length + s.alphaVantageNews.length;
  const sanctionHit = s.sanctions.matches.some(m => m.match);
  const adverseFilings = s.secFilings.filter(f => f.isAdverseEvent);
  const negativeNews = s.gdeltNews.filter(a => a.sentiment === 'negative').length;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs text-gray-400">Intelligence scan · {new Date(data.fetchedAt).toLocaleString()}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {sanctionHit && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                🚨 SANCTIONS MATCH
              </span>
            )}
            {adverseFilings.length > 0 && (
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                ⚠ {adverseFilings.length} adverse SEC filing(s)
              </span>
            )}
            {negativeNews >= 3 && (
              <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700">
                📰 {negativeNews} negative news articles
              </span>
            )}
            {!sanctionHit && adverseFilings.length === 0 && negativeNews < 3 && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                ✅ No critical flags detected
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.alertsCreated > 0 && (
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {data.alertsCreated} alert(s) created
            </span>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{totalNewsItems} news items</span>
            <span>·</span>
            <span>{s.companyRegistry.length} registry matches</span>
            <span>·</span>
            <span>{s.secFilings.length} SEC filings</span>
          </div>
          <button
            onClick={() => fetchIntelligence()}
            className="btn-secondary text-xs">
            🔄 Refresh
          </button>
        </div>
      </div>

      <ApiKeySetupGuide
        hasNewsApi={data.config.hasNewsApi}
        hasOpenSanctions={data.config.hasOpenSanctions}
        hasAlphaVantage={data.config.hasAlphaVantage}
      />

      {/* Critical: Sanctions first */}
      <SanctionsSection data={s.sanctions} hasKey={data.config.hasOpenSanctions} />

      {/* Country intelligence */}
      <CountryRiskSection data={s.countryRisk} context={s.countryContext} />
      <CurrencySection data={s.currencyRisk} />

      {/* Financial markets */}
      <FinancialsSection data={s.financials} />

      {/* News (all sources combined) */}
      <GdeltNewsSection data={s.gdeltNews} />
      <NewsApiSection data={s.newsApi} hasKey={data.config.hasNewsApi} />
      <AlphaVantageSection data={s.alphaVantageNews} hasKey={data.config.hasAlphaVantage} />

      {/* Registry + Filings */}
      <CompanyRegistrySection data={s.companyRegistry} />
      <SecFilingsSection data={s.secFilings} />
    </div>
  );
};
