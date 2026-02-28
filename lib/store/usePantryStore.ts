'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserAccount, UserProfile, ShoppingBasket, SavedBasket } from '@/types';

const STORAGE_KEY = 'pantryiq_user_account';

const DEFAULT_PROFILE: UserProfile = {
    meals: [],
    dietary_preferences: [],
    allergies: [],
    household_size: 2,
    shopping_frequency: 'weekly',
};

const DEFAULT_ACCOUNT: UserAccount = {
    id: crypto.randomUUID(),
    name: '',
    password: '',
    profile: DEFAULT_PROFILE,
    history: [],
    preferences: {
        theme: 'system',
        default_currency: 'ZAR',
        show_alternatives: true,
        is_onboarded: false,
    },
    created_at: new Date(),
    updated_at: new Date(),
};

export function usePantryStore() {
    const [account, setAccount] = useState<UserAccount | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Convert date strings back to Date objects
                parsed.created_at = new Date(parsed.created_at);
                parsed.updated_at = new Date(parsed.updated_at);
                parsed.history = parsed.history.map((item: any) => ({
                    ...item,
                    saved_at: new Date(item.saved_at),
                }));
                setAccount(parsed);
            } catch (e) {
                console.error('Failed to parse saved account:', e);
                setAccount(DEFAULT_ACCOUNT);
            }
        } else {
            setAccount(DEFAULT_ACCOUNT);
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage whenever account changes
    useEffect(() => {
        if (isLoaded && account) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
        }
    }, [account, isLoaded]);

    const onboardUser = useCallback((name: string, password?: string) => {
        setAccount((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                name,
                password,
                preferences: { ...prev.preferences, is_onboarded: true },
                updated_at: new Date(),
            };
        });
    }, []);

    const updateProfile = useCallback((profile: Partial<UserProfile>) => {
        setAccount((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                profile: { ...prev.profile, ...profile },
                updated_at: new Date(),
            };
        });
    }, []);

    const addToHistory = useCallback((basket: ShoppingBasket) => {
        setAccount((prev) => {
            if (!prev) return prev;
            const newEntry: SavedBasket = {
                id: crypto.randomUUID(),
                basket,
                saved_at: new Date(),
            };
            return {
                ...prev,
                history: [newEntry, ...prev.history].slice(0, 50), // Keep last 50
                updated_at: new Date(),
            };
        });
    }, []);

    const deleteFromHistory = useCallback((id: string) => {
        setAccount((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                history: prev.history.filter((item) => item.id !== id),
                updated_at: new Date(),
            };
        });
    }, []);

    const clearHistory = useCallback(() => {
        setAccount((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                history: [],
                updated_at: new Date(),
            };
        });
    }, []);

    const updatePreferences = useCallback((prefs: Partial<UserAccount['preferences']>) => {
        setAccount((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                preferences: { ...prev.preferences, ...prefs },
                updated_at: new Date(),
            };
        });
    }, []);

    const updateAccountInfo = useCallback((info: { name?: string; password?: string }) => {
        setAccount((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                ...info,
                updated_at: new Date(),
            };
        });
    }, []);

    return {
        account,
        isLoaded,
        onboardUser,
        updateProfile,
        addToHistory,
        deleteFromHistory,
        clearHistory,
        updatePreferences,
        updateAccountInfo,
    };
}
