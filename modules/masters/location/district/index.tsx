'use client';

import { useEffect, useState } from 'react';
import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Edit, Trash2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';

import {
  useGetCompanyCountries,
  useGetCompanyStates,
  useGetCompanyDistricts,
  useCreateCompanyDistrict,
  useEditCompanyDistrict,
  useRemoveCompanyDistrict,
  CompanyDistrict,
} from '@/api-queries/company-location';

const districtFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

type DistrictFormValues = z.infer<typeof districtFormSchema>;

const CompanyDistrictSection = () => {
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<CompanyDistrict | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CompanyDistrict | null>(null);

  const { data: countriesData, isLoading: isCountriesLoading } = useGetCompanyCountries();
  const countries = countriesData?.data?.rows || [];

  const { data: statesData, isLoading: isStatesLoading } = useGetCompanyStates({
    countryId: selectedCountryId,
  });
  const states = statesData?.data?.rows || [];

  const { data: districtsData, isLoading: isDistrictsLoading, refetch } = useGetCompanyDistricts({
    stateId: selectedStateId,
  });
  const districts: CompanyDistrict[] = districtsData?.data?.rows || [];

  const createDistrict = useCreateCompanyDistrict();
  const editDistrict = useEditCompanyDistrict();
  const removeDistrict = useRemoveCompanyDistrict();

  const form = useForm<DistrictFormValues>({
    resolver: zodResolver(districtFormSchema),
    defaultValues: { name: '', code: '', timezone: moment.tz.guess() },
  });

  useEffect(() => {
    form.reset({
      name: editData?.name || '',
      code: editData?.code || '',
      timezone: editData?.timezone || moment.tz.guess(),
    });
  }, [editData, open]);

  const handleCountryChange = (value: string) => {
    setSelectedCountryId(value);
    setSelectedStateId('');
  };

  const onAddData = () => {
    setEditData(null);
    setOpen(true);
  };

  const onEditData = (data: CompanyDistrict) => {
    setEditData(data);
    setOpen(true);
  };

  const onClose = () => {
    setEditData(null);
    setOpen(false);
  };

  const isSaving = createDistrict.isPending || editDistrict.isPending;
  const isEditing = !!editData;

  function onSubmit(values: DistrictFormValues) {
    if (isEditing && editData) {
      editDistrict.mutate(
        { id: editData.id, ...values },
        {
          onSuccess: (data) => {
            if (data) {
              toast.success('District updated successfully');
              refetch();
              onClose();
            } else {
              toast.error('Failed to update district');
            }
          },
          onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
          },
        }
      );
    } else {
      createDistrict.mutate(
        { ...values, stateId: selectedStateId },
        {
          onSuccess: (data) => {
            if (data) {
              toast.success('District created successfully');
              refetch();
              onClose();
            } else {
              toast.error('Failed to create district');
            }
          },
          onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
          },
        }
      );
    }
  }

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      await removeDistrict.mutateAsync(selectedItem.id);
      toast.success('District deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete district');
    }

    setSelectedItem(null);
    setIsDeleteOpen(false);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-1 gap-4">
          <div className="max-w-sm flex-1">
            <Label className="mb-2 block text-sm font-medium">Country</Label>
            <Select value={selectedCountryId} onValueChange={handleCountryChange}>
              <SelectTrigger>
                <SelectValue placeholder={isCountriesLoading ? 'Loading countries...' : 'Select a country'} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-w-sm flex-1">
            <Label className="mb-2 block text-sm font-medium">State</Label>
            <Select value={selectedStateId} onValueChange={setSelectedStateId} disabled={!selectedCountryId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedCountryId
                      ? 'Select a country first'
                      : isStatesLoading
                      ? 'Loading states...'
                      : 'Select a state'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state.id} value={state.id}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={onAddData} disabled={!selectedStateId} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add District
        </Button>
      </div>

      {!selectedStateId ? (
        <p className="py-8 text-center text-sm text-slate-500">Select a country and state to view its districts.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>District Name</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isDistrictsLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                  Loading districts...
                </TableCell>
              </TableRow>
            ) : districts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                  No districts found for this state.
                </TableCell>
              </TableRow>
            ) : (
              districts.map((district) => (
                <TableRow key={district.id}>
                  <TableCell className="font-medium">{district.code}</TableCell>
                  <TableCell>{district.name}</TableCell>
                  <TableCell>{district.timezone}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEditData(district)} className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(district);
                          setIsDeleteOpen(true);
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit District' : 'Create District'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 py-4">
                <div className="flex items-start gap-4">
                  <Label className="min-w-[100px] text-sm font-medium">
                    Name <MandatoryField />
                  </Label>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="e.g. City of Johannesburg Metro" {...field} />
                          </FormControl>
                          <FormMessage className="!-mt-1 !text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Label className="min-w-[100px] text-sm font-medium">
                    Code <MandatoryField />
                  </Label>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="e.g. JHB" {...field} />
                          </FormControl>
                          <FormMessage className="!-mt-1 !text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Label className="min-w-[100px] text-sm font-medium">
                    Timezone <MandatoryField />
                  </Label>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="e.g. Africa/Johannesburg" {...field} />
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

      <DeleteConfirmation
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={`Are you sure you want to delete ${selectedItem?.name}?`}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default CompanyDistrictSection;