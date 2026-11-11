import type { ConditionalConfig } from '@/types/form.types';
import type React from 'react';

interface ConditionalWrapperProps {
    children: React.ReactNode;
    condition?: ConditionalConfig;
    watchedValues: Record<string, any>;
    visible?: boolean;
}

export function ConditionalWrapper({ children, condition, watchedValues, visible = true }: ConditionalWrapperProps) {
    if (!visible) {
        return null;
    }

    if (!condition) {
        return <>{children}</>;
    }

    const evaluateCondition = (cond: ConditionalConfig): boolean => {
        const fieldValue = watchedValues[cond.field];
        let conditionMet = false;

        switch (cond.operator) {
            case 'equals':
                conditionMet = fieldValue === cond.value;
                break;
            case 'not_equals':
                conditionMet = fieldValue !== cond.value;
                break;
            case 'greater_than':
                conditionMet = Number(fieldValue) > Number(cond.value);
                break;
            case 'less_than':
                conditionMet = Number(fieldValue) < Number(cond.value);
                break;
            case 'contains':
                conditionMet = String(fieldValue).includes(String(cond.value));
                break;
            case 'not_empty':
                conditionMet = fieldValue != null && fieldValue !== '';
                break;
        }

        if (cond.conditions && cond.conditions.length > 0) {
            const subResults = cond.conditions.map((subCondition) => evaluateCondition(subCondition));

            if (cond.logicalOperator === 'OR') {
                conditionMet = conditionMet || subResults.some(Boolean);
            } else {
                conditionMet = conditionMet && subResults.every(Boolean);
            }
        }

        return conditionMet;
    };

    const shouldShow = evaluateCondition(condition);

    return shouldShow ? <>{children}</> : null;
}
