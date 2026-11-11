'use client';

import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

import {
  languageMasterCreateSchema,
  languageMasterUpdateSchema,
  useCreateLanguageMaster,
  useUpdateLanguageMaster,
  LanguageMasterCreateSchema,
  LanguageMasterUpdateSchema,
  LanguageMasterDetails,
} from '@/api-queries/language';

interface LanguageMasterFormProps {
  open: boolean;
  onClose: () => void;
  editData: LanguageMasterDetails | null;
}

const LanguageMasterForm = ({ open, editData, onClose }: LanguageMasterFormProps) => {
  const isEditing = !!editData;
  const createMutation = useCreateLanguageMaster();
  const updateMutation = useUpdateLanguageMaster();

  const form = useForm<LanguageMasterCreateSchema | LanguageMasterUpdateSchema>({
    resolver: zodResolver(isEditing ? languageMasterUpdateSchema : languageMasterCreateSchema),
    defaultValues: {
      name: editData?.name || '',
      code: editData?.code || '',
      timezone: editData?.timezone || moment.tz.guess(),
      ...(editData && { languageId: editData.id }),
    },
  });

  const { handleSubmit, control } = form;

  function onSubmit(values: LanguageMasterCreateSchema | LanguageMasterUpdateSchema) {
    if (isEditing && editData) {
      updateMutation.mutate(values as LanguageMasterUpdateSchema, {
        onSuccess: (data) => {
          if (data.success) {
            toast.success('Language updated successfully');
            onClose();
          }
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Update failed');
        },
      });
    } else {
      createMutation.mutate(values as LanguageMasterCreateSchema, {
        onSuccess: (data) => {
          if (data.success) {
            toast.success('Language created successfully');
            form.reset();
            onClose();
          }
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Creation failed');
        },
      });
    }
  }

  function onOpenChange() {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Language' : 'Add New Language'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="mb-0 grid gap-6 py-4">
              <div className="flex items-start gap-4">
                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                  Language Name <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. English, French, Hindi" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                  Language Code <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. en, fr, hi" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Label htmlFor="timezone" className="mt-2 min-w-[120px] text-sm font-medium">
                  Timezone <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. Asia/Kolkata, UTC" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default LanguageMasterForm;