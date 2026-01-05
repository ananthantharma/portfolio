'use client';

import axios from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface BadgeSettings {
    thresholds: {
        critical: number;
        urgent: number;
        upcoming: number;
        planned: number;
    };
    colors: {
        critical: string;
        urgent: string;
        upcoming: string;
        planned: string;
        longTerm: string;
    };
    animations: {
        critical: string;
        urgent: string;
    };
}

const DEFAULT_SETTINGS: BadgeSettings = {
    thresholds: { critical: 3, urgent: 7, upcoming: 14, planned: 21 },
    colors: { critical: 'bg-red-500', urgent: 'bg-red-500', upcoming: 'bg-orange-500', planned: 'bg-purple-500', longTerm: 'bg-green-500' },
    animations: { critical: '1s', urgent: '3s' },
};

interface BadgeSettingsContextProps {
    settings: BadgeSettings;
    updateSettings: (newSettings: BadgeSettings) => Promise<void>;
    loading: boolean;
    getBadgeStyle: (minDays: number | null) => { className: string; style?: React.CSSProperties };
}

const BadgeSettingsContext = createContext<BadgeSettingsContextProps | undefined>(undefined);

export const BadgeSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<BadgeSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await axios.get('/api/user/settings');
            if (res.data.success && res.data.data) {
                setSettings(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch badge settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSettings = async (newSettings: BadgeSettings) => {
        // Optimistic update
        setSettings(newSettings);
        try {
            await axios.put('/api/user/settings', { badgeSettings: newSettings });
        } catch (error) {
            console.error('Failed to update settings:', error);
            fetchSettings(); // Revert
        }
    };

    const getBadgeStyle = useCallback((minDays: number | null) => {
        let className = 'bg-purple-500'; // Default
        let style: React.CSSProperties = {};

        // No Date -> use Planned or separate? Current logic used Purple default.
        // User plan: "No Date: Purple". So default matches.

        if (minDays !== null) {
            if (minDays <= settings.thresholds.critical) {
                className = `${settings.colors.critical} animate-pulse`;
                style = { animationDuration: settings.animations.critical };
            } else if (minDays <= settings.thresholds.urgent) {
                className = `${settings.colors.urgent} animate-pulse`;
                style = { animationDuration: settings.animations.urgent };
            } else if (minDays <= settings.thresholds.upcoming) {
                className = settings.colors.upcoming;
            } else if (minDays <= settings.thresholds.planned) {
                className = settings.colors.planned;
            } else {
                className = settings.colors.longTerm;
            }
        }

        return { className, style };
    }, [settings]);

    return (
        <BadgeSettingsContext.Provider value={{ settings, updateSettings, loading, getBadgeStyle }}>
            {children}
        </BadgeSettingsContext.Provider>
    );
};

export const useBadgeSettings = () => {
    const context = useContext(BadgeSettingsContext);
    if (!context) {
        throw new Error('useBadgeSettings must be used within a BadgeSettingsProvider');
    }
    return context;
};
