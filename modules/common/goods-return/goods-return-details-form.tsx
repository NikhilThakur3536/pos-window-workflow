import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, X } from 'lucide-react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { GoodsReturnCreateSchema } from '@/api-queries/goods-return';
import {
    useGetStoreDepartments,
    StoreDepartmentDetails,
    useGetStoreDepartmentsOffline,
} from '@/api-queries/store-departments';
import { CreditorDialog } from '../hoc/creditor-dialog';
import { RepDialog } from '../hoc/rep-dialog';
import { CompanyCreditor } from '@/types';
import { useGetWarehouses, useGetWarehousesOffline, WarehouseDetails } from '@/api-queries/warehouse';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
import { generateInvoiceNumber } from '@/utils/helpers';
import { useInvoiceCountState } from '@/stores/invoice-count.store';
import { GoodsReceivingDetails } from '@/api-queries/goods-receiving';
import { GRVDialog } from '../hoc/grv-dialog';

interface GoodsReturnDetailsFormProps {
    control: Control<GoodsReturnCreateSchema>;
    setValue: (name: keyof GoodsReturnCreateSchema, value: any) => void;
    selectedCreditor: CompanyCreditor | null;
    setSelectedCreditor: Dispatch<SetStateAction<CompanyCreditor | null>>;
    isOnline: boolean;
    onSelectRep: (rep: SalesRepresentativeDetails) => void;
    selectedRep: SalesRepresentativeDetails | null;
    onSelectGRV: (grv: GoodsReceivingDetails | null) => void;
    selectedGRV: GoodsReceivingDetails | null;
}

