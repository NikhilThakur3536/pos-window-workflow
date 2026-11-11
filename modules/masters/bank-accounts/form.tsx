'use client';

import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types
import {
  BankAccountTypeDetails,
  BankAccountTypeCreateSchema,
  BankAccountTypeUpdateSchema,
  bankAccountTypeCreateSchema,
  bankAccountTypeUpdateSchema,
  useCreateBankAccountType,
  useUpdateBankAccountType,
} from '@/api-queries/bank-account'; // Adjust path if needed

import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

interface BankAccountTypeFormProps {
  open: boolean;
  onClose: () => void;
  editData: BankAccountTypeDetails | null;
}

const BankAccountTypeForm = ({ open, editData, onClose }: BankAccountTypeFormProps) => {
  const createItemData = useCreateBankAccountType();
  const updateItemData = useUpdateBankAccountType();

  const isEditing = !!editData;

  const form = useForm<BankAccountTypeCreateSchema | BankAccountTypeUpdateSchema>({
    resolver: zodResolver(isEditing ? bankAccountTypeUpdateSchema : bankAccountTypeCreateSchema),
    defaultValues: {
      code: editData?.code || '',
      description: editData?.description || '',
      timezone: editData?.timezone || moment.tz.guess(),
      ...(editData && { bankAccountTypeId: editData.id }),
    },
  });

  const { handleSubmit, control } = form;

  function onSubmit(values: BankAccountTypeCreateSchema | BankAccountTypeUpdateSchema) {
    if (editData) {
      if (!editData.id) return toast.error('Bank Account Type ID is required');

      return updateItemData.mutate(values as BankAccountTypeUpdateSchema, {
        onSuccess: (data) => {
          if (data.success) {
            toast.success('Bank Account Type updated successfully');
            form.reset();
            onClose();
          } else {
            toast.error('Bank Account Type updation failed');
          }
        },
        onError: (error) => {
          // @ts-ignore
          toast.error(error?.response?.data?.message || 'Internal Server Error!');
        },
      });
    }

    createItemData.mutate(values as BankAccountTypeCreateSchema, {
      onSuccess: (data) => {
        if (data.success) {
          toast.success('Bank Account Type created successfully');
          form.reset();
          onClose();
        } else {
          toast.error('Bank Account Type creation failed');
        }
      },
      onError: (error) => {
        // @ts-ignore
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
          <DialogTitle>
            {isEditing ? 'Edit Bank Account Type' : 'Create Bank Account Type'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="mb-0 grid gap-6 py-4">
              {/* Code */}
              <div className="flex items-start gap-4">
                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                  Code <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. SAVINGS, CURRENT, FD" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex items-start gap-4">
                <Label htmlFor="description" className="min-w-[120px] text-sm font-medium">
                  Description <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter description" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Timezone */}
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
                          <Input 
                            placeholder="e.g. Asia/Kolkata, UTC, America/New_York" 
                            {...field} 
                          />
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
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editData ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BankAccountTypeForm;