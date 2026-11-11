// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Textarea } from '@/components/ui/textarea';
// import { ChevronDown } from 'lucide-react';
// import { Dispatch, ReactNode, SetStateAction, useEffect, useState,useMemo } from 'react';
// import { Control } from 'react-hook-form';
// import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
// import { AccountSaleCreateSchema } from '@/api-queries/point-of-sale/account-sales/account-sales';
// import { useGetDebtorStoreDepartmentList, DebtorStoreDepartmentItem } from '@/api-queries/store-department';
// import { useGetDebtorSourceDocumentList, DebtorSourceDocumentItem } from '@/api-queries/source-document';
// import {
//     useGetStoreDepartments,
//     StoreDepartmentDetails,
//     useGetStoreDepartmentsOffline,
// } from '@/api-queries/store-departments';
// import { DebtorDialog } from '../../hoc/debtor-dialog';
// import { RepDialog } from '../../hoc/rep-dialog';
// import { CompanyCreditor } from '@/types';
// import { useGetWarehouses, useGetWarehousesOffline, WarehouseDetails } from '@/api-queries/warehouse';
// import MandatoryField from '@/components/dynamic-form/mandatory-fields';
// import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
// import { generateInvoiceNumber } from '@/utils/helpers';
// import { useInvoiceCountState } from '@/stores/invoice-count.store';
// import { AccountSalesType, accountSaleFieldMap } from '@/api-queries/point-of-sale/account-sales/types';
// import { SaleOrderCreateSchema } from '@/api-queries/point-of-sale/account-sales/sale-order';
// import { QuotationCreateSchema } from '@/api-queries/point-of-sale/account-sales/quotations';
// import moment from 'moment';
// import { useDebtorList, useGetDebtorsOffline } from '@/api-queries/debtor';

// interface InvoiceDetailsFormProps {
//     control: Control<AccountSaleCreateSchema | SaleOrderCreateSchema | QuotationCreateSchema>;
//     setValue: (
//         name: keyof AccountSaleCreateSchema | keyof SaleOrderCreateSchema | keyof QuotationCreateSchema,
//         value: any,
//     ) => void;
//     selectedDebtor: CompanyCreditor | null;
//     setSelectedDebtor: Dispatch<SetStateAction<CompanyCreditor | null>>;
//     isOnline: boolean;
//     onSelectRep: (rep: SalesRepresentativeDetails) => void;
//     selectedRep: SalesRepresentativeDetails | null;
//     asType: AccountSalesType;
//     setASType: Dispatch<SetStateAction<AccountSalesType>>;
//     children?: ReactNode;
//     isEmptyCart: boolean;
//     isInclusivePrice: boolean;
//     appliedPromotionDiscount: number;
// }

// export const ACCOUNT_SALES_TYPES: { label: string; value: AccountSalesType }[] = [
//     { label: 'Invoice', value: 'INVOICE' },
//     { label: 'Sale Order', value: 'SALES_ORDER' },
//     { label: 'Quotation', value: 'QUOTATION' },
// ];

// const InvoiceDetailsForm = ({
//     control,
//     setValue,
//     selectedDebtor,
//     setSelectedDebtor,
//     isOnline,
//     onSelectRep,
//     selectedRep,
//     asType,
//     setASType,
//     children,
//     isEmptyCart,
//     isInclusivePrice,
//     appliedPromotionDiscount,
// }: InvoiceDetailsFormProps) => {
//     const asInvoiceCount = useInvoiceCountState((state) => state.asInvoiceCount);
// const { data: debtorStoreDepartmentData, isLoading: isStoreDepartmentsLoading } =
//     useGetDebtorStoreDepartmentList({
//         limit: 1000,
//         offset: 0,
//     });

// const storeDepartments: DebtorStoreDepartmentItem[] = debtorStoreDepartmentData?.data ?? [];

// const { data: debtorSourceDocumentData, isLoading: isSourceDocumentsLoading } =
//     useGetDebtorSourceDocumentList({
//         limit: 1000,
//         offset: 0,
//     });

// const sourceDocuments: DebtorSourceDocumentItem[] = debtorSourceDocumentData?.data ?? [];

//     const warehouses = isOnline
//         ? useGetWarehouses({ limit: 1000, offset: 0 })?.data?.data
//         : useGetWarehousesOffline(false)?.data?.data;
//         console.log("waraehouses",warehouses)

//     const { data: _ } = isOnline ? useDebtorList({}) : useGetDebtorsOffline(false);

//     const [isDebtorDialogOpen, setIsDebtorDialogOpen] = useState(false);
//     const [isRepDialogOpen, setIsRepDialogOpen] = useState(false);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [debouncedSearch, setDebouncedSearch] = useState('');
//     const [showDropdown, setShowDropdown] = useState(false);

//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setDebouncedSearch(searchTerm);
//         }, 500);

//         return () => clearTimeout(timer);
//     }, [searchTerm]);

//     const { data: debtorData, isLoading: debtorLoading } = isOnline
//     ? useDebtorList({
//           limit: 10,
//           offset: 0,
//           search: debouncedSearch,
//       })
//     : useGetDebtorsOffline(false);

//     const handleSelectDebtor = (debtor: CompanyCreditor) => {
//         setValue('companyDebtorId', debtor.id);
//         setSelectedDebtor(debtor || null);

