'use client';

import { useState } from 'react';
import { UserProfile, UserAccount } from '@/types';
import { X, Users, Utensils, Info, Save, Settings, Lock, User } from 'lucide-react';

interface PreferencesModalProps {
    account: UserAccount;
    onSave: (info: { name?: string; password?: string }, profile: Partial<UserProfile>, prefs: Partial<UserAccount['preferences']>) => void;
    onClose: () => void;
}

export default function PreferencesModal({ account, onSave, onClose }: PreferencesModalProps) {
    const [localName, setLocalName] = useState(account.name || '');
    const [localPassword, setLocalPassword] = useState(account.password || '');
    const [localProfile, setLocalProfile] = useState<UserProfile>(account.profile);
    const [localPrefs, setLocalPrefs] = useState<UserAccount['preferences']>(account.preferences);

    const handleSave = () => {
        onSave({ name: localName, password: localPassword }, localProfile, localPrefs);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto pt-12 md:pt-24">
            <div className="glass-card w-full max-w-lg flex flex-col mb-8 shadow-2xl animate-in zoom-in-95 duration-200"
                style={{ background: 'rgba(255, 255, 255, 0.98)', border: '1px solid var(--border)', maxHeight: 'none' }}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                            <Settings size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--text)' }}>
                                User <span className="gradient-text">Profile</span>
                            </h2>
                            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                Personalize your shopping experience
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="space-y-8 pb-4">

                        {/* Account Info */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <User size={16} className="text-indigo-500" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Account Information</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Full Name</label>
                                    <div className="relative">
                                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={localName}
                                            onChange={(e) => setLocalName(e.target.value)}
                                            placeholder="Enter your name"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Password (Local Only)</label>
                                    <div className="relative">
                                        <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="password"
                                            value={localPassword}
                                            onChange={(e) => setLocalPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Household Size */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Users size={16} className="text-indigo-500" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Household Size</h3>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setLocalProfile({ ...localProfile, household_size: n })}
                                        className="flex-1 h-12 rounded-xl text-sm font-bold transition-all border-2"
                                        style={{
                                            background: localProfile.household_size === n ? 'var(--accent-bg)' : 'white',
                                            borderColor: localProfile.household_size === n ? 'var(--accent)' : 'var(--border)',
                                            color: localProfile.household_size === n ? 'var(--accent)' : 'var(--text)',
                                        }}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* General Preferences */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Settings size={16} className="text-indigo-500" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">App Settings</h3>
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                                            <Utensils size={18} className="text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Show Alternatives</p>
                                            <p className="text-xs text-slate-500">Show cheaper products when available</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={localPrefs.show_alternatives}
                                        onChange={(e) => setLocalPrefs({ ...localPrefs, show_alternatives: e.target.checked })}
                                        className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                </label>
                            </div>
                        </section>

                        {/* Note */}
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
                            <Info size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed text-indigo-700/80">
                                These settings are stored locally in your browser. Account security is local-only at this stage.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-[2] py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 btn-primary shadow-lg shadow-indigo-200"
                    >
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
