import { ConditionalWrapper } from '@/components/dynamic-form/conditional-wrapper';
import { FormSection } from '@/components/dynamic-form/form-section';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useConditionalFields } from '@/hooks/use-conditional-fields';
import { useDynamicForm } from '@/hooks/use-dynamic-form';
import type { FormConfig } from '@/types/form.types';
import { Loader2 } from 'lucide-react';

interface DynamicFormProps {
    config: FormConfig;
    initialData?: Record<string, any>;
    onSubmit?: (data: Record<string, any>) => Promise<void> | void;
    loading?: boolean;
}

export function DynamicForm({ config, initialData, onSubmit, loading: externalLoading }: DynamicFormProps) {
    const { form, handleSubmit, isLoading } = useDynamicForm(config, initialData);
    const { watchedValues, conditionalFields } = useConditionalFields(config, form.watch);

    const loading = externalLoading || isLoading;

    const onFormSubmit = async (data: Record<string, any>) => {
        try {
            if (onSubmit) {
                await onSubmit(data);
            } else {
                // Use the default handler from useDynamicForm
                await handleSubmit();
            }
        } catch (error) {
            console.error('Form submission error:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{config.title}</h1>
                {config.description && <p className="text-muted-foreground mt-2">{config.description}</p>}
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
                    {config.sections.map((section) => (
                        <ConditionalWrapper
                            key={section.id}
                            condition={section.conditional}
                            watchedValues={watchedValues}
                        >
                            <FormSection
                                section={section}
                                form={form}
                                conditionalFields={conditionalFields}
                                watchedValues={watchedValues}
                            />
                        </ConditionalWrapper>
                    ))}

                    <div className="flex justify-end space-x-4">
                        <Button type="button" variant="outline" onClick={() => form.reset()} disabled={loading}>
                            Reset
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
