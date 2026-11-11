'use client';

import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

import {
  countrySchema,
  useCreateDomainCountry,
  DomainLocationItem
} from '@/api-queries/domain-location-master';

type CountryFormValues = z.infer<typeof countrySchema>;

interface DomainCountryFormProps {
  open: boolean;
  onClose: () => void;
  editData: DomainLocationItem | null;
}

const DomainCountryForm = ({ open, editData, onClose }: DomainCountryFormProps) => {
  const isEditing = !!editData;
  const createDomainCountry = useCreateDomainCountry();

  const form = useForm<CountryFormValues>({
    resolver: zodResolver(countrySchema),
    defaultValues: {
      name: editData?.name || '',
      code: editData?.code || '',
      timezone: editData?.timezone || moment.tz.guess(),
      domainId: editData?.domainId || '', // You may want to get this dynamically
    },
  });

  const { handleSubmit, control } = form;

  function onSubmit(values: CountryFormValues) {
    createDomainCountry.mutate(values, {
      onSuccess: (data) => {
        if (data) {
          toast.success('Country created successfully');
          form.reset();
          onClose();
        } else {
          toast.error('Failed to create country');
        }
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Internal Server Error!');
      },
    });
  }

  function onOpenChange() {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Country' : 'Create Country'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="mb-0 grid gap-6 py-4">
              <div className="flex items-start gap-4">
                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                  Country Name <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. India" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                  Country Code <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. IN" {...field} />
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
                          <Input placeholder="e.g. Asia/Kolkata" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* You can add domainId as hidden or select field if needed */}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDomainCountry.isPending} className="bg-blue-600 hover:bg-blue-700">
                {createDomainCountry.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DomainCountryForm;