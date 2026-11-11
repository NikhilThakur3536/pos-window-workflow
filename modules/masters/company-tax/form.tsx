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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  companyTaxRateSchema,
  useCreateCompanyTaxRate,
  useUpdateCompanyTaxRate,
  CompanyTaxRateSchema,
  CompanyTaxRateDetails
} from '@/api-queries/company-tax-rate-master';
import { toNumberOrNil } from '@/utils/helpers';

interface CompanyTaxRateFormProps {
  open: boolean;
  onClose: () => void;
  editData: CompanyTaxRateDetails | null;
}

const CompanyTaxRateForm = ({ open, editData, onClose }: CompanyTaxRateFormProps) => {
  const isEditing = !!editData;
  const createMutation = useCreateCompanyTaxRate();
  const updateMutation = useUpdateCompanyTaxRate();

  const form = useForm<CompanyTaxRateSchema>({
    resolver: zodResolver(companyTaxRateSchema),
    defaultValues: {
      type: editData?.type || 'TAX-RATE',
      internalTaxId: editData?.internalTaxId || 0,
      name: editData?.name || '',
      description: editData?.description || '',
      taxRatePercent: editData?.taxRatePercent || 0,
      taxOnly: editData?.taxOnly || false,
      default: editData?.default || false,
      priorityRate: editData?.priorityRate || false,
      userSelectable: editData?.userSelectable || false,
      startDate: editData?.startDate || '',
      endDate: editData?.endDate || null,
      taxAgencyId: editData?.taxAgencyId || '',
      taxInputControlAccountId: editData?.taxInputControlAccountId || '',
      taxOutputControlAccountId: editData?.taxOutputControlAccountId || '',
      positionTaxReportInput: editData?.positionTaxReportInput || '',
      positionTaxReportOutput: editData?.positionTaxReportOutput || '',
      timezone: editData?.timezone || moment.tz.guess(),
      locations: editData?.locations || [],
    },
  });

  const { handleSubmit, control } = form;

  function onSubmit(values: CompanyTaxRateSchema) {
    if (isEditing && editData?.id) {
      updateMutation.mutate(
        { id: editData.id, data: values },
        {
          onSuccess: (data) => {
            if (data.success) {
              toast.success('Tax Rate updated successfully');
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
            toast.success('Tax Rate created successfully');
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
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Tax Rate' : 'Create Tax Rate'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name <MandatoryField /></Label>
                <FormField control={control} name="name" render={({ field }) => (
                  <FormItem><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div>
                <Label>Type <MandatoryField /></Label>
                <FormField control={control} name="type" render={({ field }) => (
                  <FormItem><FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TAX-RATE">TAX-RATE</SelectItem>
                        <SelectItem value="TAX-RATE-VARIATION">TAX-RATE-VARIATION</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Tax Details */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tax Rate % <MandatoryField /></Label>
                <FormField control={control} name="taxRatePercent" render={({ field }) => (
                  <FormItem><FormControl><Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(toNumberOrNil(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div>
                <Label>Internal Tax ID</Label>
                <FormField control={control} name="internalTaxId" render={({ field }) => (
                  <FormItem><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(toNumberOrNil(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              {/* Tax Rate ID is auto-generated by the server, so exposed to the user */}
              </div>

            {/* Switches */}
            <div className="grid grid-cols-2 gap-6">
              <FormField control={control} name="taxOnly" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <Label>Tax Only</Label>
                </FormItem>
              )} />

              <FormField control={control} name="default" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <Label>Default Rate</Label>
                </FormItem>
              )} />
            </div>

            {/* More fields can be added similarly (Accounts, Positions, Dates, etc.) */}

            <div className="flex justify-end gap-3 pt-4">
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

export default CompanyTaxRateForm;