//         setValue('name', debtor.name || '');
//         setValue('address', debtor.postalAddress || debtor.deliveryAddress || '');
//         setValue('telephone', debtor.cellphoneNumber || '');
//         setValue('email', debtor?.emailAddress || '');
//         setValue('taxNumber', debtor?.preferredTaxRate || 0);

//         setIsDebtorDialogOpen(false);
//     };

//     const handleSelectRep = (rep: SalesRepresentativeDetails) => {
//         setValue('representativeId', `${rep.id}`);
//         onSelectRep(rep);
//         setIsRepDialogOpen(false);
//     };

//     useEffect(() => {
//         if (asType === 'INVOICE') {
//             const newInvoiceNumber = generateInvoiceNumber('AS', asInvoiceCount + 1);
//             setValue('invoiceNumber', newInvoiceNumber);
//         } else if (asType === 'SALES_ORDER') {
//             const newSaleOrderNumber = generateInvoiceNumber('AS', asInvoiceCount + 1);
//             setValue('salesOrderNumber', newSaleOrderNumber);
//         } else if (asType === 'QUOTATION') {
//             const newQuoteNumber = generateInvoiceNumber('AS', asInvoiceCount + 1);
//             setValue('quotationNumber', newQuoteNumber);
//         }
//     }, [asType, asInvoiceCount]);

//     const getTypeLabel = () => (asType === 'SALES_ORDER' ? 'S/Order' : asType === 'QUOTATION' ? 'Quote' : 'Invoice');

//     return (
//         <>
//             <div className="grid grid-cols-2 gap-4 overflow-y-auto px-4 py-2 md:grid-cols-2 lg:grid-cols-4">
//                 <div className="space-y-1">
//                     <h3 className="text-sm font-semibold text-gray-700">Document Details</h3>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="companyDebtorId" className="w-28 shrink-0 text-xs">
//                             Account No <MandatoryField />
//                         </Label>
//                         <div className="relative flex-grow">
//                             {/* <FormField
//                                 control={control}
//                                 name="companyDebtorId"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <div className="relative">
//                                             <FormControl>
//                                                 <Input
//                                                     {...field}
//                                                     value={selectedDebtor?.accountNumber || ''}
//                                                     className={`border-input h-7 w-full rounded-md border ${isEmptyCart ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer bg-white'} px-2 py-1 pr-8 text-xs`}
//                                                     readOnly
//                                                     onClick={() => (isEmptyCart ? null : setIsDebtorDialogOpen(true))}
//                                                 />
//                                             </FormControl>
//                                             <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
//                                         </div>
//                                         <FormMessage className="!-mt-2 !text-xs" />
//                                     </FormItem>
//                                 )}
//                             /> */}
//                                 <FormField
//                                 control={control}
//                                 name="companyDebtorId"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <div className="relative">
//                                             <FormControl>
//                                                 <Input
//                                                     value={
//                                                         selectedDebtor?.accountNumber ||
//                                                         searchTerm
//                                                     }
//                                                     placeholder="Search debtor..."
//                                                     className="border-input h-7 w-full rounded-md border bg-white px-2 py-1 pr-8 text-xs"
                                                    
//                                                     onChange={(e) => {
//                                                         setSelectedDebtor(null);

//                                                         setSearchTerm(e.target.value);

//                                                         setShowDropdown(true);
//                                                     }}
//                                                     onFocus={() => setShowDropdown(true)}
//                                                     onBlur={() => {
//                                                         setTimeout(() => {
//                                                             setShowDropdown(false);
//                                                         }, 200);
//                                                     }}
//                                                 />
//                                             </FormControl>

//                                             {/* Chevron Button */}
//                                             <button
//                                                 type="button"
//                                                 onClick={() => {
//                                                     if (!isEmptyCart) {
//                                                         setIsDebtorDialogOpen(true);
//                                                     }
//                                                 }}
//                                                 className="absolute top-1/2 right-2 -translate-y-1/2"
//                                             >
//                                                 <ChevronDown className="h-4 w-4 text-gray-500" />
//                                             </button>
//                                         </div>

//                                         {/* Dropdown Results */}
//                                             {showDropdown && (
//                                                 <div className="absolute top-full z-50 mt-1 max-h-72 w-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-md border border-gray-200 bg-white shadow-lg">
//                                                     {debtorLoading ? (
//                                                         <div className="p-3 text-xs text-gray-500">
//                                                             Searching...
//                                                         </div>
//                                                     ) : debtorData?.data?.rows?.length ? (
//                                                         debtorData.data.rows.map((debtor) => (
//                                                             <div
//                                                                 key={debtor.id}
//                                                                 onMouseDown={(e) => {
//                                                                     e.preventDefault();

//                                                                     handleSelectDebtor(debtor);

//                                                                     setSearchTerm('');

//                                                                     setShowDropdown(false);
//                                                                 }}
//                                                                 className="cursor-pointer border-b border-gray-100 px-3 py-2 hover:bg-gray-50"
//                                                             >
//                                                                 <div className="flex items-center justify-between">
//                                                                     <p className="text-xs font-semibold text-gray-800">
//                                                                         {debtor.accountNumber}
//                                                                     </p>

//                                                                     {debtor.cellphoneNumber && (
//                                                                         <p className="text-[10px] text-gray-500">
//                                                                             {debtor.cellphoneNumber}
//                                                                         </p>
//                                                                     )}
//                                                                 </div>

