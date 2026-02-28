'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, ShoppingCart, Sparkles, ChevronDown, ChevronRight, Lightbulb, AlertCircle, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
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
  picknpay: { label: "Pick n Pay", color: "#e11d48", bg: "#fef2f2" },
  shoprite: { label: "Shoprite", color: "#2563eb", bg: "#eff6ff" },
  checkers: { label: "Checkers", color: "#e11d48", bg: "#fef2f2" },
  woolworths: { label: "Woolworths", color: "#059669", bg: "#ecfdf5" },
};

function StoreBadge({ store }: { store: string }) {
  const cfg = STORE_CONFIG[store] || { label: store, color: '#64748b', bg: '#f1f5f9' };
  return (
    <span
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}22` }}
      className="text-xs font-medium px-2.5 py-0.5 rounded-full"
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
      className="animate-slide-up glass-card overflow-hidden"
      style={{
        animationDelay: `${index * 0.06}s`,
        opacity: 0,
        animationFillMode: 'forwards',
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest mb-1 font-medium" style={{ color: 'var(--accent)' }}>
              {item.ingredient}
            </p>
            <p className="font-medium text-base truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              {item.recommended_product.name}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StoreBadge store={item.recommended_product.store} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                R{(item.recommended_product.unit_price).toFixed(2)}/100g
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                {item.quantity_needed}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
              R{item.recommended_product.price.toFixed(2)}
            </p>
            {item.savings_vs_expensive > 0 && (
              <p className="text-xs font-medium mt-0.5 px-2 py-0.5 rounded-full" style={{ color: 'var(--green)', background: 'var(--green-bg)' }}>
                Save R{item.savings_vs_expensive.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {item.alternatives.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 mt-3 text-xs font-medium transition-colors"
            style={{ color: 'var(--accent-light)' }}
          >
            <ChevronDown
              size={12}
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
            {item.alternatives.length} alternative{item.alternatives.length > 1 ? 's' : ''} available
          </button>
        )}
      </div>

      {expanded && item.alternatives.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          {item.alternatives.map((alt, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between gap-3"
              style={{ borderBottom: i < item.alternatives.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--text)' }}>{alt.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StoreBadge store={alt.store} />
                </div>
              </div>
              <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--text)' }}>R{alt.price.toFixed(2)}</p>
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
          stroke={overBudget ? 'var(--red)' : 'var(--accent)'}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>USED</p>
        <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: overBudget ? 'var(--red)' : 'var(--accent)' }}>
          {Math.round(pct * 100)}%
        </p>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
            style={{
              background: i < current ? 'var(--accent)' : i === current ? 'var(--accent-bg)' : 'var(--surface-2)',
              color: i < current ? 'white' : i === current ? 'var(--accent)' : 'var(--text-light)',
              border: i === current ? '2px solid var(--accent)' : '2px solid transparent',
              fontFamily: 'var(--font-display)',
            }}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div className="w-8 h-0.5 rounded-full" style={{
              background: i < current ? 'var(--accent)' : 'var(--border)',
            }} />
          )}
        </div>
      ))}
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

  const recognitionRef = useRef<any>(null);
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

      recognition.onresult = (event: any) => {
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
      '🔍 Scanning Pick n Pay prices...',
      '🔍 Scanning Shoprite prices...',
      '📊 Comparing 200+ products...',
      '🤖 Optimising your basket with AI...',
      '✨ Almost done...',
    ];

    let si = 0;
    setLoadingStatus(statuses[0]);
    const statusInterval = setInterval(() => {
      si = Math.min(si + 1, statuses.length - 1);
      setLoadingStatus(statuses[si]);
    }, 3000);

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
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Decorative blobs */}
      <div className="blob-1" />
      <div className="blob-2" />

      {/* Header */}
      <header className="glass-card px-6 py-4 flex items-center justify-between mx-4 mt-4"
        style={{ position: 'relative', zIndex: 10, borderRadius: 'var(--radius)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            <ShoppingCart size={17} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--text)' }}>
            PantryIQ
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium"
          style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
          <Sparkles size={12} />
          Powered by Hugging Face 🤗
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── STEP: VOICE ─────────────────────────────────────────────── */}
        {step === 'voice' && (
          <div className="animate-slide-up">
            <StepIndicator current={0} total={2} />

            <div className="mb-10">
              <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.2rem)', letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                Tell me what<br /><span className="gradient-text">you cook.</span>
              </h1>
              <p className="mt-4 text-base" style={{ color: 'var(--text-muted)', maxWidth: 460 }}>
                Speak naturally or type below. Mention your meals, ingredients, and how often you cook.
                I'll build your personal shopping profile.
              </p>
            </div>

            {/* Household size */}
            <div className="glass-card mb-6 p-5">
              <label className="text-xs uppercase tracking-widest block mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                👨‍👩‍👧‍👦 Household size
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => setHouseholdSize(n)}
                    className="w-11 h-11 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: householdSize === n ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--surface-2)',
                      color: householdSize === n ? 'white' : 'var(--text)',
                      border: `2px solid ${householdSize === n ? 'var(--accent)' : 'var(--border)'}`,
                      fontFamily: 'var(--font-display)',
                      boxShadow: householdSize === n ? '0 4px 14px rgba(99, 102, 241, 0.3)' : 'none',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Recording button */}
            <div className="flex flex-col items-center gap-5 my-10">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'pulse-recording' : ''}`}
                style={{
                  background: isRecording ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'var(--surface)',
                  border: `3px solid ${isRecording ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: isRecording ? '0 0 30px rgba(99, 102, 241, 0.3)' : '0 4px 14px rgba(0, 0, 0, 0.06)',
                }}
              >
                {isRecording
                  ? <MicOff size={32} color="white" />
                  : <Mic size={32} style={{ color: 'var(--accent)' }} />
                }
              </button>

              {isRecording && (
                <div className="flex flex-col items-center gap-2 animate-slide-up">
                  <WaveformBars active={isRecording} />
                  <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Listening... tap to stop</p>
                </div>
              )}
              {!isRecording && !transcript && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>🎙️ Tap to start recording</p>
              )}
            </div>

            {/* Transcript / manual input */}
            <div>
              <label className="text-xs uppercase tracking-widest block mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>
                📝 Your meals & ingredients {transcript ? '(recorded)' : '(or type here)'}
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="e.g. I usually make pap and chicken stew twice a week. I also make spaghetti bolognese. I use tomatoes, onions, garlic, cooking oil, and maize meal every week."
                rows={5}
                className="w-full rounded-2xl p-4 text-sm resize-none input-modern"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-3 text-sm p-3 rounded-xl animate-slide-up"
                style={{ background: 'var(--red-bg)', border: '1px solid #fecaca', color: 'var(--red)' }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              onClick={processVoice}
              disabled={!transcript.trim()}
              className="w-full mt-6 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 btn-primary"
            >
              Analyse My Profile
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── STEP: BUDGET ─────────────────────────────────────────────── */}
        {step === 'budget' && voiceResult && (
          <div className="animate-slide-up">
            <StepIndicator current={1} total={2} />

            <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', letterSpacing: '-0.04em' }}>
              Set your <span className="gradient-text">budget.</span>
            </h1>
            <p className="mt-3 mb-8" style={{ color: 'var(--text-muted)' }}>
              I found <strong style={{ color: 'var(--accent)' }}>{voiceResult.profile.meals.length} meals</strong> in your profile.
              Now tell me your weekly grocery budget.
            </p>

            {/* Detected meals preview */}
            <div className="glass-card mb-6 p-5">
              <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                ✅ Detected meals
              </p>
              <div className="flex flex-wrap gap-2">
                {voiceResult.profile.meals.map((meal, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl font-medium"
                    style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                    <CheckCircle2 size={14} />
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
                className="w-full pl-10 pr-4 py-5 rounded-2xl text-3xl font-bold input-modern"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
              />
            </div>

            {/* Quick budget buttons */}
            <div className="flex gap-2 mb-8">
              {[300, 500, 800, 1200].map((b) => (
                <button key={b} onClick={() => setBudget(b.toString())}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: budget === b.toString() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--surface)',
                    color: budget === b.toString() ? 'white' : 'var(--text-muted)',
                    border: `2px solid ${budget === b.toString() ? 'var(--accent)' : 'var(--border)'}`,
                    fontFamily: 'var(--font-display)',
                    boxShadow: budget === b.toString() ? '0 4px 14px rgba(99, 102, 241, 0.3)' : 'none',
                  }}>
                  R{b}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 mb-4 text-sm p-3 rounded-xl"
                style={{ background: 'var(--red-bg)', border: '1px solid #fecaca', color: 'var(--red)' }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button onClick={generateBasket} disabled={!budget}
              className="w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 btn-primary">
              <ShoppingCart size={18} />
              Find My Best Deals
            </button>
          </div>
        )}

        {/* ── STEP: LOADING ────────────────────────────────────────────── */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 gap-8 animate-slide-up">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-3 opacity-20" style={{ borderColor: 'var(--accent)', borderWidth: 3 }} />
              <div className="absolute inset-0 rounded-full"
                style={{ animation: 'spin 1s linear infinite', border: '3px solid transparent', borderTopColor: 'var(--accent)' }} />
              <div className="absolute inset-3 rounded-full opacity-60"
                style={{ animation: 'spin 1.5s linear infinite reverse', border: '3px solid transparent', borderTopColor: 'var(--accent-light)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={24} style={{ color: 'var(--accent)' }} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
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
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--green-bg)' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--green)' }} />
                </div>
                <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--green)' }}>
                  Your Optimised Basket
                </p>
              </div>
              <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', letterSpacing: '-0.04em' }}>
                Shop smarter.<br /><span className="gradient-text">Save more.</span>
              </h1>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
              <div className="glass-card p-5 col-span-2 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Total Cost</p>
                  <p className="text-4xl font-bold" style={{
                    fontFamily: 'var(--font-display)', letterSpacing: '-0.04em',
                    background: basket.budget_remaining >= 0
                      ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                      : 'linear-gradient(135deg, #ef4444, #f97316)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>
                    R{basket.total_cost.toFixed(2)}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    of R{basket.budget.toFixed(2)} budget
                    {basket.budget_remaining >= 0
                      ? <span style={{ color: 'var(--green)', fontWeight: 600 }}> · R{basket.budget_remaining.toFixed(2)} remaining</span>
                      : <span style={{ color: 'var(--red)', fontWeight: 600 }}> · R{Math.abs(basket.budget_remaining).toFixed(2)} over</span>
                    }
                  </p>
                </div>
                <BudgetRing used={basket.total_cost} total={basket.budget} />
              </div>

              <div className="glass-card p-4">
                <p className="text-xs uppercase tracking-widest mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>You Save</p>
                <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--green)' }}>
                  R{basket.savings_total.toFixed(2)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>vs. premium options</p>
              </div>

              <div className="glass-card p-4">
                <p className="text-xs uppercase tracking-widest mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>Items</p>
                <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                  {basket.items.length}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  across {Object.keys(basket.store_breakdown).length} stores
                </p>
              </div>
            </div>

            {/* Store breakdown */}
            {Object.keys(basket.store_breakdown).length > 0 && (
              <div className="glass-card mb-6 p-5 animate-slide-up"
                style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
                <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
                  🏪 Store breakdown
                </p>
                <div className="flex flex-col gap-3">
                  {Object.entries(basket.store_breakdown).map(([store, amount]) => {
                    const pct = (amount / basket.total_cost) * 100;
                    const cfg = STORE_CONFIG[store] || { label: store, color: '#64748b', bg: '#f1f5f9' };
                    return (
                      <div key={store}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span style={{ color: cfg.color, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{cfg.label}</span>
                          <span className="font-semibold">R{amount.toFixed(2)}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                          <div style={{
                            width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`,
                            height: '100%', borderRadius: 999, transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tips */}
            {basket.tips.length > 0 && (
              <div className="glass-card mb-6 p-5 animate-slide-up"
                style={{ background: 'var(--orange-bg)', border: '1px solid #fed7aa', animationDelay: '0.25s', opacity: 0, animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={16} style={{ color: 'var(--orange)' }} />
                  <p className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--orange)' }}>Smart tips</p>
                </div>
                <div className="flex flex-col gap-2">
                  {basket.tips.map((tip, i) => (
                    <p key={i} className="text-sm" style={{ color: '#92400e' }}>
                      💡 {tip}
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
              className="w-full mt-8 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: 'var(--surface)', border: '2px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
              <RotateCcw size={14} />
              Start over
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8" style={{ color: 'var(--text-light)', fontSize: 13, position: 'relative', zIndex: 1 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>PantryIQ</p>
        <p className="mt-1">Fighting food inflation one basket at a time 🇿🇦</p>
      </footer>
    </div>
  );
}
