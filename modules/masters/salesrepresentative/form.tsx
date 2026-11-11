'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  salesRepresentativeSchema,
  useCreateSalesRepresentative,
  useUpdateSalesRepresentative,
  SalesRepresentativeItem,
} from '@/api-queries/sales-rep';
import { z } from 'zod';

type FormValues = z.infer<typeof salesRepresentativeSchema>;

interface SalesRepresentativeFormProps {
  open: boolean;
  onClose: () => void;
  editData: SalesRepresentativeItem | null;
}

const SalesRepresentativeForm = ({ open, editData, onClose }: SalesRepresentativeFormProps) => {
  const isEditing = !!editData;
  const createMutation = useCreateSalesRepresentative();
  const updateMutation = useUpdateSalesRepresentative();

  const form = useForm<FormValues>({
    resolver: zodResolver(salesRepresentativeSchema),
    defaultValues: {
      repNumber: editData?.repNumber || 0,
      isSalesManager: editData?.isSalesManager || false,
      name: editData?.name || '',
      email: editData?.email || '',
      cellNumber: editData?.cellNumber || '',
      baseCommissionOn: editData?.baseCommissionOn || '',
      comPercent: editData?.comPercent || 0,
      onHold: editData?.onHold || false,
      allowEmails: editData?.allowEmails || false,
      status: editData?.status || 'ACTIVE',
      targets: editData?.targets ?? [{ targetLevel: 1, targetValue: 0, commissionPercent: 0 }],
    },
  });

  const { handleSubmit, control } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'targets',
  });

  function onSubmit(values: FormValues) {
    if (isEditing && editData?.id) {
      updateMutation.mutate(
        { ...values, id: editData.id },
        {
          onSuccess: (data) => {
            if (data) {
              toast.success('Sales Representative updated successfully');
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
          if (data) {
            toast.success('Sales Representative created successfully');
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Sales Representative' : 'Add New Sales Representative'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name <MandatoryField /></Label>
                  <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email <MandatoryField /></Label>
                  <FormField
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="repNumber">Rep Number <MandatoryField /></Label>
                  <FormField
                    control={control}
                    name="repNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="cellNumber">Cell Number <MandatoryField /></Label>
                  <FormField
                    control={control}
                    name="cellNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="baseCommissionOn">Base Commission On <MandatoryField /></Label>
                  <FormField
                    control={control}
                    name="baseCommissionOn"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. Sales, Revenue" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="comPercent">Commission Percent <MandatoryField /></Label>
                  <FormField
                    control={control}
                    name="comPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status <MandatoryField /></Label>
                <FormField
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                          <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                          <SelectItem value="DELETED">DELETED</SelectItem>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={control}
                  name="isSalesManager"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <Label>Sales Manager</Label>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="onHold"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <Label>On Hold</Label>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="allowEmails"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <Label>Allow Emails</Label>
                    </FormItem>
                  )}
                />
              </div>

              {/* Targets Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Targets</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ targetLevel: fields.length + 1, targetValue: 0, commissionPercent: 0 })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Target
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start border p-4 rounded-lg">
                    <FormField
                      control={control}
                      name={`targets.${index}.targetLevel`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Label>Level</Label>
                          <FormControl>
                            <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`targets.${index}.targetValue`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Label>Target Value</Label>
                          <FormControl>
                            <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`targets.${index}.commissionPercent`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Label>Commission %</Label>
                          <FormControl>
                            <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6 text-red-600"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Update'
                  : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SalesRepresentativeForm;