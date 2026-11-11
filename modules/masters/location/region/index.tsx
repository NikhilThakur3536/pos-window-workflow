'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

import { useGetCompanyRegions, useCreateCompanyRegion, companyRegionAddSchema } from '@/api-queries/company-location';

type RegionFormValues = z.infer<typeof companyRegionAddSchema>;

const CompanyRegionSection = () => {
  const [open, setOpen] = useState(false);

  const { data: regionsData, isLoading, refetch } = useGetCompanyRegions();
  const regions = regionsData?.data?.rows || [];

  const createRegion = useCreateCompanyRegion();

  const form = useForm<RegionFormValues>({
    resolver: zodResolver(companyRegionAddSchema),
    defaultValues: { name: '', code: '', timezone: '' },
  });

  const onOpen = () => {
    form.reset({ name: '', code: '', timezone: '' });
    setOpen(true);
  };

  const onClose = () => {
    form.reset();
    setOpen(false);
  };

  function onSubmit(values: RegionFormValues) {
    createRegion.mutate(values, {
      onSuccess: (data) => {
        if (data) {
          toast.success('Region created successfully');
          refetch();
          onClose();
        } else {
          toast.error('Failed to create region');
        }
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Internal Server Error!');
      },
    });
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-end">
        <Button onClick={onOpen} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Region
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Regions and their edit/delete actions are managed at the domain level; the company view only supports
        viewing and adding regions.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Region Name</TableHead>
            <TableHead>Timezone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-sm text-slate-500">
                Loading regions...
              </TableCell>
            </TableRow>
          ) : regions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-sm text-slate-500">
                No regions found.
              </TableCell>
            </TableRow>
          ) : (
            regions.map((region) => (
              <TableRow key={region.id}>
                <TableCell className="font-medium">{region.code}</TableCell>
                <TableCell>{region.name}</TableCell>
                <TableCell>{region.timezone}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create Region</DialogTitle>
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
                            <Input placeholder="e.g. Africa" {...field} />
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
                            <Input placeholder="e.g. AF" {...field} />
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
                <Button type="submit" disabled={createRegion.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {createRegion.isPending ? 'Saving...' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyRegionSection;