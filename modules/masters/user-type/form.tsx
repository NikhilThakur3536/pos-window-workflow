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
  userTypeMasterCreateSchema,
  userTypeMasterUpdateSchema,
  useCreateUserTypeMaster,
  useUpdateUserTypeMaster,
  UserTypeMasterCreateSchema,
  UserTypeMasterUpdateSchema,
  UserTypeMasterDetails,
} from '@/api-queries/user-type';

interface UserTypeMasterFormProps {
  open: boolean;
  onClose: () => void;
  editData: UserTypeMasterDetails | null;
}

const UserTypeMasterForm = ({ open, editData, onClose }: UserTypeMasterFormProps) => {
  const isEditing = !!editData;
  const createMutation = useCreateUserTypeMaster();
  const updateMutation = useUpdateUserTypeMaster();

  const form = useForm<UserTypeMasterCreateSchema | UserTypeMasterUpdateSchema>({
    resolver: zodResolver(isEditing ? userTypeMasterUpdateSchema : userTypeMasterCreateSchema),
    defaultValues: {
      code: editData?.code || '',
      description: editData?.description || '',
      timezone: editData?.timezone || moment.tz.guess(),
      ...(editData && { userTypeId: editData.id }),
    },
  });

  const { handleSubmit, control } = form;

  function onSubmit(values: UserTypeMasterCreateSchema | UserTypeMasterUpdateSchema) {
    if (isEditing && editData) {
      updateMutation.mutate(values as UserTypeMasterUpdateSchema, {
        onSuccess: (data) => {
          if (data.success) {
            toast.success('User Type updated successfully');
            onClose();
          }
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Update failed');
        },
      });
    } else {
      createMutation.mutate(values as UserTypeMasterCreateSchema, {
        onSuccess: (data) => {
          if (data.success) {
            toast.success('User Type created successfully');
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
          <DialogTitle>{isEditing ? 'Edit User Type' : 'Create User Type'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="mb-0 grid gap-6 py-4">
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
                          <Input placeholder="e.g. ADMIN, MANAGER, STAFF" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

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

export default UserTypeMasterForm;