const GoodsReturnDetailsForm = ({
    control,
    setValue,
    selectedCreditor,
    setSelectedCreditor,
    isOnline,
    onSelectRep,
    selectedRep,
    onSelectGRV,
    selectedGRV,
}: GoodsReturnDetailsFormProps) => {
    const dnInvoiceCount = useInvoiceCountState((state) => state.dnInvoiceCount);

    const warehouses = isOnline
        ? useGetWarehouses({ limit: 1000, offset: 0 })?.data?.data
        : useGetWarehousesOffline(false)?.data?.data;
    const storeDepartments = isOnline
        ? useGetStoreDepartments({ limit: 1000, offset: 0 })?.data?.data
        : useGetStoreDepartmentsOffline(false)?.data?.data;

    const [isCreditorDialogOpen, setIsCreditorDialogOpen] = useState(false);
    const [isRepDialogOpen, setIsRepDialogOpen] = useState(false);
    const [isGRVDialogOpen, setIsGRVDialogOpen] = useState(false);

    const handleSelectCreditor = (creditor: CompanyCreditor) => {
        setValue('companyCreditorId', creditor.id);
        setSelectedCreditor(creditor || null);

        setValue('name', creditor.name || '');
        setValue('address', creditor.postalAddress || creditor.deliveryAddress || '');
        setValue(
            'telephone',
            creditor?.contact ||
                creditor?.cellphoneNumber ||
                creditor?.telephoneNumberOne ||
                creditor?.telephoneNumberTwo ||
                '',
        );
        setValue('email', creditor?.emailAddress || '');
        setValue('taxNumber', creditor?.preferredTaxRate || 0);

        setIsCreditorDialogOpen(false);
    };

    const handleSelectRep = (rep: SalesRepresentativeDetails) => {
        setValue('representativeId', `${rep.id}`);
        onSelectRep(rep);
        setIsRepDialogOpen(false);
    };

    const handleSelectGRV = (grv: GoodsReceivingDetails) => {
        onSelectGRV(grv);
        setIsGRVDialogOpen(false);
    };

    useEffect(() => {
        const newGoodsReturnNumber = generateInvoiceNumber('DN', dnInvoiceCount + 1);
        setValue('debitNoteNumber', newGoodsReturnNumber);
    }, [dnInvoiceCount]);

    return (
        <>
            <div className="grid grid-cols-2 gap-4 overflow-y-auto px-4 py-2 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gray-700">Document Details</h3>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="companyCreditorId" className="w-28 shrink-0 text-xs">
                            Account No <MandatoryField />
                        </Label>
                        <div className="relative flex-grow">
                            <FormField
                                control={control}
                                name="companyCreditorId"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="relative">
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    value={selectedCreditor?.accountNumber || ''}
                                                    className="border-input h-7 w-full cursor-pointer rounded-md border bg-white px-2 py-1 pr-8 text-xs"
                                                    readOnly
                                                    onClick={() => setIsCreditorDialogOpen(true)}
                                                />
                                            </FormControl>
                                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                        </div>
                                        <FormMessage className="!-mt-2 !text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="name" className="w-28 shrink-0 text-xs">
                            Name <MandatoryField />
                        </Label>
                        <FormField
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            readOnly
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-xs">
                            Address Details 
                        </Label>
                        <FormField
                            control={control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            className="border-input h-12 rounded-md border bg-white text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="telephone" className="w-28 shrink-0 text-xs">
                            Tel
                        </Label>
                        <FormField
                            control={control}
                            name="telephone"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="email" className="w-28 shrink-0 text-xs">
                            Email
                        </Label>
                        <FormField
                            control={control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="email"
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="taxNumber" className="w-28 shrink-0 text-xs">
                            Tax Number
                        </Label>
                        <FormField
                            control={control}
                            name="taxNumber"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                            type="number"
                                            value={field.value ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                field.onChange(val === '' ? undefined : Number(val));
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gray-700">Goods Return Details</h3>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="debitNoteDate" className="w-28 shrink-0 text-xs">
                            Goods Returning Date <MandatoryField />
                        </Label>
                        <FormField
                            control={control}
                            name="debitNoteDate"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            readOnly
                                            type="date"
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="originalDocumentId" className="w-28 shrink-0 text-xs">
                            Orig. Doc No
                        </Label>
                        <FormField
                            control={control}
                            name="originalDocumentId"
                            disabled={!selectedCreditor}
                            render={({ field }) => (
                                <div className="relative w-full">
                                    <FormItem className="flex-grow">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={selectedGRV?.supplierInvoiceNumber || ''}
                                                className="border-input h-7 w-full cursor-pointer rounded-md border bg-white px-2 py-1 pr-8 text-xs"
                                                readOnly
                                                placeholder="Select grv number"
                                                onClick={() => setIsGRVDialogOpen(true)}
                                            />
                                        </FormControl>
                                        {selectedGRV?.supplierInvoiceNumber && (
                                            <X
                                                className="absolute top-1/2 right-6 h-[14px] w-[14px] -translate-y-1/2 cursor-pointer text-red-600"
                                                onClick={() => onSelectGRV(null)}
                                            />
                                        )}
                                        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                        <FormMessage className="!-mt-2 !text-xs" />
                                    </FormItem>
                                </div>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="debitNoteNumber" className="w-28 shrink-0 text-xs">
                            Goods Return Number <MandatoryField />
                        </Label>
                        <FormField
                            control={control}
                            name="debitNoteNumber"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                            readOnly
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="deliveryMethod" className="w-28 shrink-0 text-xs">
                            Delivery Method
                        </Label>
                        <FormField
                            control={control}
                            name="deliveryMethod"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="orderNumber" className="w-28 shrink-0 text-xs">
                            Order Number
                        </Label>
                        <FormField
                            control={control}
                            name="orderNumber"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="debitNoteMemo" className="w-28 shrink-0 text-xs">
                            Goods Return Memo
                        </Label>
                        <FormField
                            control={control}
                            name="debitNoteMemo"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="deliveryNoteNumber" className="w-28 shrink-0 text-xs">
                            Delivery Note No
                        </Label>
                        <FormField
                            control={control}
                            name="deliveryNoteNumber"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gray-700">Additional Details</h3>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="representativeId" className="w-28 shrink-0 text-xs">
                            Rep Number
                        </Label>

                        <div className="flex-grow">
                            <FormField
                                control={control}
                                name="representativeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="relative">
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    value={selectedRep?.name || ''}
                                                    className="border-input h-7 w-full cursor-pointer rounded-md border bg-white px-2 py-1 pr-8 text-xs"
                                                    readOnly
                                                    onClick={() => setIsRepDialogOpen(true)}
                                                />
                                            </FormControl>
                                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                        </div>
                                        <FormMessage className="!-mt-2 !text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="storeDepartmentId" className="w-28 shrink-0 text-xs">
                            Store Department
                        </Label>
                        <FormField
                            control={control}
                            name="storeDepartmentId"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs">
                                                <SelectValue placeholder="Select a store" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {storeDepartments &&
                                                    storeDepartments.map((store: StoreDepartmentDetails) => (
                                                        <SelectItem key={store.id} value={store.id}>
                                                            {store.name} {store.code ? `(${store.code})` : ''}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="warehouseId" className="w-28 shrink-0 text-xs">
                            Warehouse
                        </Label>
                        <FormField
                            control={control}
                            name="warehouseId"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs">
                                                <SelectValue placeholder="Select a warehouse" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {warehouses &&
                                                    warehouses?.rows?.map((ws: WarehouseDetails) => (
                                                        <SelectItem key={ws.id} value={ws.id}>
                                                            {ws.warehouse}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="documentGpPercentage" className="w-28 shrink-0 text-xs">
                            Document GP %
                        </Label>
                        <FormField
                            control={control}
                            name="documentGpPercentage"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gray-700">Totals</h3>

                    <div className="my-2 flex items-center gap-2">
                        <Label className="w-28 shrink-0 text-xs">Goods Return Inclusive</Label>
                        <FormField
                            control={control}
                            name="debitNoteInclusive"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex space-x-4"
                                        >
                                            <div className="flex items-center space-x-1">
                                                <RadioGroupItem
                                                    value="Yes"
                                                    id="debitNoteInclusiveYes"
                                                    className="h-4 w-4"
                                                />
                                                <Label htmlFor="debitNoteInclusiveYes" className="text-xs">
                                                    Yes
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <RadioGroupItem
                                                    value="No"
                                                    id="debitNoteInclusiveNo"
                                                    className="h-4 w-4"
                                                />
                                                <Label htmlFor="debitNoteInclusiveNo" className="text-xs">
                                                    No
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="goodsTotal" className="w-28 shrink-0 text-xs">
                            Goods Total
                        </Label>
                        <FormField
                            control={control}
                            name="goodsTotal"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            readOnly
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="discountAmount" className="w-28 shrink-0 text-xs">
                            Discount Amnt
                        </Label>
                        <FormField
                            control={control}
                            name="discountAmount"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            readOnly
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="taxAmount" className="w-28 shrink-0 text-xs">
                            Tax Amount
                        </Label>
                        <FormField
                            control={control}
                            name="taxAmount"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            readOnly
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="totalQuantity" className="w-28 shrink-0 text-xs">
                            Total Quantity
                        </Label>
                        <FormField
                            control={control}
                            name="totalQuantity"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            readOnly
                                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                        />
                                    </FormControl>
                                    <FormMessage className="!-mt-2 !text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>

            {isCreditorDialogOpen && (
                <CreditorDialog
                    isOpen={isCreditorDialogOpen}
                    onClose={() => setIsCreditorDialogOpen(false)}
                    onSelectCreditor={handleSelectCreditor}
                />
            )}

            {isGRVDialogOpen && (
                <GRVDialog
                    isOpen={isGRVDialogOpen}
                    onClose={() => setIsGRVDialogOpen(false)}
                    onSelectGRV={handleSelectGRV}
                    companyCreditorId={selectedCreditor?.id || ''}
                />
            )}

            {isRepDialogOpen && (
                <RepDialog
                    isOpen={isRepDialogOpen}
                    onClose={() => setIsRepDialogOpen(false)}
                    onSelectRep={handleSelectRep}
                    isOnline={isOnline}
                    key={`${isOnline}`}
                />
            )}
        </>
    );
};

export default GoodsReturnDetailsForm;