//                                                                 <p className="text-xs text-gray-600">
//                                                                     {debtor.name}
//                                                                 </p>

//                                                                 {(debtor.postalAddress ||
//                                                                     debtor.deliveryAddress) && (
//                                                                     <p className="line-clamp-1 text-[10px] text-gray-400">
//                                                                         {debtor.postalAddress ||
//                                                                             debtor.deliveryAddress}
//                                                                     </p>
//                                                                 )}
//                                                             </div>
//                                                         ))
//                                                     ) : searchTerm ? (
//                                                         <div className="p-3 text-xs text-gray-500">
//                                                             No debtor found
//                                                         </div>
//                                                     ) : (
//                                                         <div className="p-3 text-xs text-gray-500">
//                                                             Start typing to search
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             )}

//                                         <FormMessage className="!-mt-2 !text-xs" />
//                                     </FormItem>
//                                 )}
//                             />
//                         </div>
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="name" className="w-28 shrink-0 text-xs">
//                             Name <MandatoryField />
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="name"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             readOnly
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="space-y-2">
//                         <Label htmlFor="address" className="text-xs">
//                             Address Details 
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="address"
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormControl>
//                                         <Textarea
//                                             {...field}
//                                             className="border-input h-12 rounded-md border bg-white text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="telephone" className="w-28 shrink-0 text-xs">
//                             Tel
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="telephone"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="email" className="w-28 shrink-0 text-xs">
//                             Email
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="email"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             type="email"
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="taxNumber" className="w-28 shrink-0 text-xs">
//                             Tax Number
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="taxNumber"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                             type="number"
//                                             value={field.value ?? ''}
//                                             onChange={(e) => {
//                                                 const val = e.target.value;
//                                                 field.onChange(val === '' ? undefined : Number(val));
//                                             }}
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>
//                 </div>

