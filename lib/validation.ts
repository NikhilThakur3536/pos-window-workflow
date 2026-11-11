import type { FormFieldConfig, ValidationRule } from '@/types/form.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateField(value: any, field: FormFieldConfig, formData: Record<string, any>): string[] {
    const errors: string[] = [];

    if (!field.validation?.rules) return errors;

    for (const rule of field.validation.rules) {
        const error = validateRule(value, rule, field, formData);
        if (error) {
            errors.push(error);
        }
    }

    return errors;
}

function validateRule(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    rule: ValidationRule,
    field: FormFieldConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData: Record<string, any>,
): string | null {
    switch (rule.type) {
        case 'required':
            if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
                return rule.message || `${field.label} is required`;
            }
            break;

        case 'min':
            if (typeof value === 'string' && value.length < rule.value) {
                return rule.message || `${field.label} must be at least ${rule.value} characters`;
            }
            if (typeof value === 'number' && value < rule.value) {
                return rule.message || `${field.label} must be at least ${rule.value}`;
            }
            break;

        case 'max':
            if (typeof value === 'string' && value.length > rule.value) {
                return rule.message || `${field.label} must be no more than ${rule.value} characters`;
            }
            if (typeof value === 'number' && value > rule.value) {
                return rule.message || `${field.label} must be no more than ${rule.value}`;
            }
            break;

        case 'pattern':
            if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
                return rule.message || `${field.label} format is invalid`;
            }
            break;

        case 'custom':
            if (rule.customValidator) {
                const result = rule.customValidator(value, formData);
                if (typeof result === 'string') {
                    return result;
                }
                if (result === false) {
                    return rule.message || `${field.label} is invalid`;
                }
            }
            break;
    }

    return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateForm(formData: Record<string, any>, fields: FormFieldConfig[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    fields.forEach((field) => {
        const fieldErrors = validateField(formData[field.id], field, formData);
        if (fieldErrors.length > 0) {
            errors[field.id] = fieldErrors;
        }
    });

    return errors;
}
