import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FormSection as FormSectionType } from '@/types/form.types';
import type { UseFormReturn } from 'react-hook-form';

import { ConditionalWrapper } from './conditional-wrapper';
import { FieldRenderer } from './field-renderer';

interface FormSectionProps {
    section: FormSectionType;
    form: UseFormReturn<any>;
    conditionalFields: Record<string, boolean>;
    watchedValues: Record<string, any>;
}

export function FormSection({ section, form, conditionalFields, watchedValues }: FormSectionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div
                    className={`grid gap-4 ${section.gridColumns ? `grid-cols-${section.gridColumns}` : 'grid-cols-1'}`}
                >
                    {section.fields.map((field) => (
                        <ConditionalWrapper
                            key={field.id}
                            condition={field.conditional}
                            watchedValues={watchedValues}
                            visible={conditionalFields[field.id]}
                        >
                            <FieldRenderer field={field} form={form} />
                        </ConditionalWrapper>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
