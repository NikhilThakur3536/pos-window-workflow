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
import { Switch } from '@/components/ui/switch';

import {
  companyTaxRegistrationSchema,
  useCreateCompanyTaxRegistration,
  useUpdateCompanyTaxRegistration,
  CompanyTaxRegistrationSchema,
  CompanyTaxRegistrationDetails
} from '@/api-queries/company-tax-resgistration';

interface CompanyTaxRegistrationFormProps {
  open: boolean;
  onClose: () => void;
  editData: CompanyTaxRegistrationDetails | null;
}

const CompanyTaxRegistrationForm = ({ open, editData, onClose }: CompanyTaxRegistrationFormProps) => {
  const isEditing = !!editData;
  const createMutation = useCreateCompanyTaxRegistration();
  const updateMutation = useUpdateCompanyTaxRegistration();

  const form = useForm<CompanyTaxRegistrationSchema>({
    resolver: zodResolver(companyTaxRegistrationSchema),
    defaultValues: {
      countryId: editData?.countryId || '',
      registrationNumber: editData?.registrationNumber || '',
      registrationType: editData?.registrationType || '',
      isPrimary: editData?.isPrimary || false,
      timezone: editData?.timezone || moment.tz.guess(),
    },
  });

  const { handleSubmit, control } = form;

  function onSubmit(values: CompanyTaxRegistrationSchema) {
    if (isEditing && editData?.id) {
      updateMutation.mutate(
        { id: editData.id, data: values },
        {
          onSuccess: (data) => {
            if (data.success) {
              toast.success('Tax Registration updated successfully');
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
            toast.success('Tax Registration created successfully');
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
          <DialogTitle>
            {isEditing ? 'Edit Tax Registration' : 'Add Tax Registration'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="countryId">Country <MandatoryField /></Label>
                <FormField
                  control={control}
                  name="countryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Enter Country ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="registrationNumber">Registration Number <MandatoryField /></Label>
                <FormField
                  control={control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="e.g. GSTIN123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="registrationType">Registration Type <MandatoryField /></Label>
                <FormField
                  control={control}
                  name="registrationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="e.g. GST, VAT, TIN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <Label>Is Primary Registration</Label>
                  </FormItem>
                )}
              />

              <div>
                <Label htmlFor="timezone">Timezone <MandatoryField /></Label>
                <FormField
                  control={control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="e.g. Asia/Kolkata" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending 
                  ? 'Saving...' 
                  : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyTaxRegistrationForm;