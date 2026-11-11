'use client';

import type { ConditionalConfig, FormConfig } from '@/types/form.types';
import { useMemo } from 'react';

export function useConditionalFields(config: FormConfig, watchFn: any) {
    const watchedValues = watchFn();

    const conditionalFields = useMemo(() => {
        const result: Record<string, boolean> = {};

        const evaluateCondition = (condition: ConditionalConfig, values: any): boolean => {
            if (!condition) return true;

            const fieldValue = values[condition.field];
            let conditionMet = false;

            switch (condition.operator) {
                case 'equals':
                    conditionMet = fieldValue === condition.value;
                    break;
                case 'not_equals':
                    conditionMet = fieldValue !== condition.value;
                    break;
                case 'greater_than':
                    conditionMet = Number(fieldValue) > Number(condition.value);
                    break;
                case 'less_than':
                    conditionMet = Number(fieldValue) < Number(condition.value);
                    break;
                case 'contains':
                    conditionMet = String(fieldValue).includes(String(condition.value));
                    break;
                case 'not_empty':
                    conditionMet = fieldValue != null && fieldValue !== '';
                    break;
            }

            if (condition.conditions && condition.conditions.length > 0) {
                const subResults = condition.conditions.map((subCondition) => evaluateCondition(subCondition, values));

                if (condition.logicalOperator === 'OR') {
                    conditionMet = conditionMet || subResults.some(Boolean);
                } else {
                    conditionMet = conditionMet && subResults.every(Boolean);
                }
            }

            return conditionMet;
        };

        config.sections.forEach((section) => {
            // Check section conditional
            const sectionVisible = section.conditional ? evaluateCondition(section.conditional, watchedValues) : true;

            section.fields.forEach((field) => {
                if (field.conditional) {
                    result[field.id] = sectionVisible && evaluateCondition(field.conditional, watchedValues);
                } else {
                    result[field.id] = sectionVisible;
                }
            });
        });

        return result;
    }, [config, watchedValues]);

    return { watchedValues, conditionalFields };
}
