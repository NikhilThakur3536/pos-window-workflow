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
  useGetCompanyCities,
  useGetCompanyAreas,
  useCreateCompanyArea,
  useEditCompanyArea,
  useRemoveCompanyArea,
  CompanyArea,
} from '@/api-queries/company-location';

const areaFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

type AreaFormValues = z.infer<typeof areaFormSchema>;

const CompanyAreaSection = () => {
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<CompanyArea | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CompanyArea | null>(null);

  const { data: countriesData, isLoading: isCountriesLoading } = useGetCompanyCountries();
  const countries = countriesData?.data?.rows || [];

  const { data: statesData, isLoading: isStatesLoading } = useGetCompanyStates({
    countryId: selectedCountryId,
  });
  const states = statesData?.data?.rows || [];

  const { data: districtsData, isLoading: isDistrictsLoading } = useGetCompanyDistricts({
    stateId: selectedStateId,
  });
  const districts = districtsData?.data?.rows || [];

  const { data: citiesData, isLoading: isCitiesLoading } = useGetCompanyCities({
    districtId: selectedDistrictId,
  });
  const cities = citiesData?.data?.rows || [];

  const { data: areasData, isLoading: isAreasLoading, refetch } = useGetCompanyAreas({
    cityId: selectedCityId,
  });
  const areas: CompanyArea[] = areasData?.data?.rows || [];

  const createArea = useCreateCompanyArea();
  const editArea = useEditCompanyArea();
  const removeArea = useRemoveCompanyArea();

  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
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
    setSelectedDistrictId('');
    setSelectedCityId('');
  };

  const handleStateChange = (value: string) => {
    setSelectedStateId(value);
    setSelectedDistrictId('');
    setSelectedCityId('');
  };

  const handleDistrictChange = (value: string) => {
    setSelectedDistrictId(value);
    setSelectedCityId('');
  };

  const onAddData = () => {
    setEditData(null);
    setOpen(true);
  };

  const onEditData = (data: CompanyArea) => {
    setEditData(data);
    setOpen(true);
  };

  const onClose = () => {
    setEditData(null);
    setOpen(false);
  };

  const isSaving = createArea.isPending || editArea.isPending;
  const isEditing = !!editData;

  function onSubmit(values: AreaFormValues) {
    if (isEditing && editData) {
      editArea.mutate(
        { id: editData.id, ...values },
        {
          onSuccess: (data) => {
            if (data) {
              toast.success('Area updated successfully');
              refetch();
              onClose();
            } else {
              toast.error('Failed to update area');
            }
          },
          onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
          },
        }
      );
    } else {
      createArea.mutate(
        { ...values, cityId: selectedCityId },
        {
          onSuccess: (data) => {
            if (data) {
              toast.success('Area created successfully');
              refetch();
              onClose();
            } else {
              toast.error('Failed to create area');
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
      await removeArea.mutateAsync(selectedItem.id);
      toast.success('Area deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete area');
    }

    setSelectedItem(null);
    setIsDeleteOpen(false);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="max-w-xs flex-1">
            <Label className="mb-2 block text-sm font-medium">Country</Label>
            <Select value={selectedCountryId} onValueChange={handleCountryChange}>
              <SelectTrigger>
                <SelectValue placeholder={isCountriesLoading ? 'Loading...' : 'Select a country'} />
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

          <div className="max-w-xs flex-1">
            <Label className="mb-2 block text-sm font-medium">State</Label>
            <Select value={selectedStateId} onValueChange={handleStateChange} disabled={!selectedCountryId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedCountryId ? 'Select a country first' : isStatesLoading ? 'Loading...' : 'Select a state'
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

          <div className="max-w-xs flex-1">
            <Label className="mb-2 block text-sm font-medium">District</Label>
            <Select value={selectedDistrictId} onValueChange={handleDistrictChange} disabled={!selectedStateId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedStateId
                      ? 'Select a state first'
                      : isDistrictsLoading
                      ? 'Loading...'
                      : 'Select a district'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {districts.map((district) => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-w-xs flex-1">
            <Label className="mb-2 block text-sm font-medium">City</Label>
            <Select value={selectedCityId} onValueChange={setSelectedCityId} disabled={!selectedDistrictId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedDistrictId ? 'Select a district first' : isCitiesLoading ? 'Loading...' : 'Select a city'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onAddData} disabled={!selectedCityId} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Area
          </Button>
        </div>
      </div>

      {!selectedCityId ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Select a country, state, district and city to view its areas.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Area Name</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAreasLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                  Loading areas...
                </TableCell>
              </TableRow>
            ) : areas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                  No areas found for this city.
                </TableCell>
              </TableRow>
            ) : (
              areas.map((area) => (
                <TableRow key={area.id}>
                  <TableCell className="font-medium">{area.code}</TableCell>
                  <TableCell>{area.name}</TableCell>
                  <TableCell>{area.timezone}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEditData(area)} className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(area);
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
            <DialogTitle>{isEditing ? 'Edit Area' : 'Create Area'}</DialogTitle>
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
                            <Input placeholder="e.g. Sandton" {...field} />
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
                            <Input placeholder="e.g. SAND" {...field} />
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

export default CompanyAreaSection;