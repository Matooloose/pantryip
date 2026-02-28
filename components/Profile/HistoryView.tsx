'use client';

import { SavedBasket } from '@/types';
import { Calendar, Trash2, ChevronRight, Clock, Banknote, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

interface HistoryViewProps {
    history: SavedBasket[];
    onSelect: (basket: SavedBasket) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export default function HistoryView({ history, onSelect, onDelete, onClose }: HistoryViewProps) {
    return (
        <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                        Previous <span className="gradient-text">Budgets</span>
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Your last {history.length} generated baskets
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                    Close
                </button>
            </div>

            {history.length === 0 ? (
                <div className="glass-card p-12 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="font-semibold" style={{ color: 'var(--text)' }}>No history yet</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Generate your first basket to see it here.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {history.map((item, index) => (
                        <div
                            key={item.id}
                            className="glass-card group relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                            style={{
                                animationDelay: `${index * 0.05}s`,
                                opacity: 0,
                                animation: 'slide-up 0.4s ease forwards',
                            }}
                            onClick={() => onSelect(item)}
                        >
                            <div className="p-5 flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Calendar size={12} className="text-indigo-500" />
                                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                            {format(new Date(item.saved_at), 'PPP')}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                                        {item.name || `Budget: R${item.basket.budget}`}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <ShoppingBag size={14} style={{ color: 'var(--accent)' }} />
                                            <span className="text-sm font-medium">{item.basket.items.length} items</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Banknote size={14} style={{ color: 'var(--green)' }} />
                                            <span className="text-sm font-medium">R{item.basket.total_cost.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(item.id);
                                        }}
                                        className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
