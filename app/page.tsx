'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, ShoppingCart, Zap, ChevronDown, ChevronRight, Leaf, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ShoppingBasket, UserProfile, BasketItem } from '@/types';

type Step = 'voice' | 'budget' | 'loading' | 'results';

interface ProcessedVoice {
  transcript: string;
  profile: UserProfile;
}

// ─── Waveform Bars ────────────────────────────────────────────────────────────
function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: 'var(--accent)',
            height: active ? `${20 + Math.sin(i * 0.8) * 12}px` : '4px',
            transition: `height 0.15s ease ${i * 0.04}s`,
            animation: active ? `waveform ${0.6 + i * 0.07}s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ─── Store Badge ──────────────────────────────────────────────────────────────
const STORE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  picknpay: { label: "Pick n Pay", color: "#e30613", bg: "#2a0508" },
  shoprite: { label: "Shoprite", color: "#003da5", bg: "#020c1a" },
  checkers: { label: "Checkers", color: "#e30613", bg: "#2a0508" },
  woolworths: { label: "Woolworths", color: "#5c9c47", bg: "#0d1a0a" },
};

function StoreBadge({ store }: { store: string }) {
  const cfg = STORE_CONFIG[store] || { label: store, color: '#888', bg: '#1a1a1a' };
  return (
    <span
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}22` }}
      className="text-xs font-medium px-2 py-0.5 rounded-full"
    >
      {cfg.label}
    </span>
  );
}