//                 <div className="space-y-1">
//                     <h3 className="text-sm font-semibold text-gray-700">{getTypeLabel()} Details</h3>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="warehouseId" className="w-28 shrink-0 text-xs">
//                             Type
//                         </Label>
//                         <Select onValueChange={(val) => setASType(val as AccountSalesType)} value={asType}>
//                             <SelectTrigger className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs">
//                                 <SelectValue placeholder="Select a warehouse" />
//                             </SelectTrigger>
//                             <SelectContent>
//                                 {ACCOUNT_SALES_TYPES &&
//                                     ACCOUNT_SALES_TYPES.map((data) => (
//                                         <SelectItem key={data.value} value={data.value}>
//                                             {data.label}
//                                         </SelectItem>
//                                     ))}
//                             </SelectContent>
//                         </Select>
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor={accountSaleFieldMap[asType].DATE} className="w-28 shrink-0 text-xs">
//                             {getTypeLabel()} Date
//                         </Label>
//                         <FormField
//                             control={control}
//                             name={accountSaleFieldMap[asType].DATE}
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             readOnly
//                                             type="date"
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     {asType === 'SALES_ORDER' ? (
//                         <div className="flex items-center gap-2">
//                             <Label htmlFor="salesOrderEstimatedDate" className="w-28 shrink-0 text-xs">
//                                 Estimated Delivery Date
//                             </Label>
//                             <FormField
//                                 control={control}
//                                 name="salesOrderEstimatedDate"
//                                 render={({ field }) => (
//                                     <FormItem className="flex-grow">
//                                         <FormControl>
//                                             <Input
//                                                 {...field}
//                                                 type="date"
//                                                 className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs appearance-auto [&::-webkit-calendar-picker-indicator]:block [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
//                                                 min={moment().format('YYYY-MM-DD')}
//                                                 // onKeyDown={(e) => e.preventDefault()}
//                                                 onClick={(e) => {
//                                                     e.currentTarget.showPicker?.();
//                                                 }}
//                                             />
//                                         </FormControl>
//                                         <FormMessage className="!-mt-2 !text-xs" />
//                                     </FormItem>
//                                 )}
//                             />
//                         </div>
//                     ) : null}

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="deliveryMethod" className="w-28 shrink-0 text-xs">
//                             Delivery Method
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="deliveryMethod"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor={accountSaleFieldMap[asType].NUMBER} className="w-28 shrink-0 text-xs">
//                             {getTypeLabel()} Number <MandatoryField />
//                         </Label>
//                         <FormField
//                             control={control}
//                             name={accountSaleFieldMap[asType].NUMBER}
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                             readOnly
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="orderNumber" className="w-28 shrink-0 text-xs">
//                             Order Number
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="orderNumber"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="internalOrderNo" className="w-28 shrink-0 text-xs">
//                             Internal Order No
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="internalOrderNo"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor={accountSaleFieldMap[asType].MEMO} className="w-28 shrink-0 text-xs">
//                             {getTypeLabel()} Memo
//                         </Label>
//                         <FormField
//                             control={control}
//                             name={accountSaleFieldMap[asType].MEMO}
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="deliveryNoteNumber" className="w-28 shrink-0 text-xs">
//                             Delivery Note No
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="deliveryNoteNumber"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>
//                 </div>

//                 <div className="space-y-1">
//                     <h3 className="text-sm font-semibold text-gray-700">Additional Details</h3>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="representativeId" className="w-28 shrink-0 text-xs">
//                             Rep Number
//                         </Label>

//                         <div className="flex-grow">
//                             <FormField
//                                 control={control}
//                                 name="representativeId"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <div className="relative">
//                                             <FormControl>
//                                                 <Input
//                                                     {...field}
//                                                     value={selectedRep?.name || ''}
//                                                     className="border-input h-7 w-full cursor-pointer rounded-md border bg-white px-2 py-1 pr-8 text-xs"
//                                                     readOnly
//                                                     onClick={() => setIsRepDialogOpen(true)}
//                                                 />
//                                             </FormControl>
//                                             <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
//                                         </div>
//                                         <FormMessage className="!-mt-2 !text-xs" />
//                                     </FormItem>
//                                 )}
//                             />
//                         </div>
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="storeDepartmentId" className="w-28 shrink-0 text-xs">
//                             Store Department
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="storeDepartmentId"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Select onValueChange={field.onChange} value={field.value}>
//                                             <SelectTrigger className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs">
//                                                 <SelectValue placeholder="Select a store" />
//                                             </SelectTrigger>
//                                            <SelectContent>
//                                                 {storeDepartments &&
//                                                     storeDepartments.map((store: DebtorStoreDepartmentItem) => (
//                                                         <SelectItem key={store.id} value={store.id}>
//                                                             {store.name}
//                                                         </SelectItem>
//                                                     ))}
//                                             </SelectContent>
//                                         </Select>
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//     <Label htmlFor="sourceDocumentId" className="w-28 shrink-0 text-xs">
//         Source Document
//     </Label>
//     <FormField
//         control={control}
//         name="sourceDocumentId"
//         render={({ field }) => (
//             <FormItem className="flex-grow">
//                 <FormControl>
//                     <Select onValueChange={field.onChange} value={field.value}>
//                         <SelectTrigger className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs">
//                             <SelectValue placeholder="Select a source document" />
//                         </SelectTrigger>
//                         <SelectContent>
//                             {sourceDocuments &&
//                                 sourceDocuments.map((doc: DebtorSourceDocumentItem) => (
//                                     <SelectItem key={doc.id} value={doc.id}>
//                                         {doc.name}
//                                     </SelectItem>
//                                 ))}
//                         </SelectContent>
//                     </Select>
//                 </FormControl>
//                 <FormMessage className="!-mt-2 !text-xs" />
//             </FormItem>
//         )}
//     />
// </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="warehouseId" className="w-28 shrink-0 text-xs">
//                             Warehouse
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="warehouseId"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Select onValueChange={field.onChange} value={field.value}>
//                                             <SelectTrigger className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs">
//                                                 <SelectValue placeholder="Select a warehouse" />
//                                             </SelectTrigger>
//                                             <SelectContent>
//                                                 {warehouses &&
//                                                     warehouses?.rows?.map((ws: WarehouseDetails) => (
//                                                         <SelectItem key={ws.id} value={ws.id}>
//                                                             {ws.warehouse}
//                                                         </SelectItem>
//                                                     ))}
//                                             </SelectContent>
//                                         </Select>
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="documentGpPercentage" className="w-28 shrink-0 text-xs">
//                             Document GP %
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="documentGpPercentage"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             type="number"
//                                             step="0.01"
//                                             onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>
//                 </div>

//                 <div className="space-y-1">
//                     <h3 className="text-sm font-semibold text-gray-700">Totals</h3>

//                     <div className="my-2 flex items-center gap-2">
//                         <Label className="w-28 shrink-0 text-xs">{getTypeLabel()} Inclusive</Label>
//                         <FormField
//                             control={control}
//                             name={accountSaleFieldMap[asType].INCLUSIVE}
//                             render={({ field }) => (
//                                 <FormItem>
//                                     <FormControl>
//                                         <RadioGroup
//                                             onValueChange={field.onChange}
//                                             value={field.value}
//                                             disabled={isEmptyCart}
//                                             className="flex space-x-4"
//                                         >
//                                             <div className="flex items-center space-x-1">
//                                                 <RadioGroupItem
//                                                     value="Yes"
//                                                     id={`${accountSaleFieldMap[asType].INCLUSIVE}Yes`}
//                                                     className="h-4 w-4"
//                                                 />
//                                                 <Label
//                                                     htmlFor={`${accountSaleFieldMap[asType].INCLUSIVE}Yes`}
//                                                     className="text-xs"
//                                                 >
//                                                     Yes
//                                                 </Label>
//                                             </div>
//                                             <div className="flex items-center space-x-1">
//                                                 <RadioGroupItem
//                                                     value="No"
//                                                     id={`${accountSaleFieldMap[asType].INCLUSIVE}No`}
//                                                     className="h-4 w-4"
//                                                 />
//                                                 <Label
//                                                     htmlFor={`${accountSaleFieldMap[asType].INCLUSIVE}No`}
//                                                     className="text-xs"
//                                                 >
//                                                     No
//                                                 </Label>
//                                             </div>
//                                         </RadioGroup>
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     {asType === 'INVOICE' ? (
//                         <div className="flex items-center gap-2">
//                             <Label htmlFor="invoiceDiscountPercentage" className="w-28 shrink-0 text-xs">
//                                 Invoice Disc %
//                             </Label>
//                             <FormField
//                                 control={control}
//                                 name="invoiceDiscountPercentage"
//                                 render={({ field }) => (
//                                     <FormItem className="flex-grow">
//                                         <FormControl>
//                                             <Input
//                                                 {...field}
//                                                 type="number"
//                                                 step="0.01"
//                                                 onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
//                                                 className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
//                                             />
//                                         </FormControl>
//                                         <FormMessage className="!-mt-2 !text-xs" />
//                                     </FormItem>
//                                 )}
//                             />
//                         </div>
//                     ) : null}

//                     <div className="flex items-center gap-2">
//                         <Label className="w-28 shrink-0 text-xs font-semibold">Goods Total</Label>
//                         <Input
//                             type="number"
//                             step="0.01"
//                             readOnly
//                             value={(
//                                 control._formValues.goodsTotal +
//                                 control._formValues.discountAmount +
//                                 control._formValues.promotionDiscountAmount +
//                                 (control._formValues.loyaltyDiscountAmount || 0) -
//                                 (isInclusivePrice ? 0 : control._formValues.taxAmount)
//                             )?.toFixed(2)}
//                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="discountAmount" className="w-28 shrink-0 text-xs">
//                             Discount Amnt
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="discountAmount"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             value={field.value?.toFixed(2)}
//                                             type="number"
//                                             step="0.01"
//                                             readOnly
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     {appliedPromotionDiscount ? (
//                         <div className="flex items-center gap-2">
//                             <Label htmlFor="promotionDiscountAmount" className="w-28 shrink-0 text-xs">
//                                 Promotion Disc.
//                             </Label>
//                             <FormField
//                                 control={control}
//                                 name="promotionDiscountAmount"
//                                 render={({ field }) => (
//                                     <FormItem className="flex-grow">
//                                         <FormControl>
//                                             <Input
//                                                 {...field}
//                                                 value={field.value?.toFixed(2)}
//                                                 type="number"
//                                                 step="0.01"
//                                                 readOnly
//                                                 className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
//                                             />
//                                         </FormControl>
//                                         <FormMessage className="!-mt-2 !text-xs" />
//                                     </FormItem>
//                                 )}
//                             />
//                         </div>
//                     ) : null}

//                     {asType === 'INVOICE' ? (
//                         <div className="flex items-center gap-2">
//                             <Label className="w-28 shrink-0 text-xs font-semibold">Loyalty Discount</Label>
//                             <FormField
//                                 control={control}
//                                 name="loyaltyDiscountAmount"
//                                 render={({ field }) => (
//                                     <FormItem className="flex-grow">
//                                         <FormControl>
//                                             <Input
//                                                 {...field}
//                                                 value={field.value?.toFixed(2) || '0.00'}
//                                                 type="number"
//                                                 step="0.01"
//                                                 readOnly
//                                                 className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
//                                             />
//                                         </FormControl>
//                                         <FormMessage className="!-mt-2 !text-xs" />
//                                     </FormItem>
//                                 )}
//                             />
//                         </div>
//                     ) : null}

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="taxAmount" className="w-28 shrink-0 text-xs">
//                             Tax Amount
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="taxAmount"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             value={isInclusivePrice ? '0.00' : field.value?.toFixed(2)}
//                                             type="number"
//                                             step="0.01"
//                                             readOnly
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="totalQuantity" className="w-28 shrink-0 text-xs">
//                             Total Quantity
//                         </Label>
//                         <Input
//                             readOnly
//                             value={
//                                 control._formValues.totalQuantity +
//                                 (control._formValues.totalFreeQuantity
//                                     ? ` + ${control._formValues.totalFreeQuantity} free`
//                                     : '')
//                             }
//                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
//                         />
//                     </div>

//                     <div className="flex items-center gap-2">
//                         <Label htmlFor="goodsTotal" className="w-28 shrink-0 text-xs">
//                             Payable Amount
//                         </Label>
//                         <FormField
//                             control={control}
//                             name="goodsTotal"
//                             render={({ field }) => (
//                                 <FormItem className="flex-grow">
//                                     <FormControl>
//                                         <Input
//                                             {...field}
//                                             value={field.value?.toFixed(2)}
//                                             type="number"
//                                             step="0.01"
//                                             readOnly
//                                             className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
//                                         />
//                                     </FormControl>
//                                     <FormMessage className="!-mt-2 !text-xs" />
//                                 </FormItem>
//                             )}
//                         />
//                     </div>

//                     {children && children}
//                 </div>
//             </div>

//             {isDebtorDialogOpen && (
//                 <DebtorDialog
//                     isOpen={isDebtorDialogOpen}
//                     onClose={() => setIsDebtorDialogOpen(false)}
//                     onSelectDebtor={handleSelectDebtor}
//                     isOnline={isOnline}
//                 />
//             )}

//             {isRepDialogOpen && (
//                 <RepDialog
//                     isOpen={isRepDialogOpen}
//                     onClose={() => setIsRepDialogOpen(false)}
//                     onSelectRep={handleSelectRep}
//                     isOnline={isOnline}
//                     key={`${isOnline}`}
//                 />
//             )}
//         </>
//     );
// };

// export default InvoiceDetailsForm;
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown } from 'lucide-react';
import { Dispatch, ReactNode, SetStateAction, useEffect, useState,useMemo } from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { AccountSaleCreateSchema } from '@/api-queries/point-of-sale/account-sales/account-sales';
import { useGetDebtorStoreDepartmentList, DebtorStoreDepartmentItem } from '@/api-queries/store-department';
import { useGetDebtorSourceDocumentList, DebtorSourceDocumentItem } from '@/api-queries/source-document';
// import {
//     useGetStoreDepartments,
//     StoreDepartmentDetails,
//     useGetStoreDepartmentsOffline,
// } from '@/api-queries/store-departments';
import { DebtorDialog } from '../../hoc/debtor-dialog';
import { RepDialog } from '../../hoc/rep-dialog';
import { CompanyCreditor } from '@/types';
import { useGetWarehouses, useGetWarehousesOffline, WarehouseDetails } from '@/api-queries/warehouse';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
import { generateInvoiceNumber } from '@/utils/helpers';
import { useInvoiceCountState } from '@/stores/invoice-count.store';
import { AccountSalesType, accountSaleFieldMap } from '@/api-queries/point-of-sale/account-sales/types';
import { SaleOrderCreateSchema } from '@/api-queries/point-of-sale/account-sales/sale-order';
import { QuotationCreateSchema } from '@/api-queries/point-of-sale/account-sales/quotations';
import moment from 'moment';
import { useDebtorList, useGetDebtorsOffline } from '@/api-queries/debtor';
import { Button } from '@/components/ui/button';
import { useAuthUser } from '@/stores/auth-user.store';
import { toast } from 'sonner';

interface InvoiceDetailsFormProps {
    control: Control<AccountSaleCreateSchema | SaleOrderCreateSchema | QuotationCreateSchema>;
    setValue: (
        name: keyof AccountSaleCreateSchema | keyof SaleOrderCreateSchema | keyof QuotationCreateSchema,
        value: any,
    ) => void;
    selectedDebtor: CompanyCreditor | null;
    setSelectedDebtor: Dispatch<SetStateAction<CompanyCreditor | null>>;
    isOnline: boolean;
    onSelectRep: (rep: SalesRepresentativeDetails) => void;
    selectedRep: SalesRepresentativeDetails | null;
    asType: AccountSalesType;
    setASType: Dispatch<SetStateAction<AccountSalesType>>;
    children?: ReactNode;
    isEmptyCart: boolean;
    isInclusivePrice: boolean;
    appliedPromotionDiscount: number;
}

export const ACCOUNT_SALES_TYPES: { label: string; value: AccountSalesType }[] = [
    { label: 'Invoice', value: 'INVOICE' },
    { label: 'Sale Order', value: 'SALES_ORDER' },
    { label: 'Quotation', value: 'QUOTATION' },
];

const InvoiceDetailsForm = ({
    control,
    setValue,
    selectedDebtor,
    setSelectedDebtor,
    isOnline,
    onSelectRep,
    selectedRep,
    asType,
    setASType,
    children,
    isEmptyCart,
    isInclusivePrice,
    appliedPromotionDiscount,
}: InvoiceDetailsFormProps) => {
    const asInvoiceCount = useInvoiceCountState((state) => state.asInvoiceCount);
const { data: debtorStoreDepartmentData, isLoading: isStoreDepartmentsLoading } =
    useGetDebtorStoreDepartmentList({
        limit: 1000,
        offset: 0,
    });

const storeDepartments: DebtorStoreDepartmentItem[] = debtorStoreDepartmentData?.data ?? [];

const { data: debtorSourceDocumentData, isLoading: isSourceDocumentsLoading } =
    useGetDebtorSourceDocumentList({
        limit: 1000,
        offset: 0,
    });

const sourceDocuments: DebtorSourceDocumentItem[] = debtorSourceDocumentData?.data ?? [];

    const warehouses = isOnline
        ? useGetWarehouses({ limit: 1000, offset: 0 })?.data?.data
        : useGetWarehousesOffline(false)?.data?.data;
        console.log("waraehouses",warehouses)

    const { data: _ } = isOnline ? useDebtorList({}) : useGetDebtorsOffline(false);

    const [isDebtorDialogOpen, setIsDebtorDialogOpen] = useState(false);
    const [isRepDialogOpen, setIsRepDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: debtorData, isLoading: debtorLoading } = isOnline
    ? useDebtorList({
          limit: 10,
          offset: 0,
          search: debouncedSearch,
      })
    : useGetDebtorsOffline(false);

    const handleSelectDebtor = (debtor: CompanyCreditor) => {
        setValue('companyDebtorId', debtor.id);
        setSelectedDebtor(debtor || null);

        setValue('name', debtor.name || '');
        setValue('address', debtor.postalAddress || debtor.deliveryAddress || '');
        setValue('telephone', debtor.cellphoneNumber || '');
        setValue('email', debtor?.emailAddress || '');
        setValue('taxNumber', debtor?.preferredTaxRate || 0);

        setIsDebtorDialogOpen(false);
    };

    const handleSelectRep = (rep: SalesRepresentativeDetails) => {
        setValue('representativeId', `${rep.id}`);
        onSelectRep(rep);
        setIsRepDialogOpen(false);
    };

    useEffect(() => {
        if (asType === 'INVOICE') {
            const newInvoiceNumber = generateInvoiceNumber('AS', asInvoiceCount + 1);
            setValue('invoiceNumber', newInvoiceNumber);
        } else if (asType === 'SALES_ORDER') {
            const newSaleOrderNumber = generateInvoiceNumber('AS', asInvoiceCount + 1);
            setValue('salesOrderNumber', newSaleOrderNumber);
        } else if (asType === 'QUOTATION') {
            const newQuoteNumber = generateInvoiceNumber('AS', asInvoiceCount + 1);
            setValue('quotationNumber', newQuoteNumber);
        }
    }, [asType, asInvoiceCount]);

    const getTypeLabel = () => (asType === 'SALES_ORDER' ? 'S/Order' : asType === 'QUOTATION' ? 'Quote' : 'Invoice');

    return (
        <>
            <div className="grid grid-cols-2 gap-4 overflow-y-auto px-4 py-2 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gray-700">Document Details</h3>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="companyDebtorId" className="w-28 shrink-0 text-xs">
                            Account No <MandatoryField />
                        </Label>
                        <div className="relative flex-grow">
                            {/* <FormField
                                control={control}
                                name="companyDebtorId"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="relative">
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    value={selectedDebtor?.accountNumber || ''}
                                                    className={`border-input h-7 w-full rounded-md border ${isEmptyCart ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer bg-white'} px-2 py-1 pr-8 text-xs`}
                                                    readOnly
                                                    onClick={() => (isEmptyCart ? null : setIsDebtorDialogOpen(true))}
                                                />
                                            </FormControl>
                                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                        </div>
                                        <FormMessage className="!-mt-2 !text-xs" />
                                    </FormItem>
                                )}
                            /> */}
                                <FormField
                                control={control}
                                name="companyDebtorId"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="relative">
                                            <FormControl>
                                                <Input
                                                    value={
                                                        selectedDebtor?.accountNumber ||
                                                        searchTerm
                                                    }
                                                    placeholder="Search debtor..."
                                                    className="border-input h-7 w-full rounded-md border bg-white px-2 py-1 pr-8 text-xs"
                                                    
                                                    onChange={(e) => {
                                                        setSelectedDebtor(null);

                                                        setSearchTerm(e.target.value);

                                                        setShowDropdown(true);
                                                    }}
                                                    onFocus={() => setShowDropdown(true)}
                                                    onBlur={() => {
                                                        setTimeout(() => {
                                                            setShowDropdown(false);
                                                        }, 200);
                                                    }}
                                                />
                                            </FormControl>

                                            {/* Chevron Button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!isEmptyCart) {
                                                        setIsDebtorDialogOpen(true);
                                                    }
                                                }}
                                                className="absolute top-1/2 right-2 -translate-y-1/2"
                                            >
                                                <ChevronDown className="h-4 w-4 text-gray-500" />
                                            </button>
                                        </div>

                                        {/* Dropdown Results */}
                                            {showDropdown && (
                                                <div className="absolute top-full z-50 mt-1 max-h-72 w-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-md border border-gray-200 bg-white shadow-lg">
                                                    {debtorLoading ? (
                                                        <div className="p-3 text-xs text-gray-500">
                                                            Searching...
                                                        </div>
                                                    ) : debtorData?.data?.rows?.length ? (
                                                        debtorData.data.rows.map((debtor) => (
                                                            <div
                                                                key={debtor.id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();

                                                                    handleSelectDebtor(debtor);

                                                                    setSearchTerm('');

                                                                    setShowDropdown(false);
                                                                }}
                                                                className="cursor-pointer border-b border-gray-100 px-3 py-2 hover:bg-gray-50"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-xs font-semibold text-gray-800">
                                                                        {debtor.accountNumber}
                                                                    </p>

                                                                    {debtor.cellphoneNumber && (
                                                                        <p className="text-[10px] text-gray-500">
                                                                            {debtor.cellphoneNumber}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                <p className="text-xs text-gray-600">
                                                                    {debtor.name}
                                                                </p>

                                                                {(debtor.postalAddress ||
                                                                    debtor.deliveryAddress) && (
                                                                    <p className="line-clamp-1 text-[10px] text-gray-400">
                                                                        {debtor.postalAddress ||
                                                                            debtor.deliveryAddress}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : searchTerm ? (
                                                        <div className="p-3 text-xs text-gray-500">
                                                            No debtor found
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 text-xs text-gray-500">
                                                            Start typing to search
                                                        </div>
                                                    )}
                                                </div>
                                            )}

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
                    <h3 className="text-sm font-semibold text-gray-700">{getTypeLabel()} Details</h3>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="warehouseId" className="w-28 shrink-0 text-xs">
                            Type
                        </Label>
                        <Select onValueChange={(val) => setASType(val as AccountSalesType)} value={asType}>
                            <SelectTrigger className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs">
                                <SelectValue placeholder="Select a warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                {ACCOUNT_SALES_TYPES &&
                                    ACCOUNT_SALES_TYPES.map((data) => (
                                        <SelectItem key={data.value} value={data.value}>
                                            {data.label}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor={accountSaleFieldMap[asType].DATE} className="w-28 shrink-0 text-xs">
                            {getTypeLabel()} Date
                        </Label>
                        <FormField
                            control={control}
                            name={accountSaleFieldMap[asType].DATE}
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

                    {asType === 'SALES_ORDER' ? (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="salesOrderEstimatedDate" className="w-28 shrink-0 text-xs">
                                Estimated Delivery Date
                            </Label>
                            <FormField
                                control={control}
                                name="salesOrderEstimatedDate"
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="date"
                                                className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs appearance-auto [&::-webkit-calendar-picker-indicator]:block [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                                                min={moment().format('YYYY-MM-DD')}
                                                // onKeyDown={(e) => e.preventDefault()}
                                                onClick={(e) => {
                                                    e.currentTarget.showPicker?.();
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage className="!-mt-2 !text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>
                    ) : null}

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
                        <Label htmlFor={accountSaleFieldMap[asType].NUMBER} className="w-28 shrink-0 text-xs">
                            {getTypeLabel()} Number <MandatoryField />
                        </Label>
                        <FormField
                            control={control}
                            name={accountSaleFieldMap[asType].NUMBER}
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
                        <Label htmlFor="internalOrderNo" className="w-28 shrink-0 text-xs">
                            Internal Order No
                        </Label>
                        <FormField
                            control={control}
                            name="internalOrderNo"
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
                        <Label htmlFor={accountSaleFieldMap[asType].MEMO} className="w-28 shrink-0 text-xs">
                            {getTypeLabel()} Memo
                        </Label>
                        <FormField
                            control={control}
                            name={accountSaleFieldMap[asType].MEMO}
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
                                                    storeDepartments.map((store: DebtorStoreDepartmentItem) => (
                                                        <SelectItem key={store.id} value={store.id}>
                                                            {store.name}
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
                        <Label htmlFor="sourceDocumentId" className="w-28 shrink-0 text-xs">
                            Source Document
                        </Label>
                        <FormField
                            control={control}
                            name="sourceDocumentId"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs">
                                                <SelectValue placeholder="Select a source document" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sourceDocuments &&
                                                    sourceDocuments.map((doc: DebtorSourceDocumentItem) => (
                                                        <SelectItem key={doc.id} value={doc.id}>
                                                            {doc.name}
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
                                                //@ts-ignore
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
                        <Label className="w-28 shrink-0 text-xs">{getTypeLabel()} Inclusive</Label>
                        <FormField
                            control={control}
                            name={accountSaleFieldMap[asType].INCLUSIVE}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={isEmptyCart}
                                            className="flex space-x-4"
                                        >
                                            <div className="flex items-center space-x-1">
                                                <RadioGroupItem
                                                    value="Yes"
                                                    id={`${accountSaleFieldMap[asType].INCLUSIVE}Yes`}
                                                    className="h-4 w-4"
                                                />
                                                <Label
                                                    htmlFor={`${accountSaleFieldMap[asType].INCLUSIVE}Yes`}
                                                    className="text-xs"
                                                >
                                                    Yes
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <RadioGroupItem
                                                    value="No"
                                                    id={`${accountSaleFieldMap[asType].INCLUSIVE}No`}
                                                    className="h-4 w-4"
                                                />
                                                <Label
                                                    htmlFor={`${accountSaleFieldMap[asType].INCLUSIVE}No`}
                                                    className="text-xs"
                                                >
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

                    {asType === 'INVOICE' ? (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="invoiceDiscountPercentage" className="w-28 shrink-0 text-xs">
                                Invoice Disc %
                            </Label>
                            <FormField
                                control={control}
                                name="invoiceDiscountPercentage"
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
                    ) : null}

                    <div className="flex items-center gap-2">
                        <Label className="w-28 shrink-0 text-xs font-semibold">Goods Total</Label>
                        <Input
                            type="number"
                            step="0.01"
                            readOnly
                            value={(
                                control._formValues.goodsTotal +
                                control._formValues.discountAmount +
                                control._formValues.promotionDiscountAmount +
                                (control._formValues.loyaltyDiscountAmount || 0) -
                                (isInclusivePrice ? 0 : control._formValues.taxAmount)
                            )?.toFixed(2)}
                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
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
                                            value={field.value?.toFixed(2)}
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

                    {appliedPromotionDiscount ? (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="promotionDiscountAmount" className="w-28 shrink-0 text-xs">
                                Promotion Disc.
                            </Label>
                            <FormField
                                control={control}
                                name="promotionDiscountAmount"
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value?.toFixed(2)}
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
                    ) : null}

                    {asType === 'INVOICE' ? (
                        <div className="flex items-center gap-2">
                            <Label className="w-28 shrink-0 text-xs font-semibold">Loyalty Discount</Label>
                            <FormField
                                control={control}
                                name="loyaltyDiscountAmount"
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value?.toFixed(2) || '0.00'}
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
                    ) : null}

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
                                            value={isInclusivePrice ? '0.00' : field.value?.toFixed(2)}
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
                        <Input
                            readOnly
                            value={
                                control._formValues.totalQuantity +
                                (control._formValues.totalFreeQuantity
                                    ? ` + ${control._formValues.totalFreeQuantity} free`
                                    : '')
                            }
                            className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="goodsTotal" className="w-28 shrink-0 text-xs">
                            Payable Amount
                        </Label>
                        <FormField
                            control={control}
                            name="goodsTotal"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            value={field.value?.toFixed(2)}
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

                    {children && children}
                </div>
            </div>

            {isDebtorDialogOpen && (
                <DebtorDialog
                    isOpen={isDebtorDialogOpen}
                    onClose={() => setIsDebtorDialogOpen(false)}
                    onSelectDebtor={handleSelectDebtor}
                    isOnline={isOnline}
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

export default InvoiceDetailsForm;