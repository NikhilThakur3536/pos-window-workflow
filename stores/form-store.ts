import type { FormConfig } from '@/types/form.types';
import { create } from 'zustand';

interface FormState {
    forms: Record<string, FormConfig>;
    currentForm: string | null;
    formData: Record<string, Record<string, any>>;
    loading: boolean;
    errors: Record<string, string[]>;
}

interface FormActions {
    setForm: (formId: string, config: FormConfig) => void;
    setCurrentForm: (formId: string) => void;
    updateFormData: (formId: string, data: Record<string, any>) => void;
    clearFormData: (formId: string) => void;
    setLoading: (loading: boolean) => void;
    setErrors: (errors: Record<string, string[]>) => void;
    clearErrors: () => void;
}

export const useFormStore = create<FormState & FormActions>((set, get) => ({
    forms: {},
    currentForm: null,
    formData: {},
    loading: false,
    errors: {},

    setForm: (formId, config) =>
        set((state) => ({
            forms: { ...state.forms, [formId]: config },
        })),

    setCurrentForm: (formId) => set({ currentForm: formId }),

    updateFormData: (formId, data) =>
        set((state) => ({
            formData: {
                ...state.formData,
                [formId]: { ...state.formData[formId], ...data },
            },
        })),

    clearFormData: (formId) =>
        set((state) => ({
            formData: { ...state.formData, [formId]: {} },
        })),

    setLoading: (loading) => set({ loading }),

    setErrors: (errors) => set({ errors }),

    clearErrors: () => set({ errors: {} }),
}));
