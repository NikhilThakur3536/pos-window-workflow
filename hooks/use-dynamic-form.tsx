import { useFormStore } from '@/stores/form-store';
import type { FormConfig } from '@/types/form.types';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export function useDynamicForm(config: FormConfig, initialData?: Record<string, any>) {
    const { updateFormData, setLoading, setErrors, clearErrors } = useFormStore();

    const generateValidationSchema = (config: FormConfig) => {
        const schemaFields: Record<string, z.ZodTypeAny> = {};

        config.sections.forEach((section) => {
            section.fields.forEach((field) => {
                let fieldSchema: z.ZodTypeAny;

                // Base schema based on field type
                switch (field.type) {
                    case 'number':
                    case 'currency':
                    case 'percentage':
                        fieldSchema = z.coerce.number({ error: 'Empty value is not allowed' });
                        break;
                    case 'date':
                        fieldSchema = z.coerce.date({ error: 'Empty value is not allowed' });
                        break;
                    case 'checkbox':
                        fieldSchema = z.coerce.boolean({ error: 'Empty value is not allowed' });
                        break;
                    case 'multiselect':
                        fieldSchema = z.array(z.string());
                        break;
                    default:
                        fieldSchema = z.string({ error: 'Empty value is not allowed' });
                }

                // Apply validation rules
                if (field.validation?.rules) {
                    field.validation.rules.forEach((rule) => {
                        switch (rule.type) {
                            case 'required':
                                if (field.type === 'checkbox') {
                                    fieldSchema = (fieldSchema as z.ZodBoolean).refine((val) => val === true, {
                                        message: rule.message || `${field.label} is required`,
                                    });
                                } else if (field.type === 'date') {
                                    fieldSchema = fieldSchema.refine((val) => val != null, {
                                        message: rule.message || `${field.label} is required`,
                                    });
                                } else if (field.type === 'multiselect') {
                                    fieldSchema = (fieldSchema as z.ZodArray<any>).min(
                                        1,
                                        rule.message || `${field.label} is required`,
                                    );
                                } else {
                                    fieldSchema = (fieldSchema as z.ZodString).min(
                                        1,
                                        rule.message || `${field.label} is required`,
                                    );
                                }
                                break;
                            case 'min':
                                if (
                                    field.type === 'number' ||
                                    field.type === 'currency' ||
                                    field.type === 'percentage'
                                ) {
                                    fieldSchema = (fieldSchema as z.ZodNumber).min(rule.value, rule.message);
                                } else if (field.type === 'date') {
                                    const minDate = new Date(rule.value);
                                    fieldSchema = (fieldSchema as z.ZodDate).min(minDate, rule.message);
                                } else {
                                    fieldSchema = (fieldSchema as z.ZodString).min(rule.value, rule.message);
                                }
                                break;
                            case 'max':
                                if (
                                    field.type === 'number' ||
                                    field.type === 'currency' ||
                                    field.type === 'percentage'
                                ) {
                                    fieldSchema = (fieldSchema as z.ZodNumber).max(rule.value, rule.message);
                                } else if (field.type === 'date') {
                                    const maxDate = new Date(rule.value);
                                    fieldSchema = (fieldSchema as z.ZodDate).max(maxDate, rule.message);
                                } else {
                                    fieldSchema = (fieldSchema as z.ZodString).max(rule.value, rule.message);
                                }
                                break;
                            case 'pattern':
                                if (field.type === 'text' || field.type === 'textarea') {
                                    fieldSchema = (fieldSchema as z.ZodString).regex(
                                        new RegExp(rule.value),
                                        rule.message || 'Invalid format',
                                    );
                                }
                                break;
                            case 'custom':
                                fieldSchema = fieldSchema.refine((value) => {
                                    if (rule.customValidator) {
                                        const result = rule.customValidator(value, {});
                                        return typeof result === 'boolean' ? result : false;
                                    }
                                    return true;
                                }, rule.message || 'Invalid value');
                                break;
                        }
                    });
                }

                // Make optional if not required
                if (!field.required) {
                    fieldSchema = fieldSchema.optional();
                }

                schemaFields[field.id] = fieldSchema;
            });
        });

        return z.object(schemaFields);
    };

    const validationSchema = generateValidationSchema(config);

    // Process initial data to handle date fields and default values
    const processInitialData = (data?: Record<string, any>) => {
        const processedData: Record<string, any> = { ...data };

        config.sections.forEach((section) => {
            section.fields.forEach((field) => {
                // Handle default values
                if (field.defaultValue !== undefined && processedData[field.id] === undefined) {
                    if (field.defaultValue === 'today' && field.type === 'date') {
                        processedData[field.id] = new Date();
                    } else {
                        processedData[field.id] = field.defaultValue;
                    }
                }

                // Convert date strings to Date objects
                if (field.type === 'date' && processedData[field.id]) {
                    if (typeof processedData[field.id] === 'string') {
                        processedData[field.id] = new Date(processedData[field.id]);
                    }
                }

                // Handle number fields
                if (
                    (field.type === 'number' || field.type === 'currency' || field.type === 'percentage') &&
                    processedData[field.id]
                ) {
                    if (typeof processedData[field.id] === 'string') {
                        processedData[field.id] = Number(processedData[field.id]);
                    }
                }

                // Handle multiselect fields
                if (field.type === 'multiselect' && !Array.isArray(processedData[field.id])) {
                    processedData[field.id] = processedData[field.id] ? [processedData[field.id]] : [];
                }
            });
        });

        return processedData;
    };

    const form = useForm({
        resolver: zodResolver(validationSchema),
        defaultValues: processInitialData(initialData),
        mode: 'onChange',
    });

    const defaultHandleSubmit = async (data: Record<string, any>) => {
        try {
            setLoading(true);
            clearErrors();

            // Process form data before submission
            const processedData = { ...data };

            // Convert dates to ISO strings for API submission
            config.sections.forEach((section) => {
                section.fields.forEach((field) => {
                    if (field.type === 'date' && processedData[field.id] instanceof Date) {
                        processedData[field.id] = processedData[field.id].toISOString();
                    }
                });
            });

            // Update form store
            updateFormData(config.id, processedData);

            // Here you would typically make an API call
            console.log('Form submitted:', processedData);

            return { success: true, data: processedData };
        } catch (error) {
            console.error('Form submission error:', error);
            setErrors({ general: ['An error occurred while submitting the form'] });
            return { success: false, error };
        } finally {
            setLoading(false);
        }
    };

    return {
        form,
        handleSubmit: () => defaultHandleSubmit,
        isLoading: useFormStore((state) => state.loading),
        errors: useFormStore((state) => state.errors),
    };
}
