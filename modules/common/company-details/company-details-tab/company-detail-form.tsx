import moment from 'moment-timezone';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyMultiSelect } from '../../hoc/company-multiselect';

// APIs & Types
import {
    Company,
    CompanyCreateSchema,
    companyCreateSchema,
    CompanyCreateInput,
    CompanyUpdateSchema,
    companyUpdateSchema,
    CompanyUpdateInput,
} from '@/api-queries/company-details';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import BankAccountTypeSelect from '@/components/custom-components/bank-account-type-select';
import { LanguageDetails, useGetLanguages } from '@/api-queries/system/languages';
import { CharacterSetDetails, useGetCharacterSets } from '@/api-queries/system/character-sets';
import { useGetCompanyStates } from '@/api-queries/locations/state';
import { useGetLocationConfigurations } from '@/api-queries/locations/config';
import { cleanDataPayload } from '@/utils/helpers';

interface CompanyDetailFormProps {
    open: boolean;
    onClose: () => void;
    editData: Company | null;
    // Props from parent (CompaniesList) - using the new integrated APIs
    onCreate?: (data: CompanyCreateSchema) => void;
    onUpdate?: (data: CompanyUpdateSchema) => void;
    isCreating?: boolean;
    isUpdating?: boolean;
}

const CompanyDetailForm = ({
    open,
    editData,
    onClose,
    onCreate,
    onUpdate,
    isCreating = false,
    isUpdating = false,
}: CompanyDetailFormProps) => {
    const languages = useGetLanguages({})?.data?.data;
    const characterSets = useGetCharacterSets({})?.data?.data;
    const isStateAllowed = useGetLocationConfigurations({})?.data?.data?.rows?.[0]?.showState === 'dropdown';
    const states = useGetCompanyStates({})?.data?.data?.rows;

    const isEditing = !!editData;

    const form = useForm<
        CompanyCreateInput | CompanyUpdateInput,
        any,
        CompanyCreateSchema | CompanyUpdateSchema
    >({
        resolver: zodResolver(isEditing ? companyUpdateSchema : companyCreateSchema),
        defaultValues: {
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess() }),
            companyIdentificationNumber: editData?.companyIdentificationNumber || 0,
            companyName: editData?.companyName || '',
            addressLineOne: editData?.addressLineOne || '',
            addressLineTwo: editData?.addressLineTwo || '',
            addressLineThree: editData?.addressLineThree || '',
            addressLineFour: editData?.addressLineFour || '',
            postalCode: editData?.postalCode || '',
            stateId: editData?.stateId || '',
            telephone: editData?.telephone || '',
            faxNumber: editData?.faxNumber || '',
            emailAddress: editData?.emailAddress || '',
            taxNumber: editData?.taxNumber || '',
            customsCode: editData?.customsCode || '',
            companyRegistrationNumber: editData?.companyRegistrationNumber || '',
            bankAccountNumber: editData?.bankAccountNumber || '',
            bankName: editData?.bankName || '',
            bankBranchCode: editData?.bankBranchCode || '',
            bankAccountType: editData?.bankAccountType || '',
            characterSetId: editData?.characterSetId || '',
            languageId: editData?.languageId || '',
            allowInterCompanyTransfers: editData?.allowInterCompanyTransfers ?? false,
            interCompanyTransferDestinationCompanyIds:
                editData?.interCompanyTransferDestinationCompanyIds ?? [],
        } as CompanyCreateInput | CompanyUpdateInput,
    });

    const { handleSubmit, control, reset } = form;

    const allowInterCompanyTransfers = useWatch({
        control,
        name: 'allowInterCompanyTransfers',
    });

    function onSubmit(values: CompanyCreateSchema | CompanyUpdateSchema) {
        const payload = cleanDataPayload(values);

        if (isEditing) {
            if (!editData?.id) return toast.error('Company ID is required for update');

            onUpdate?.(payload as CompanyUpdateSchema);
        } else {
            onCreate?.(payload as CompanyCreateSchema);
        }
    }

    function onOpenChange(open: boolean) {
        if (!open) {
            reset();
            onClose();
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1080px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">
                        {isEditing ? 'Edit Company Details' : 'Add Company Details'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                    >
                        <div className="max-h-[70vh] space-y-3 overflow-auto">
                            {/* Company Details Section */}
                            <div>
                                <h2 className="mb-2 text-sm font-semibold text-blue-700">Company Details</h2>
                                <div className="grid grid-cols-4 items-start gap-3">
                                    <FormField
                                        control={control}
                                        name="companyIdentificationNumber"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Company ID <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                                        className="!h-7 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="companyName"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Company Name <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="postalCode"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Postal Code <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="taxNumber"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Tax Number</Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="languageId"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Languages <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="!h-7 text-xs">
                                                            <SelectValue placeholder="Select language" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {languages?.map((data: LanguageDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.name} ({data.code})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="characterSetId"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Character Sets <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="!h-7 text-xs">
                                                            <SelectValue placeholder="Select character set" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {characterSets?.map((data: CharacterSetDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.name} ({data.code})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="customsCode"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Custom Code</Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="companyRegistrationNumber"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Company Registration Number</Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Bank Account Details */}
                            <div>
                                <h2 className="mb-2 text-sm font-semibold text-blue-700">Bank Account Details</h2>
                                <div className="grid grid-cols-4 items-start gap-3">
                                    <FormField
                                        control={control}
                                        name="bankAccountNumber"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Account Number <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="bankName"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Bank Name <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="bankBranchCode"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Branch Code <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="bankAccountType"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Type <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <BankAccountTypeSelect
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        className="h-7 w-full text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Address & Contact */}
                            <div>
                                <h2 className="mb-2 text-sm font-semibold text-blue-700">Address & Contact</h2>
                                <div className="grid grid-cols-4 items-start gap-3">
                                    <FormField
                                        control={control}
                                        name="addressLineOne"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Address Line 1 <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="addressLineTwo"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Address Line 2</Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="addressLineThree"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Address Line 3</Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="addressLineFour"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Address Line 4</Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    {isStateAllowed && (
                                        <FormField
                                            control={control}
                                            name="stateId"
                                            render={({ field }) => (
                                                <FormItem className="gap-1">
                                                    <Label className="gap-1 text-xs">State</Label>
                                                    <FormControl>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="!h-7 text-xs">
                                                                <SelectValue placeholder="Select company state" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {states?.map((data) => (
                                                                    <SelectItem key={data.id} value={data.id}>
                                                                        {data.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <FormField
                                        control={control}
                                        name="telephone"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Telephone <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="faxNumber"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Fax Number</Label>
                                                <FormControl>
                                                    <Input {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="emailAddress"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Email Address <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <Input type="email" {...field} className="!h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="allowInterCompanyTransfers"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Allow Inter Company Transfers <MandatoryField parentFontSize={true} />
                                                </Label>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={(value) => field.onChange(value === 'true')}
                                                        value={field.value ? 'true' : 'false'}
                                                        className="flex flex-row gap-6 pt-1"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="true" id="allow-true" />
                                                            <Label htmlFor="allow-true" className="cursor-pointer">Yes</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="false" id="allow-false" />
                                                            <Label htmlFor="allow-false" className="cursor-pointer">No</Label>
                                                        </div>
                                                    </RadioGroup>
                                                </FormControl>
                                                {/* Release 2: superseded by active mappings whenever any exist for this
                                                    company (managed via the mapping icon in the companies list). This
                                                    setting is only consulted as the Release 1 fallback when no active
                                                    mappings are configured. */}
                                                <p className="text-[10px] text-muted-foreground">
                                                    Used only when no active inter-company mappings exist for this company.
                                                </p>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    {allowInterCompanyTransfers && (
                                        <FormField
                                            control={control}
                                            name="interCompanyTransferDestinationCompanyIds"
                                            render={({ field }) => (
                                                <FormItem className="col-span-2 gap-1">
                                                    <Label className="gap-1 text-xs">
                                                        Destination Companies <MandatoryField parentFontSize={true} />
                                                    </Label>
                                                    <FormControl>
                                                        <CompanyMultiSelect
                                                            value={field.value ?? []}
                                                            onChange={field.onChange}
                                                            excludeIds={editData?.id ? [editData.id] : []}
                                                        />
                                                    </FormControl>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Companies this company is allowed to transfer to.
                                                    </p>
                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                className="px-2 py-1 text-xs" 
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700"
                                disabled={isCreating || isUpdating}
                            >
                                {isEditing 
                                    ? (isUpdating ? 'Updating...' : 'Update Company') 
                                    : (isCreating ? 'Creating...' : 'Create Company')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CompanyDetailForm;