// ─── Basket Item Card ─────────────────────────────────────────────────────────
function BasketItemCard({ item, index }: { item: BasketItem; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="animate-slide-up rounded-xl overflow-hidden"
      style={{
        animationDelay: `${index * 0.06}s`,
        opacity: 0,
        animationFillMode: 'forwards',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
              {item.ingredient}
            </p>
            <p className="font-medium truncate" style={{ fontFamily: 'var(--font-display)' }}>
              {item.recommended_product.name}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StoreBadge store={item.recommended_product.store} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                R{(item.recommended_product.unit_price).toFixed(2)}/100g
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {item.quantity_needed}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
              R{item.recommended_product.price.toFixed(2)}
            </p>
            {item.savings_vs_expensive > 0 && (
              <p className="text-xs mt-0.5" style={{ color: '#5cdb95' }}>
                Save R{item.savings_vs_expensive.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {item.alternatives.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-3 text-xs transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronDown
              size={12}
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
            {item.alternatives.length} alternative{item.alternatives.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {expanded && item.alternatives.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          {item.alternatives.map((alt, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between gap-3"
              style={{ borderBottom: i < item.alternatives.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{alt.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StoreBadge store={alt.store} />
                </div>
              </div>
              <p className="text-sm font-medium shrink-0">R{alt.price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Budget Ring ──────────────────────────────────────────────────────────────
function BudgetRing({ used, total }: { used: number; total: number }) {
  const pct = Math.min(used / total, 1);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const overBudget = used > total;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 128, height: 128 }}>
      <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={overBudget ? '#ff4d4d' : 'var(--accent)'}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>USED</p>
        <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: overBudget ? '#ff4d4d' : 'var(--accent)' }}>
          {Math.round(pct * 100)}%
        </p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function PantryIQ() {
  const [step, setStep] = useState<Step>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceResult, setVoiceResult] = useState<ProcessedVoice | null>(null);
  const [budget, setBudget] = useState<string>('');
  const [householdSize, setHouseholdSize] = useState<number>(2);
  const [basket, setBasket] = useState<ShoppingBasket | null>(null);
  const [error, setError] = useState<string>('');
  const [loadingStatus, setLoadingStatus] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── Voice Recording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    setTranscript('');
    setError('');

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-ZA';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let full = '';
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript;
        }
        setTranscript(full);
      };

      recognition.onerror = () => {
        setError('Microphone access denied. Please type your meals below.');
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } else {
      setError('Speech recognition not supported. Please type your meals below.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  // ── Process Voice ───────────────────────────────────────────────────────────
  const processVoice = useCallback(async () => {
    if (!transcript.trim()) {
      setError('Please record or type your meals first.');
      return;
    }
    setError('');
    setLoadingStatus('Analysing your meals...');
    setStep('loading');

    try {
      const res = await fetch('/api/process-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, household_size: householdSize }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVoiceResult(data);
      setStep('budget');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process voice');
      setStep('voice');
    }
  }, [transcript, householdSize]);

  // ── Generate Basket ─────────────────────────────────────────────────────────
  const generateBasket = useCallback(async () => {
    if (!voiceResult || !budget) return;
    const b = parseFloat(budget);
    if (isNaN(b) || b < 50) {
      setError('Please enter a valid budget (minimum R50)');
      return;
    }

    setError('');
    setStep('loading');
    const statuses = [
      'Scanning Pick n Pay prices...',
      'Scanning Shoprite prices...',
      'Comparing 200+ products...',
      'Optimising your basket with AI...',
    ];

    let si = 0;
    setLoadingStatus(statuses[0]);
    const statusInterval = setInterval(() => {
      si = Math.min(si + 1, statuses.length - 1);
      setLoadingStatus(statuses[si]);
    }, 2000);

    try {
      const res = await fetch('/api/generate-basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: voiceResult.profile, budget: b }),
      });

      clearInterval(statusInterval);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBasket(data.basket);
      setStep('results');
    } catch (err) {
      clearInterval(statusInterval);
      setError(err instanceof Error ? err.message : 'Failed to generate basket');
      setStep('budget');
    }
  }, [voiceResult, budget]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent)' }}>
            <ShoppingCart size={16} color="#0a0a08" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>
            PantryIQ
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <Zap size={11} style={{ color: 'var(--accent)' }} />
          Powered by Claude
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* ── STEP: VOICE ─────────────────────────────────────────────── */}
        {step === 'voice' && (
          <div className="animate-slide-up">
            <div className="mb-10">
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
                Step 1 of 2
              </p>
              <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                Tell me what<br />you cook.
              </h1>
              <p className="mt-4 text-base" style={{ color: 'var(--text-muted)', maxWidth: 440 }}>
                Speak naturally. Mention your meals, the ingredients you use, how often you cook.
                I'll build your personal shopping profile.
              </p>
            </div>

            {/* Household size */}
            <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <label className="text-xs uppercase tracking-widest block mb-3" style={{ color: 'var(--text-muted)' }}>
                Household size
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => setHouseholdSize(n)}
                    className="w-10 h-10 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: householdSize === n ? 'var(--accent)' : 'var(--surface-2)',
                      color: householdSize === n ? '#0a0a08' : 'var(--text)',
                      border: `1px solid ${householdSize === n ? 'var(--accent)' : 'var(--border)'}`,
                      fontFamily: 'var(--font-display)',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Recording button */}
            <div className="flex flex-col items-center gap-6 my-10">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'pulse-recording' : ''}`}
                style={{
                  background: isRecording ? 'var(--accent)' : 'var(--surface-2)',
                  border: `2px solid ${isRecording ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {isRecording
                  ? <MicOff size={32} color="#0a0a08" />
                  : <Mic size={32} style={{ color: 'var(--text-muted)' }} />
                }
              </button>

              {isRecording && (
                <div className="flex flex-col items-center gap-2 animate-slide-up">
                  <WaveformBars active={isRecording} />
                  <p className="text-sm" style={{ color: 'var(--accent)' }}>Listening... tap to stop</p>
                </div>
              )}
              {!isRecording && !transcript && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tap to start recording</p>
              )}
            </div>

            {/* Transcript / manual input */}
            <div>
              <label className="text-xs uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>
                Your meals & ingredients {transcript ? '(recorded)' : '(or type here)'}
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="e.g. I usually make pap and chicken stew twice a week. I also make spaghetti bolognese. I use tomatoes, onions, garlic, cooking oil, and maize meal every week."
                rows={5}
                className="w-full rounded-xl p-4 text-sm resize-none outline-none transition-colors"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-3 text-sm p-3 rounded-lg animate-slide-up"
                style={{ background: '#2a0808', border: '1px solid #ff4d4d44', color: '#ff4d4d' }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              onClick={processVoice}
              disabled={!transcript.trim()}
              className="w-full mt-6 py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all"
              style={{
                background: transcript.trim() ? 'var(--accent)' : 'var(--surface-2)',
                color: transcript.trim() ? '#0a0a08' : 'var(--text-muted)',
                fontFamily: 'var(--font-display)',
                cursor: transcript.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <ChevronRight size={18} />
              Analyse My Profile
            </button>
          </div>
        )}

        {/* ── STEP: BUDGET ─────────────────────────────────────────────── */}
        {step === 'budget' && voiceResult && (
          <div className="animate-slide-up">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
              Step 2 of 2
            </p>
            <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', letterSpacing: '-0.04em' }}>
              Set your budget.
            </h1>
            <p className="mt-3 mb-8" style={{ color: 'var(--text-muted)' }}>
              I found <strong style={{ color: 'var(--text)' }}>{voiceResult.profile.meals.length} meals</strong> in your profile.
              Now tell me your weekly grocery budget.
            </p>

            {/* Detected meals preview */}
            <div className="mb-8 p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                Detected meals
              </p>
              <div className="flex flex-wrap gap-2">
                {voiceResult.profile.meals.map((meal, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <CheckCircle2 size={12} style={{ color: 'var(--accent)' }} />
                    {meal.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Budget input */}
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}>
                R
              </span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-5 rounded-xl text-3xl font-bold outline-none transition-all"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.03em',
                }}
              />
            </div>

            {/* Quick budget buttons */}
            <div className="flex gap-2 mb-8">
              {[300, 500, 800, 1200].map((b) => (
                <button key={b} onClick={() => setBudget(b.toString())}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: budget === b.toString() ? 'var(--accent)' : 'var(--surface)',
                    color: budget === b.toString() ? '#0a0a08' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    fontFamily: 'var(--font-display)',
                  }}>
                  R{b}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 mb-4 text-sm p-3 rounded-lg"
                style={{ background: '#2a0808', border: '1px solid #ff4d4d44', color: '#ff4d4d' }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button onClick={generateBasket} disabled={!budget}
              className="w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all"
              style={{
                background: budget ? 'var(--accent)' : 'var(--surface-2)',
                color: budget ? '#0a0a08' : 'var(--text-muted)',
                fontFamily: 'var(--font-display)',
                cursor: budget ? 'pointer' : 'not-allowed',
              }}>
              <ShoppingCart size={18} />
              Find My Best Deals
            </button>
          </div>
        )}

        {/* ── STEP: LOADING ────────────────────────────────────────────── */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 gap-8 animate-slide-up">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-2 opacity-20" style={{ borderColor: 'var(--accent)' }} />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent)]"
                style={{ animation: 'spin 1s linear infinite', borderTopColor: 'var(--accent)' }} />
              <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-[var(--accent)] opacity-60"
                style={{ animation: 'spin 1.5s linear infinite reverse', borderTopColor: 'var(--accent)' }} />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                {loadingStatus}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Comparing prices across Pick n Pay & Shoprite
              </p>
            </div>
          </div>
        )}

        {/* ── STEP: RESULTS ────────────────────────────────────────────── */}
        {step === 'results' && basket && (
          <div>
            {/* Summary header */}
            <div className="animate-slide-up mb-8">
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>
                Your Optimised Basket
              </p>
              <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', letterSpacing: '-0.04em' }}>
                Shop smarter.<br />Save more.
              </h1>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
              <div className="p-5 rounded-xl col-span-2 flex items-center justify-between"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Total Cost</p>
                  <p className="text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', color: basket.budget_remaining >= 0 ? 'var(--accent)' : '#ff4d4d' }}>
                    R{basket.total_cost.toFixed(2)}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    of R{basket.budget.toFixed(2)} budget
                    {basket.budget_remaining >= 0
                      ? <span style={{ color: '#5cdb95' }}> · R{basket.budget_remaining.toFixed(2)} remaining</span>
                      : <span style={{ color: '#ff4d4d' }}> · R{Math.abs(basket.budget_remaining).toFixed(2)} over</span>
                    }
                  </p>
                </div>
                <BudgetRing used={basket.total_cost} total={basket.budget} />
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>You Save</p>
                <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#5cdb95' }}>
                  R{basket.savings_total.toFixed(2)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>vs. premium options</p>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Items</p>
                <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  {basket.items.length}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  across {Object.keys(basket.store_breakdown).length} stores
                </p>
              </div>
            </div>

            {/* Store breakdown */}
            {Object.keys(basket.store_breakdown).length > 0 && (
              <div className="mb-6 p-4 rounded-xl animate-slide-up"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Store breakdown
                </p>
                <div className="flex flex-col gap-2">
                  {Object.entries(basket.store_breakdown).map(([store, amount]) => {
                    const pct = (amount / basket.total_cost) * 100;
                    const cfg = STORE_CONFIG[store] || { label: store, color: '#888', bg: '#1a1a1a' };
                    return (
                      <div key={store}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span style={{ color: cfg.color, fontFamily: 'var(--font-display)' }}>{cfg.label}</span>
                          <span>R{amount.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                          <div style={{ width: `${pct}%`, background: cfg.color, height: '100%', borderRadius: 999, transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tips */}
            {basket.tips.length > 0 && (
              <div className="mb-6 p-4 rounded-xl animate-slide-up"
                style={{ background: '#0d1a0a', border: '1px solid #5cdb9522', animationDelay: '0.25s', opacity: 0, animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Leaf size={14} style={{ color: '#5cdb95' }} />
                  <p className="text-xs uppercase tracking-widest" style={{ color: '#5cdb95' }}>Smart tips</p>
                </div>
                <div className="flex flex-col gap-2">
                  {basket.tips.map((tip, i) => (
                    <p key={i} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      · {tip}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Item list */}
            <div className="flex flex-col gap-3">
              {basket.items.map((item, i) => (
                <BasketItemCard key={i} item={item} index={i} />
              ))}
            </div>

            {/* Reset */}
            <button onClick={() => { setStep('voice'); setBasket(null); setTranscript(''); setVoiceResult(null); setBudget(''); }}
              className="w-full mt-8 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
              Start over
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
        PantryIQ — Fighting food inflation one basket at a time 🇿🇦
      </footer>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
