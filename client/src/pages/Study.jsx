import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const STATUS_COLORS = {
  fresh:  { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  aging:  { bg: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400'   },
  dead:   { bg: 'bg-red-100 text-red-600',          dot: 'bg-red-400'    },
};

export default function Study() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [shelves,         setShelves]         = useState([]);
  const [selectedShelfId, setSelectedShelfId] = useState('');
  const [subject,         setSubject]         = useState('');
  const [topicQuery,      setTopicQuery]      = useState('');
  const [minutes,         setMinutes]         = useState(25);

  const [queue,        setQueue]        = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionDone,  setSessionDone]  = useState(false);
  const [loading,      setLoading]      = useState(false);

  const [summary,        setSummary]        = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    api.get('/api/shelves/mine').then(({ data }) => {
      setShelves(Array.isArray(data) ? data : []);
      if (data.length > 0) setSelectedShelfId(data[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!selectedShelfId) return;
    setSummary(null);
    setSummaryLoading(true);
    api.get('/api/study/summary', { params: { shelfId: selectedShelfId, subject: subject || undefined } })
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [selectedShelfId, subject]);

  const startSession = async () => {
    if (!selectedShelfId) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/study/queue', {
        params: {
          shelfId: selectedShelfId,
          subject:  subject    || undefined,
          topic:    topicQuery || undefined,
          minutes,
        },
      });
      if (!data.queue || data.queue.length === 0) {
        alert('No links found matching your filters. Try removing subject/topic filters or add more links to your shelf.');
        setLoading(false);
        return;
      }
      setQueue(data.queue || []);
      setCurrentIndex(0);
      setSessionDone(false);
    } catch (err) {
      console.error('startSession error:', err);
      alert('Could not generate study queue. Make sure you have links in your shelf.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < queue.length - 1) setCurrentIndex((i) => i + 1);
    else setSessionDone(true);
  };

  const handleOpenLink = () => {
    const link = queue[currentIndex];
    if (link?.url) window.open(link.url, '_blank');
    api.post(`/api/links/${queue[currentIndex]._id}/click`).catch(() => null);
  };

  const current  = queue[currentIndex];
  const progress = queue.length ? Math.round(((currentIndex + 1) / queue.length) * 100) : 0;

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-4xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#F4845F] mb-1">Study Mode</p>
            <h1 className="text-3xl font-bold text-[#1A1A2E]">📖 Study Session</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Build a timed study queue from your saved links — filtered by subject and topic.
            </p>
          </div>
        </div>

        <div className="rounded-3xl p-6 bg-white/45 backdrop-blur-xl border border-white/60 shadow-lg flex flex-col gap-5">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Configure Your Session</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[#6B7280] font-semibold uppercase tracking-wide">Shelf</span>
              <select
                value={selectedShelfId}
                onChange={(e) => { setSelectedShelfId(e.target.value); setQueue([]); }}
                className="rounded-xl bg-white/80 border border-white/60 px-3 py-2 text-sm text-[#1A1A2E] outline-none focus:border-[#F4845F] transition"
              >
                <option value="">Select shelf…</option>
                {shelves.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-[#6B7280] font-semibold uppercase tracking-wide">Subject</span>
              <input
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setQueue([]); }}
                placeholder="e.g. DBMS, OS, ML"
                className="rounded-xl bg-white/80 border border-white/60 px-3 py-2 text-sm text-[#1A1A2E] outline-none focus:border-[#F4845F] transition"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-[#6B7280] font-semibold uppercase tracking-wide">Topic filter</span>
              <input
                value={topicQuery}
                onChange={(e) => setTopicQuery(e.target.value)}
                placeholder="e.g. Deadlocks"
                className="rounded-xl bg-white/80 border border-white/60 px-3 py-2 text-sm text-[#1A1A2E] outline-none focus:border-[#F4845F] transition"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-[#6B7280] font-semibold uppercase tracking-wide">Time budget</span>
              <select
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="rounded-xl bg-white/80 border border-white/60 px-3 py-2 text-sm text-[#1A1A2E] outline-none focus:border-[#F4845F] transition"
              >
                {[15, 25, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </label>
          </div>

          <button
            onClick={startSession}
            disabled={!selectedShelfId || loading}
            className="w-full sm:w-fit bg-gradient-to-r from-[#F4845F] to-[#E8617A] text-white font-semibold px-6 py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Building queue…' : '▶ Start Study Session'}
          </button>
        </div>

        {queue.length > 0 && !sessionDone && current && (
          <div className="rounded-3xl p-6 bg-white/50 backdrop-blur-xl border border-white/70 shadow-lg flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[#F4845F] uppercase tracking-wide">
                Link {currentIndex + 1} of {queue.length}
              </span>
              <span className="text-xs text-[#6B7280]">{queue.reduce((s, l) => s + l.readMinutes, 0)} min total</span>
            </div>
            <div className="h-2 rounded-full bg-white/50 border border-white/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F4845F] to-[#E8617A] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold text-[#1A1A2E] leading-tight">{current.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${STATUS_COLORS[current.status]?.bg}`}>
                  {current.status}
                </span>
              </div>

              {current.subject && (
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs bg-[#F4845F]/10 text-[#F4845F] rounded-full px-2 py-0.5 font-medium">{current.subject}</span>
                  {current.topic && (
                    <span className="text-xs bg-[#E8617A]/10 text-[#E8617A] rounded-full px-2 py-0.5 font-medium">{current.topic}</span>
                  )}
                </div>
              )}

              <p className="text-sm text-[#6B7280] leading-relaxed">
                {current.summary || 'No summary available for this link.'}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleOpenLink}
                  className="flex-1 bg-gradient-to-r from-[#F4845F] to-[#E8617A] text-white font-semibold px-5 py-2.5 rounded-2xl hover:opacity-90 transition text-sm"
                >
                  Open & Read →
                </button>
                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-2xl border border-white/60 bg-white/70 text-[#1A1A2E] font-semibold text-sm hover:bg-white/90 transition"
                >
                  {currentIndex < queue.length - 1 ? 'Next →' : 'Finish ✓'}
                </button>
              </div>
            </div>
          </div>
        )}

        {sessionDone && (
          <div className="rounded-3xl p-6 bg-emerald-50/80 border border-emerald-200/60 shadow-lg text-center flex flex-col gap-3">
            <p className="text-3xl">🎓</p>
            <h3 className="text-xl font-bold text-emerald-700">Session Complete!</h3>
            <p className="text-sm text-emerald-600">
              You reviewed {queue.length} resource{queue.length !== 1 ? 's' : ''}. Great work.
            </p>
            <button
              onClick={() => { setQueue([]); setSessionDone(false); }}
              className="mx-auto mt-2 px-6 py-2.5 bg-gradient-to-r from-[#F4845F] to-[#E8617A] text-white font-semibold rounded-2xl hover:opacity-90 transition text-sm"
            >
              Start Another Session
            </button>
          </div>
        )}

        <div className="rounded-3xl p-6 bg-white/45 backdrop-blur-xl border border-white/60 shadow-lg flex flex-col gap-5">
          <h2 className="text-lg font-bold text-[#1A1A2E]">
            Study Summary {subject ? `— ${subject}` : ''}
          </h2>

          {summaryLoading ? (
            <p className="text-sm text-[#6B7280] animate-pulse">Generating your study report…</p>
          ) : !summary ? (
            <p className="text-sm text-[#6B7280]">Select a shelf above to see your study summary.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Total links',   value: summary.stats.totalLinks },
                  { label: 'Never opened',  value: summary.stats.neverOpened, warn: true },
                  { label: 'Aging',         value: summary.stats.agingCount,  warn: true },
                  { label: 'Dead',          value: summary.stats.deadCount,   danger: true },
                ].map(({ label, value, warn, danger }) => (
                  <div
                    key={label}
                    className={`rounded-2xl px-4 py-2 border flex flex-col ${
                      danger ? 'bg-red-50 border-red-200 text-red-700'
                             : warn ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : 'bg-white/80 border-white/60 text-[#1A1A2E]'
                    }`}
                  >
                    <span className="text-2xl font-bold leading-none">{value}</span>
                    <span className="text-xs mt-1 font-medium">{label}</span>
                  </div>
                ))}
              </div>

              {summary.stats.topics.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Topics</p>
                  {summary.stats.topics.map((t) => (
                    <div key={t.topic} className="flex items-center gap-3 rounded-2xl bg-white/70 border border-white/60 px-4 py-2">
                      <span className="flex-1 text-sm font-medium text-[#1A1A2E]">{t.topic}</span>
                      <span className="text-xs text-emerald-600 font-semibold">{t.completed} done</span>
                      <span className="text-xs text-amber-600 font-semibold">{t.decaying} decaying</span>
                      <span className="text-xs text-[#6B7280]">{t.total} total</span>
                    </div>
                  ))}
                </div>
              )}

              {summary.reportText && (
                <div className="rounded-2xl bg-white/80 border border-[#F4845F]/20 p-4">
                  <p className="text-xs font-semibold text-[#F4845F] uppercase tracking-wide mb-2">AI Study Coach</p>
                  <p className="text-sm text-[#1A1A2E] leading-relaxed whitespace-pre-line">{summary.reportText}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
