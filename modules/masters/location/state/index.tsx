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
  useCreateCompanyState,
  useEditCompanyState,
  useRemoveCompanyState,
  CompanyState,
} from '@/api-queries/company-location';

const stateFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

type StateFormValues = z.infer<typeof stateFormSchema>;

const CompanyStateSection = () => {
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<CompanyState | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CompanyState | null>(null);

  const { data: countriesData, isLoading: isCountriesLoading } = useGetCompanyCountries();
  const countries = countriesData?.data?.rows || [];

  const { data: statesData, isLoading: isStatesLoading, refetch } = useGetCompanyStates({
    countryId: selectedCountryId,
  });
  const states: CompanyState[] = statesData?.data?.rows || [];

  const createState = useCreateCompanyState();
  const editState = useEditCompanyState();
  const removeState = useRemoveCompanyState();

  const form = useForm<StateFormValues>({
    resolver: zodResolver(stateFormSchema),
    defaultValues: { name: '', code: '', timezone: moment.tz.guess() },
  });

  useEffect(() => {
    form.reset({
      name: editData?.name || '',
      code: editData?.code || '',
      timezone: editData?.timezone || moment.tz.guess(),
    });
  }, [editData, open]);

  const onAddData = () => {
    setEditData(null);
    setOpen(true);
  };

  const onEditData = (data: CompanyState) => {
    setEditData(data);
    setOpen(true);
  };

  const onClose = () => {
    setEditData(null);
    setOpen(false);
  };

  const isSaving = createState.isPending || editState.isPending;
  const isEditing = !!editData;

  function onSubmit(values: StateFormValues) {
    if (isEditing && editData) {
      editState.mutate(
        { id: editData.id, ...values },
        {
          onSuccess: (data) => {
            if (data) {
              toast.success('State updated successfully');
              refetch();
              onClose();
            } else {
              toast.error('Failed to update state');
            }
          },
          onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
          },
        }
      );
    } else {
      createState.mutate(
        { ...values, countryId: selectedCountryId },
        {
          onSuccess: (data) => {
            if (data) {
              toast.success('State created successfully');
              refetch();
              onClose();
            } else {
              toast.error('Failed to create state');
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
      await removeState.mutateAsync(selectedItem.id);
      toast.success('State deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete state');
    }

    setSelectedItem(null);
    setIsDeleteOpen(false);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-end justify-between gap-4">
        <div className="max-w-sm flex-1">
          <Label className="mb-2 block text-sm font-medium">Country</Label>
          <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
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

        <Button onClick={onAddData} disabled={!selectedCountryId} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add State
        </Button>
      </div>

      {!selectedCountryId ? (
        <p className="py-8 text-center text-sm text-slate-500">Select a country to view its states.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>State Name</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isStatesLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                  Loading states...
                </TableCell>
              </TableRow>
            ) : states.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                  No states found for this country.
                </TableCell>
              </TableRow>
            ) : (
              states.map((state) => (
                <TableRow key={state.id}>
                  <TableCell className="font-medium">{state.code}</TableCell>
                  <TableCell>{state.name}</TableCell>
                  <TableCell>{state.timezone}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEditData(state)} className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(state);
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
            <DialogTitle>{isEditing ? 'Edit State' : 'Create State'}</DialogTitle>
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
                            <Input placeholder="e.g. Gauteng" {...field} />
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
                            <Input placeholder="e.g. GP" {...field} />
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

export default CompanyStateSection;