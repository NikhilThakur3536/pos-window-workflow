'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useGetShortcutsList, type ShortcutRecord } from '@/api-queries/shortcuts';
import { useTillSessionState } from '@/stores/till-session.store';
import { useAuthUser } from '@/stores/auth-user.store';

interface LaunchPayload {
    programPath: string;
    programParameters?: string;
    sendDomainContext?: boolean;
    domainContext?: { domainId?: string; companyId?: string };
    authToken?: string;
}

interface TillShortcutElectronApi {
    launchProgram?: (payload: LaunchPayload) => Promise<{ success?: boolean; message?: string } | void>;
}

function getElectronAPI(): TillShortcutElectronApi | undefined {
    if (typeof window === 'undefined') return undefined;
    return (window as unknown as { electronAPI?: TillShortcutElectronApi }).electronAPI;
}

// Normalizes a registered combo like "F3", "SHIFT+F5", "Ctrl+F1" into
// canonical "MOD+KEY" (uppercase) form used for comparison.
function normalizeCombo(combo: string): string {
    return combo
        .split('+')
        .map((part) => {
            const p = part.trim().toUpperCase();
            if (p === 'CONTROL' || p === 'CTRL') return 'CTRL';
            if (p === 'COMMAND' || p === 'META') return 'META';
            return p;
        })
        .filter(Boolean)
        .join('+');
}

// Same canonical form, built from an actual KeyboardEvent.
function eventCombo(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('CTRL');
    if (event.shiftKey) parts.push('SHIFT');
    if (event.altKey) parts.push('ALT');
    if (event.metaKey) parts.push('META');

    if (!event.key) return parts.join('+');
    const key = event.key.toUpperCase();
    if (!['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) {
        parts.push(key);
    }
    return parts.join('+');
}

// While typing in a form field we only honour combos that include a modifier
// or a function key (e.g. F3, SHIFT+F5); bare letters/digits never hijack input.
function shouldIgnoreInField(combo: string, event: KeyboardEvent): boolean {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    if (!isEditable) return false;

    const hasModifier = combo.includes('+');
    const isFunctionKey = /^F\d{1,2}$/.test(combo.split('+').pop() || '');
    return !(hasModifier || isFunctionKey);
}

const TillShortcutHandler = () => {
    const router = useRouter();

    const query = useGetShortcutsList({ limit: 1000, offset: 0 });
    const shortcuts: ShortcutRecord[] = Array.isArray(query?.data?.data)
        ? query.data.data
        : (query.data?.data?.rows || []);

    const currentTillId = useTillSessionState((state) => state.tillSession?.tillId);

    // Maps a normalized key combo to the most specific active record:
    // company-wide MENU shortcuts first (tillId null), then till-scoped
    // external shortcuts for the currently open till override the same combo.
    const comboMap = useMemo(() => {
        const map = new Map<string, ShortcutRecord>();
        const active = shortcuts.filter((r) => r.keyCombo && r.isActive !== false);

        for (const record of active) {
            if (!record.tillId) map.set(normalizeCombo(record.keyCombo as string), record);
        }
        for (const record of active) {
            if (record.tillId && record.tillId === currentTillId) {
                map.set(normalizeCombo(record.keyCombo as string), record);
            }
        }
        return map;
    }, [shortcuts, currentTillId]);

    const mapRef = useRef(comboMap);
    mapRef.current = comboMap;

    const handleNavigation = (record: ShortcutRecord) => {
        const href = record.menu?.href;
        if (!href) {
            toast.error('Shortcut has no target menu configured.');
            return;
        }
        if (/^https?:\/\//i.test(href)) {
            window.open(href, '_blank', 'noopener,noreferrer');
        } else {
            router.push(href);
        }
    };

    const handleExternal = (record: ShortcutRecord) => {
        const programPath = record.programPath || '';
        if (/^https?:\/\//i.test(programPath)) {
            window.open(programPath, '_blank', 'noopener,noreferrer');
            return;
        }

        const electronAPI = getElectronAPI();
        if (electronAPI?.launchProgram) {
            const company = useAuthUser.getState().company;
            electronAPI
                .launchProgram({
                    programPath,
                    programParameters: record.programParameters || undefined,
                    sendDomainContext: record.sendDomainContext === true,
                    domainContext:
                        record.sendDomainContext === true
                            ? {
                                  domainId: useTillSessionState.getState().tillSession?.domainId,
                                  companyId: company?.id,
                              }
                            : undefined,
                    authToken: useAuthUser.getState().user?.token,
                })
                .catch(() => toast.error('Failed to launch external program.'));
            return;
        }

        toast.info('External shortcut is only available in the desktop POS app.', {
            description: programPath + (record.programParameters ? ` ${record.programParameters}` : ''),
        });
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.repeat || event.defaultPrevented) return;

            const combo = eventCombo(event);
            if (!combo) return;

            const record = mapRef.current.get(combo);
            if (!record) return;
            if (shouldIgnoreInField(combo, event)) return;

            event.preventDefault();
            if (record.type === 'MENU' || (!record.type && record.menuId)) {
                handleNavigation(record);
            } else {
                handleExternal(record);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return null;
};

export default TillShortcutHandler;