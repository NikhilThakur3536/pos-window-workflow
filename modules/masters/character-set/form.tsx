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
  CharacterSetMasterDetails,
  CharacterSetMasterCreateSchema,
  CharacterSetMasterUpdateSchema,
  characterSetMasterCreateSchema,
  characterSetMasterUpdateSchema,
  useCreateCharacterSetMaster,
  useUpdateCharacterSetMaster,
} from '@/api-queries/character-master'; // Adjust import path

import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

interface CharacterSetMasterFormProps {
  open: boolean;
  onClose: () => void;
  editData: CharacterSetMasterDetails | null;
}

const CharacterSetMasterForm = ({ open, editData, onClose }: CharacterSetMasterFormProps) => {
  const createItemData = useCreateCharacterSetMaster();
  const updateItemData = useUpdateCharacterSetMaster();

  const isEditing = !!editData;

  const form = useForm<CharacterSetMasterCreateSchema | CharacterSetMasterUpdateSchema>({
    resolver: zodResolver(isEditing ? characterSetMasterUpdateSchema : characterSetMasterCreateSchema),
    defaultValues: {
      name: editData?.name || '',
      code: editData?.code || '',
      timezone: editData?.timezone || moment.tz.guess(),
      ...(editData && { characterSetId: editData.id }),
    },
  });

  const { handleSubmit, control } = form;

  function onSubmit(values: CharacterSetMasterCreateSchema | CharacterSetMasterUpdateSchema) {
    if (editData) {
      if (!editData.id) return toast.error('Character Set ID is required');

      return updateItemData.mutate(values as CharacterSetMasterUpdateSchema, {
        onSuccess: (data) => {
          if (data.success) {
            toast.success('Character Set Master updated successfully');
            form.reset();
            onClose();
          } else {
            toast.error('Character Set Master updation failed');
          }
        },
        onError: (error) => {
          // @ts-ignore
          toast.error(error?.response?.data?.message || 'Internal Server Error!');
        },
      });
    }

    createItemData.mutate(values as CharacterSetMasterCreateSchema, {
      onSuccess: (data) => {
        if (data.success) {
          toast.success('Character Set Master created successfully');
          form.reset();
          onClose();
        } else {
          toast.error('Character Set Master creation failed');
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
            {isEditing ? 'Edit Character Set Master' : 'Create Character Set Master'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="mb-0 grid gap-6 py-4">
              <div className="flex items-start gap-4">
                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                  Name <MandatoryField />
                </Label>
                <div className="flex-1">
                  <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. English, Unicode, ASCII" {...field} />
                        </FormControl>
                        <FormMessage className="!-mt-1 !text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

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
                          <Input placeholder="e.g. EN, UTF8, ASCII" {...field} />
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
                          <Input placeholder="e.g. Asia/Kolkata, UTC" {...field} />
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

export default CharacterSetMasterForm;