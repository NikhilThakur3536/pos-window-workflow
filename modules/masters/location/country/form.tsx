'use client';

import { useEffect } from 'react';
import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

import {
  companyCountryAddSchema,
  useCreateCompanyCountry,
  useEditCompanyCountry,
  useGetCompanyRegions,
  useGetCompanySubRegions,
  CompanyCountry,
} from '@/api-queries/company-location';

type CountryFormValues = z.infer<typeof companyCountryAddSchema>;

interface CompanyCountryFormProps {
  open: boolean;
  onClose: () => void;
  editData: CompanyCountry | null;
}

const CompanyCountryForm = ({ open, editData, onClose }: CompanyCountryFormProps) => {
  const isEditing = !!editData;
  const createCompanyCountry = useCreateCompanyCountry();
  const editCompanyCountry = useEditCompanyCountry();

  const { data: regionsData, isLoading: isRegionsLoading } = useGetCompanyRegions();
  const regions = regionsData?.data?.rows || [];

  const form = useForm<CountryFormValues>({
    resolver: zodResolver(companyCountryAddSchema),
    defaultValues: {
      name: editData?.name || '',
      code: editData?.code || '',
      timezone: editData?.timezone || moment.tz.guess(),
      regionId: editData?.regionId || '',
      subRegionId: editData?.subRegionId || '',
    },
  });

  const { handleSubmit, control, watch, setValue } = form;

  const selectedRegionId = watch('regionId');

  const { data: subRegionsData, isLoading: isSubRegionsLoading } = useGetCompanySubRegions({
    regionId: selectedRegionId || '',
  });
  const subRegions = subRegionsData?.data?.rows || [];

  useEffect(() => {
    form.reset({
      name: editData?.name || '',
      code: editData?.code || '',
      timezone: editData?.timezone || moment.tz.guess(),
      regionId: editData?.regionId || '',
      subRegionId: editData?.subRegionId || '',
    });
  }, [editData, open]);

  const handleRegionChange = (value: string) => {
    setValue('regionId', value);
    setValue('subRegionId', '');
  };

  function onSubmit(values: CountryFormValues) {
    if (isEditing && editData) {
      editCompanyCountry.mutate(
        { id: editData.id, ...values },
        {
          onSuccess: (data) => {
            if (data) {
              toast.success('Country updated successfully');
              form.reset();
              onClose();
            } else {
              toast.error('Failed to update country');
            }
          },
          onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
          },
        }
      );
    } else {
      createCompanyCountry.mutate(values, {
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
  }

  function onOpenChange() {
    form.reset();
    onClose();
  }

  const isSaving = createCompanyCountry.isPending || editCompanyCountry.isPending;

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

              <div className="flex items-start gap-4">
                <Label htmlFor="regionId" className="mt-2 min-w-[120px] text-sm font-medium">
                  Region
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="regionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select
                            value={field.value || ''}
                            onValueChange={handleRegionChange}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={isRegionsLoading ? 'Loading regions...' : 'Select region'}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {regions.map((region) => (
                                <SelectItem key={region.id} value={region.id}>
                                  {region.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Label htmlFor="subRegionId" className="mt-2 min-w-[120px] text-sm font-medium">
                  Sub Region
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="subRegionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select
                            value={field.value || ''}
                            onValueChange={(value) => setValue('subRegionId', value)}
                            disabled={!selectedRegionId}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !selectedRegionId
                                    ? 'Select a region first'
                                    : isSubRegionsLoading
                                    ? 'Loading sub regions...'
                                    : 'Select sub region'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {subRegions.map((subRegion) => (
                                <SelectItem key={subRegion.id} value={subRegion.id}>
                                  {subRegion.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
              <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyCountryForm;