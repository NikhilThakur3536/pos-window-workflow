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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  stateMasterCreateSchema,
  stateMasterUpdateSchema,
  useCreateStateMaster,
  useUpdateStateMaster,
  StateMasterCreateSchema,
  StateMasterUpdateSchema,
  StateMasterDetails,
} from '@/api-queries/state-master';

import { useGetCompanyCountries,FilterProps } from '@/api-queries/locations/country';

interface StateMasterFormProps {
  open: boolean;
  onClose: () => void;
  editData: StateMasterDetails | null;
}

const StateMasterForm = ({ open, editData, onClose }: StateMasterFormProps) => {
  const isEditing = !!editData;
  const createMutation = useCreateStateMaster();
  const updateMutation = useUpdateStateMaster();

  // Fetch Company Countries for dropdown
  const { data: countriesData, isLoading: isCountriesLoading } = useGetCompanyCountries({
    page: 1,
    limit: 100,
  } as FilterProps);

  const countries = countriesData?.data || [];

  const form = useForm<StateMasterCreateSchema | StateMasterUpdateSchema>({
    resolver: zodResolver(isEditing ? stateMasterUpdateSchema : stateMasterCreateSchema),
    defaultValues: {
      name: editData?.name || '',
      code: editData?.code || '',
      countryId: editData?.countryId || '',
      timezone: editData?.timezone || moment.tz.guess(),
      ...(editData && { stateId: editData.id }),
    },
  });

  const { handleSubmit, control } = form;

  function onSubmit(values: StateMasterCreateSchema | StateMasterUpdateSchema) {
    if (isEditing && editData) {
      updateMutation.mutate(values as StateMasterUpdateSchema, {
        onSuccess: (data) => {
          if (data.success) {
            toast.success('State updated successfully');
            onClose();
          }
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Update failed');
        },
      });
    } else {
      createMutation.mutate(values as StateMasterCreateSchema, {
        onSuccess: (data) => {
          if (data.success) {
            toast.success('State created successfully');
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
          <DialogTitle>{isEditing ? 'Edit State' : 'Add New State'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="mb-0 grid gap-6 py-4">
              <div className="flex items-start gap-4">
                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                  State Name <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. Maharashtra, California" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                  State Code <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. MH, CA" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Updated Country Dropdown */}
              <div className="flex items-start gap-4">
                <Label htmlFor="countryId" className="min-w-[120px] text-sm font-medium">
                  Country <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="countryId"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {isCountriesLoading ? (
                              <SelectItem value="" disabled>Loading countries...</SelectItem>
                            ) : (
                              countries?.rows.map((country: any) => (
                                <SelectItem key={country.id} value={country.id}>
                                  {country.name} ({country.code || country.isoCode})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>

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

export default StateMasterForm;