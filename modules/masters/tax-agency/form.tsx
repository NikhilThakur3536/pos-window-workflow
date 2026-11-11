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
  taxAgencySchema,
  useCreateTaxAgency,
  useUpdateTaxAgency,
  TaxAgencySchema,
  TaxAgencyDetails,
} from '@/api-queries/tax-master';

interface TaxAgencyFormProps {
  open: boolean;
  onClose: () => void;
  editData: TaxAgencyDetails | null;
}

const TaxAgencyForm = ({ open, editData, onClose }: TaxAgencyFormProps) => {
  const isEditing = !!editData;
  const createMutation = useCreateTaxAgency();
  const updateMutation = useUpdateTaxAgency();

  const form = useForm<TaxAgencySchema>({
    resolver: zodResolver(taxAgencySchema),
    defaultValues: {
      code: editData?.code || 0,
      description: editData?.description || '',
      timezone: editData?.timezone || moment.tz.guess(),
      domainId: editData?.domainId || '',
      companyId: editData?.companyId || '',
    },
  });

  const { handleSubmit, control } = form;

  function onSubmit(values: TaxAgencySchema) {
    if (isEditing && editData?.id) {
      updateMutation.mutate(
        { id: editData.id, data: values },
        {
          onSuccess: (data) => {
            if (data.success) {
              toast.success('Tax Agency updated successfully');
              onClose();
            }
          },
          onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Update failed');
          },
        }
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: (data) => {
          if (data.success) {
            toast.success('Tax Agency created successfully');
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
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Tax Agency' : 'Create Tax Agency'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="mb-0 grid gap-6 py-4">
              <div className="flex items-start gap-4">
                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                  Code <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="number" placeholder="Enter code" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Label htmlFor="description" className="min-w-[120px] text-sm font-medium">
                  Description <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter description" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Label htmlFor="timezone" className="min-w-[120px] text-sm font-medium">
                  Timezone <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. Asia/Kolkata" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Label htmlFor="domainId" className="min-w-[120px] text-sm font-medium">
                  Domain ID <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="domainId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter Domain ID" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Label htmlFor="companyId" className="min-w-[120px] text-sm font-medium">
                  Company ID <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter Company ID" {...field} />
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

export default TaxAgencyForm;