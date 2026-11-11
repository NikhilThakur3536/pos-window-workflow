import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React from 'react';

interface ContactFormData {
    id?: string;
    branch: string;
    name: string;
    contactName: string;
    contactNumber: string;
    address1: string;
    address2: string;
    address3: string;
    address4: string;
    postalCode: string;
    cellphoneNumber: string;
    faxNumber: string;
    emailAddress: string;
    useEmailAddressFor: boolean;
    selectModules: string;
    preferredTaxRate: string;
}

interface AddEditContactFormProps {
    initialData?: ContactFormData;
    onSave: (data: ContactFormData) => void;
    onCancel: () => void;
}

const AddEditContactForm: React.FC<AddEditContactFormProps> = ({ initialData, onSave, onCancel }) => {
    const { register, handleSubmit, control, reset } = useForm<ContactFormData>({
        defaultValues: initialData || {
            branch: '',
            name: '',
            contactName: '',
            contactNumber: '',
            address1: '',
            address2: '',
            address3: '',
            address4: '',
            postalCode: '',
            cellphoneNumber: '',
            faxNumber: '',
            emailAddress: '',
            useEmailAddressFor: false,
            selectModules: 'Module 1',
            preferredTaxRate: '15%',
        },
    });

    React.useEffect(() => {
        reset(initialData);
    }, [initialData, reset]);

    const onSubmit = (data: ContactFormData) => {
        onSave(data);
    };

    return (
        <Card className="h-full gap-0 overflow-y-auto py-0 pb-2">
            <CardHeader className="sticky top-0 left-0 z-10 mb-2 flex items-center justify-between gap-0 bg-white px-4 py-2 shadow">
                <CardTitle className="text-sm">{initialData ? 'Edit Contact' : 'Add New Contact'}</CardTitle>

                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 lg:grid-cols-2">
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="branchNumber" className="text-sm">
                            Branch Number (BN)
                        </Label>
                        <Input id="branchNumber" {...register('branch')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="companyName" className="text-sm">
                            Company Name
                        </Label>
                        <Input id="companyName" {...register('name')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="contactName" className="text-sm">
                            Contact Name
                        </Label>
                        <Input id="contactName" {...register('contactName')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="contactNumber" className="text-sm">
                            Contact Number
                        </Label>
                        <Input id="contactNumber" {...register('contactNumber')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="address1" className="text-sm">
                            Address 1
                        </Label>
                        <Input id="address1" {...register('address1')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="address2" className="text-sm">
                            Address 2
                        </Label>
                        <Input id="address2" {...register('address2')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="address3" className="text-sm">
                            Address 3
                        </Label>
                        <Input id="address3" {...register('address3')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="address4" className="text-sm">
                            Address 4
                        </Label>
                        <Input id="address4" {...register('address4')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="postalCode" className="text-sm">
                            Postal Code
                        </Label>
                        <Input id="postalCode" {...register('postalCode')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="cellphoneNumber" className="text-sm">
                            Cellphone
                        </Label>
                        <Input id="cellphoneNumber" {...register('cellphoneNumber')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="faxNumber" className="text-sm">
                            Fax Number
                        </Label>
                        <Input id="faxNumber" {...register('faxNumber')} className="col-span-2 h-8" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="emailAddress" className="text-sm">
                            Email Address
                        </Label>
                        <Input
                            id="emailAddress"
                            type="email"
                            {...register('emailAddress')}
                            className="col-span-2 h-8"
                        />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="useEmailAddressFor" className="text-sm">
                            Use Email Address For
                        </Label>
                        <div className="col-span-2 flex items-center gap-2">
                            <Controller
                                name="useEmailAddressFor"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                )}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="selectModules" className="text-sm">
                            Select Modules
                        </Label>
                        <Controller
                            name="selectModules"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="col-span-2 h-8 w-full">
                                        <SelectValue placeholder="Select module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Module 1">Module 1</SelectItem>
                                        <SelectItem value="Module 2">Module 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                        <Label htmlFor="preferredTaxRate" className="text-sm">
                            Preferred Tax Rate
                        </Label>
                        <Controller
                            name="preferredTaxRate"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="col-span-2 h-8 w-full">
                                        <SelectValue placeholder="Select tax rate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15%">15%</SelectItem>
                                        <SelectItem value="0%">0%</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default AddEditContactForm;
