import {
    StockDetails,
    useCompanyStockDetailById,
    useCreateCompanyStockDetail,
    useUpdateCompanyStockDetail,
} from '@/api-queries/company/stock-details';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    CreateStockDetailsSchema,
    createStockDetailsSchema,
    updateStockDetailsSchema,
    UpdateStockDetailsSchema,
} from '@/schema/company/stock-details';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { ChevronDown, Plus, Save, Trash2, XIcon } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import moment from 'moment-timezone';
import { toast } from 'sonner';
import { CategoryDetails, useGetCategories } from '@/api-queries/categories';
import { SubCategoryDetails, useGetSubCategories } from '@/api-queries/categories/sub-categories';
import { StockRangeDetails, useGetStockRanges } from '@/api-queries/company/stock-ranges';
import { StockVariantDetails, useGetStockVariants } from '@/api-queries/masters/stock-variants';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { ProductSelection } from '../hoc/product-selection';
import { useNetworkStore } from '@/stores/network.store';
import { Button } from '@/components/ui/button';
import { useAuthUser } from '@/stores/auth-user.store';
import { useGetTaxRates } from '@/api-queries/company-details/tax-rates';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import SelectPopover from '@/components/select-popover';
import ImageManager from '@/components/image-manager';
import { type ScopedImage } from '@/api-queries/company/images';

function StockDetailsWrapper({
    initialData,
    stockId,
    backButton,
    onClose,
}: {
    initialData?: StockDetails;
    stockId: string;
    backButton?: ReactNode;
    onClose: () => void;
}) {
    const authUserType = useAuthUser((state) => state.user?.userType);
    const isCompanyDebtor = authUserType === 'COMPANY-DEBTOR-USER';

    const isOnline = useNetworkStore((state) => state?.online);
    const [enablePackOptions, setEnablePackOptions] = useState(false);

    // Product images uploaded before the product exists. Attached on create via the
    // `productImages` array. When editing, images are managed directly against the
    // existing product id and do not flow through the record payload.
    const [pendingProductImages, setPendingProductImages] = useState<ScopedImage[]>([]);

    const createStock = useCreateCompanyStockDetail();
    const updateStock = useUpdateCompanyStockDetail();
    const isEditing = !!stockId;

    const form = useForm({
        resolver: zodResolver(isEditing ? updateStockDetailsSchema : createStockDetailsSchema),
        disabled: authUserType === 'COMPANY-DEBTOR-USER',
        values: {
            id: initialData?.id || '',
            ...(isEditing ? { status: initialData?.status || '' } : { timezone: moment.tz.guess() }),
            itemCode: initialData?.itemCode || '',
            description: initialData?.description || '',
            alternativeDescription: initialData?.alternativeDescription || '',
            barcode: initialData?.barcode || '',
            generalCode: initialData?.generalCode || '',
            storageBinLocation: initialData?.storageLocation || '',
            packSize:
                initialData?.packSize !== undefined && initialData?.packSize !== null
                    ? String(initialData.packSize)
                    : '',
            packDescription: initialData?.packDescription || '',
            reportToItem: initialData?.reportToItem || '',
            lifeTimeDays:
                initialData?.lifeTimeInDays !== undefined && initialData?.lifeTimeInDays !== null
                    ? String(initialData.lifeTimeInDays)
                    : '',
            genericType: initialData?.genericTypeId || '',
            brand: initialData?.brandId || '',
            model: initialData?.modelId || '',
            technicalSpecifications: initialData?.technicalSpecificationsId || '',
            supplierHierarchy: initialData?.supplierHierarchyId || '',
            supplierDepartment: initialData?.supplierDepartmentId || '',
            tariffCode: initialData?.tariffCodeId || '',
            material: initialData?.materialId || '',
            assemblyType: initialData?.assemblyTypeId || '',
            importType: initialData?.importTypeId || '',
            colourDetailed: initialData?.colourDetailedId || '',
            incoTerms: initialData?.incoTermsId || '',
            guaranteeTerms: initialData?.guaranteeTermsId || '',
            buyer: initialData?.buyerId || '',
            defaultLineRep: initialData?.defaultLineRepId || '',
            weight: initialData?.weight !== undefined && initialData?.weight !== null ? String(initialData.weight) : '',
            length: initialData?.length !== undefined && initialData?.length !== null ? String(initialData.length) : '',
            width: initialData?.width !== undefined && initialData?.width !== null ? String(initialData.width) : '',
            underBatchControl: initialData?.underBatchControl ?? false,
            disallowDecimals: initialData?.disallowDecimals ?? false,
            section7Exempt: initialData?.sectionSevenExempt ?? false,
            domesticReverseCharge: initialData?.domesticReverseCharge ?? false,
            abcClassification: initialData?.abcClassification || '',
            overrideGrvLabelQty: initialData?.overrideGrvLabelQuantity ?? false,
            allowSellingUnderCost: initialData?.allowSellingUnderCost ?? false,
            allowSellingIntoNegative: initialData?.allowSellingIntoNegative ?? false,
            allowDiscount: initialData?.allowDiscount ?? false,
            itemOnHold: initialData?.itemOnHold ?? false,
            setDormantDays:
                initialData?.dormantDays !== undefined && initialData?.dormantDays !== null
                    ? String(initialData.dormantDays)
                    : '',
            scaleItem: initialData?.scaleItem ?? false,
            categoryId: initialData?.categoryId || '',
            subCategoryId: initialData?.subCategoryId || '',
            rangeId: initialData?.rangeId || '',
            variantId: initialData?.variantId || '',

            taxes: initialData?.taxes || [],
        },
    });

    const { handleSubmit, watch, setValue } = form;

    // Taxes
    const taxRates = useGetTaxRates({})?.data?.data?.rows;

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'taxes',
    });

    const addTax = () => {
        if (fields.length >= 5) return;

        append({
            companyTaxRateId: '',
            priority: undefined,
            isCompound: false,
        });
    };

    const removeTax = (index: number) => {
        remove(index);
    };

    const categories = useGetCategories({})?.data?.data?.rows;
    const categoryId = watch('categoryId');
    const subCategories = useGetSubCategories(categoryId ? { categoryId } : {})?.data?.data?.rows;
    const subCategoryId = watch('subCategoryId');
    const stockRanges = useGetStockRanges(
        subCategoryId ? { subCategoryId, limit: 500 } : { limit: 500 },
    )?.data?.data?.rows;
    const stockVariants = useGetStockVariants({ limit: 500, status: 'ACTIVE' })?.data?.data?.rows;

    useEffect(() => {
        setValue('subCategoryId', '');
    }, [categoryId]);

    useEffect(() => {
        setValue('rangeId', '');
    }, [subCategoryId]);

    useEffect(() => {
        if (initialData) {
            setValue('subCategoryId', initialData?.subCategoryId);
            setValue('rangeId', initialData?.rangeId || '');
            setEnablePackOptions(!!initialData?.packSize);
            setPackItem(initialData?.reportToItemDetails || null);
        }
    }, [initialData]);

    const onSubmit = (data: CreateStockDetailsSchema | UpdateStockDetailsSchema) => {
        if (enablePackOptions) {
            if (!watch('packSize')) {
                toast.error('Pack size is required when pack options are enabled');
                return;
            }
            if (!watch('packDescription')) {
                toast.error('Pack desc. is required when pack options are enabled');
                return;
            }
        }

        if (isEditing) {
            updateStock.mutate(data as UpdateStockDetailsSchema, {
                onSuccess: (res) => {
                    if (res.success) {
                        toast.success('Stock updated successfully');
                        form.reset();
                        onClose();
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        } else {
            const productImages = pendingProductImages.length
                ? pendingProductImages.map((img, i) => ({
                      imageUrl: img.imageUrl,
                      imageKey: img.imageKey,
                      fileName: img.fileName,
                      mimeType: img.mimeType,
                      fileSize: img.fileSize,
                      sortOrder: i,
                      isPrimary: i === 0,
                  }))
                : null;
            createStock.mutate(
                {
                    ...(data as CreateStockDetailsSchema),
                    ...(productImages ? { productImages } : {}),
                } as CreateStockDetailsSchema & {
                    productImages?: {
                        imageUrl?: string;
                        imageKey?: string;
                        fileName?: string;
                        mimeType?: string;
                        fileSize?: number;
                        sortOrder?: number;
                        isPrimary?: boolean;
                    }[];
                },
                {
                    onSuccess: (res) => {
                        if (res.success) {
                            toast.success('Stock created successfully');
                            form.reset();
                            onClose();
                        }
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    },
                },
            );
        }
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for default settings');
    };

    const handleAccept = () => {
        handleSubmit(onSubmit)();
    };

    // Pack Item

    const [packItem, setPackItem] = useState<StockDetails | null>(null);
    const [isPackItemDialogOpen, setIsPackItemDialogOpen] = useState(false);

    const handleSelectPackItem = (item: StockDetails) => {
        setPackItem(item);
        setValue('reportToItem', item.id);
        setIsPackItemDialogOpen(false);
    };

    function onProductSelectionClose() {
        setIsPackItemDialogOpen(false);
    }

    return (
        <Form {...form}>
            {authUserType === 'COMPANY-DEBTOR-USER' ? (
                <div className="absolute top-0 right-0 flex-none border-t-0 !p-0">{backButton}</div>
            ) : (
                <AcceptHintActions
                    onShowHints={handleShowHints}
                    onAccept={handleAccept}
                    containerClassName="flex-none !p-0 border-t-0 absolute right-0 top-0"
                    SaveButtonIcon={Save}
                    saveButtonTitle="Save"
                >
                    {backButton ? backButton : null}
                </AcceptHintActions>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="gap-4">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-700">Item Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="itemCode"
                                render={({ field }) => (
                                    <div className="grid grid-cols-1">
                                        <FormItem className="item-center flex gap-2">
                                            <FormLabel className="w-28 text-xs">
                                                Item Code <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <div className="w-full">
                                                <FormControl>
                                                    <Input {...field} className="h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="!mt-1 !text-xs" />
                                            </div>
                                        </FormItem>
                                    </div>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <div className="grid grid-cols-1">
                                        <FormItem className="item-center flex gap-2">
                                            <FormLabel className="w-28 text-xs">
                                                Description
                                                <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <div className="w-full">
                                                <FormControl>
                                                    <Input {...field} className="h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="!mt-1 !text-xs" />
                                            </div>
                                        </FormItem>
                                    </div>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="alternativeDescription"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Alternative Description</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="h-7 text-xs" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="barcode"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Barcode</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="h-7 text-xs" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="generalCode"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">General Code</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="h-7 text-xs" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="stockType"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Stock Type</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="stock">Stock</SelectItem>
                                                    <SelectItem value="non-stock">Non-Stock</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem className="flex items-start gap-2">
                                        <FormLabel className="w-28 gap-0 text-xs">
                                            Category <MandatoryField />
                                        </FormLabel>
                                        <div className="w-full">
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger
                                                        disabled={isCompanyDebtor}
                                                        className="!h-fit text-xs"
                                                    >
                                                        <SelectValue placeholder="Select a category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories &&
                                                            categories.map((data: CategoryDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.name} ({data.code})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="!mt-1 !text-xs" />
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="subCategoryId"
                                render={({ field }) => (
                                    <FormItem className="flex items-start gap-2">
                                        <FormLabel className="w-28 gap-0 text-xs">
                                            Sub Category <MandatoryField />
                                        </FormLabel>
                                        <div className="w-full">
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger
                                                        className="!h-fit text-xs"
                                                        disabled={!categoryId || isCompanyDebtor}
                                                    >
                                                        <SelectValue placeholder="Select a sub category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {subCategories &&
                                                            subCategories.map((data: SubCategoryDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.name} ({data.code})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="!mt-1 !text-xs" />
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="rangeId"
                                render={({ field }) => (
                                    <FormItem className="flex items-start gap-2">
                                        <FormLabel className="w-28 gap-0 text-xs">Range</FormLabel>
                                        <div className="w-full">
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger
                                                        className="!h-fit text-xs"
                                                        disabled={!subCategoryId || isCompanyDebtor}
                                                    >
                                                        <SelectValue placeholder="Select a range" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {stockRanges &&
                                                            stockRanges.map((data: StockRangeDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.name} ({data.code})
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="!mt-1 !text-xs" />
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="variantId"
                                render={({ field }) => (
                                    <FormItem className="flex items-start gap-2">
                                        <FormLabel className="w-28 gap-0 text-xs">Variant</FormLabel>
                                        <div className="w-full">
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger
                                                        className="!h-fit text-xs"
                                                        disabled={isCompanyDebtor}
                                                    >
                                                        <SelectValue placeholder="Select a variant" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {stockVariants &&
                                                            stockVariants.map((data: StockVariantDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.identifier}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="!mt-1 !text-xs" />
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <div className="flex items-center space-x-2">
                                <Label htmlFor="enable-pack-options" className="gap-0 text-xs">
                                    Enable Pack options
                                </Label>
                                <Checkbox
                                    id="enable-pack-options"
                                    className="bg-white"
                                    checked={enablePackOptions}
                                    onCheckedChange={(val) => {
                                        setEnablePackOptions(!!val);
                                        setValue('reportToItem', '');
                                        setValue('packDescription', '');
                                        setValue('packSize', '');
                                    }}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="unitCode"
                                render={({ field }) => (
                                    <div className="grid grid-cols-1">
                                        <FormItem className="item-center flex gap-2">
                                            <FormLabel className="w-28 text-xs">Unit Code</FormLabel>
                                            <div className="w-full">
                                                <FormControl>
                                                    <Input {...field} className="h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="!mt-1 !text-xs" />
                                            </div>
                                        </FormItem>
                                    </div>
                                )}
                            />

                            {authUserType === 'COMPANY-DEBTOR-USER' ? null : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="caseCode"
                                        render={({ field }) => (
                                            <div className="grid grid-cols-1">
                                                <FormItem className="item-center flex gap-2">
                                                    <FormLabel className="w-28 text-xs">Case Code</FormLabel>
                                                    <div className="w-full">
                                                        <FormControl>
                                                            <Input {...field} className="h-7 text-xs" />
                                                        </FormControl>
                                                        <FormMessage className="!mt-1 !text-xs" />
                                                    </div>
                                                </FormItem>
                                            </div>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="shrinkCode"
                                        render={({ field }) => (
                                            <div className="grid grid-cols-1">
                                                <FormItem className="item-center flex gap-2">
                                                    <FormLabel className="w-28 text-xs">Shrink Code</FormLabel>
                                                    <div className="w-full">
                                                        <FormControl>
                                                            <Input {...field} className="h-7 text-xs" />
                                                        </FormControl>
                                                        <FormMessage className="!mt-1 !text-xs" />
                                                    </div>
                                                </FormItem>
                                            </div>
                                        )}
                                    />
                                </>
                            )}

                            {enablePackOptions ? (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="packSize"
                                        render={({ field }) => (
                                            <div className="grid grid-cols-1">
                                                <FormItem className="item-center flex gap-2">
                                                    <FormLabel className="w-28 text-xs">Pack Size</FormLabel>
                                                    <div className="w-full">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                className="h-7 text-xs"
                                                                placeholder="E.g. 10"
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="!mt-1 !text-xs" />
                                                    </div>
                                                </FormItem>
                                            </div>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="packDescription"
                                        render={({ field }) => (
                                            <div className="grid grid-cols-1">
                                                <FormItem className="item-center flex gap-2">
                                                    <FormLabel className="w-28 text-xs">Pack Desc.</FormLabel>
                                                    <div className="w-full">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                className="h-7 text-xs"
                                                                placeholder="E.g. Carton"
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="!mt-1 !text-xs" />
                                                    </div>
                                                </FormItem>
                                            </div>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="reportToItem"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="relative grid grid-cols-1">
                                                    <FormItem className="item-center flex gap-2">
                                                        <FormLabel className="w-28 text-xs">Report to item</FormLabel>

                                                        <div className="w-full">
                                                            <FormControl>
                                                                <Input
                                                                    {...field}
                                                                    value={
                                                                        packItem
                                                                            ? `${packItem?.description} (${packItem?.itemCode})`
                                                                            : ''
                                                                    }
                                                                    className="border-input h-7 w-full cursor-pointer rounded-md border bg-white px-2 py-1 pr-8 text-xs"
                                                                    readOnly
                                                                    onClick={() => setIsPackItemDialogOpen(true)}
                                                                    placeholder="Select Report to item"
                                                                />
                                                            </FormControl>
                                                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                                            <FormMessage className="!-mt-2 !text-xs" />
                                                        </div>
                                                    </FormItem>

                                                    {packItem ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute top-0.5 right-6 h-6 w-6 p-0 text-[10px] text-red-500 hover:text-black"
                                                            onClick={() => {
                                                                setValue('reportToItem', '');
                                                                setPackItem(null);
                                                            }}
                                                        >
                                                            <XIcon />
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : null}
                        </CardContent>
                    </Card>

                    {/* <Card className="gap-4">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-700">Item Specifications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="genericType"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Generic Type</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="!h-fit text-xs" disabled={isCompanyDebtor}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="type1">Type 1</SelectItem>
                                                    <SelectItem value="type2">Type 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="brand"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Brand</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="brand1">Brand 1</SelectItem>
                                                    <SelectItem value="brand2">Brand 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Model</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="model1">Model 1</SelectItem>
                                                    <SelectItem value="model2">Model 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="technicalSpecifications"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Technical Specifications</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="spec1">Specification 1</SelectItem>
                                                    <SelectItem value="spec2">Specification 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="supplierHierarchy"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Supplier Hierarchy</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="supplier1">Supplier 1</SelectItem>
                                                    <SelectItem value="supplier2">Supplier 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="supplierDepartment"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Supplier Department</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="dept1">Department 1</SelectItem>
                                                    <SelectItem value="dept2">Department 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tariffCode"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Tariff Code</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="tariff1">Tariff 1</SelectItem>
                                                    <SelectItem value="tariff2">Tariff 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="material"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Material</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="material1">Material 1</SelectItem>
                                                    <SelectItem value="material2">Material 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="assemblyType"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Assembly Type</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="assembly1">Assembly 1</SelectItem>
                                                    <SelectItem value="assembly2">Assembly 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="importType"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Import Type</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="import1">Import 1</SelectItem>
                                                    <SelectItem value="import2">Import 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="colourDetailed"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Colour Detailed</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="red">Red</SelectItem>
                                                    <SelectItem value="blue">Blue</SelectItem>
                                                    <SelectItem value="green">Green</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="incoTerms"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Inco Terms</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fob">FOB</SelectItem>
                                                    <SelectItem value="cif">CIF</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="guaranteeTerms"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Guarantee Terms</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1year">1 Year</SelectItem>
                                                    <SelectItem value="2year">2 Years</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="buyer"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Buyer</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="buyer1">Buyer 1</SelectItem>
                                                    <SelectItem value="buyer2">Buyer 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card> */}

                    <Card className="gap-4">
                        {/* <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-700">
                                <div className="flex items-center justify-between">
                                    Item Taxes{' '}
                                    {isCompanyDebtor ? null : (
                                        <Button onClick={addTax} size="sm" className="text-xs">
                                            <Plus /> Add Tax
                                        </Button>
                                    )}
                                </div>
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Tax Rate</TableHead>
                                        <TableHead className="w-[20%]">Priority</TableHead>
                                        <TableHead className="w-[20%]">Cmpnd?</TableHead>
                                        <TableHead className="w-[20%] text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {fields.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="text-muted-foreground text-center text-xs"
                                            >
                                                No taxes added
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        fields.map((item, index) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    {taxRates && (
                                                        <FormField
                                                            control={form.control}
                                                            name={`taxes.${index}.companyTaxRateId`}
                                                            render={({ field }) => (
                                                                <SelectPopover
                                                                    options={taxRates?.map((rate) => ({
                                                                        value: rate.id,
                                                                        label: `${rate.description}`,
                                                                    }))}
                                                                    selectedValue={field.value}
                                                                    onSelect={field.onChange}
                                                                    wrapperClass="min-w-[180px]"
                                                                    selectClass="text-xs"
                                                                    title="Tax Rate"
                                                                />
                                                            )}
                                                        />
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <FormField
                                                        control={form.control}
                                                        name={`taxes.${index}.priority`}
                                                        render={({ field }) => (
                                                            <Input
                                                                type="number"
                                                                className="h-7 text-xs"
                                                                value={field.value ?? ''}
                                                                onChange={(e) =>
                                                                    field.onChange(
                                                                        e.target.value === ''
                                                                            ? undefined
                                                                            : Number(e.target.value),
                                                                    )
                                                                }
                                                            />
                                                        )}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <FormField
                                                        control={form.control}
                                                        name={`taxes.${index}.isCompound`}
                                                        render={({ field }) => (
                                                            <div className="flex items-center justify-center">
                                                                <Checkbox
                                                                    checked={field.value ?? false}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </div>
                                                        )}
                                                    />
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => removeTax(index)}
                                                        className="h-8 w-8 text-red-600"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent> */}

                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-700">Item Settings</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="underBatchControl"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                        <FormControl>
                                            <Checkbox
                                                disabled={isCompanyDebtor}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="text-xs">Under Batch Control - Tick for Yes</FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="disallowDecimals"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                        <FormControl>
                                            <Checkbox
                                                disabled={isCompanyDebtor}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="text-xs">Disallow Decimals - Tick to Disallow</FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="section7Exempt"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                        <FormControl>
                                            <Checkbox
                                                disabled={isCompanyDebtor}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="text-xs">Section 7 Exempt - Tick for Yes</FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="domesticReverseCharge"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                        <FormControl>
                                            <Checkbox
                                                disabled={isCompanyDebtor}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="text-xs">
                                            Domestic Reverse Charge - Tick for Yes
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="abcClassification"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">ABC Classification</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue placeholder="Not Defined" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CLASS-A-TOP-PRODUCTS">CLASS-A-TOP-PRODUCTS</SelectItem>
                                                    <SelectItem value="CLASS-B-TOP-KVI-LINES-PER-CATEGORY">CLASS-B-TOP-KVI-LINES-PER-CATEGORY</SelectItem>
                                                    <SelectItem value="CLASS-C-NON-SENSITIVE-LINES">CLASS-C-NON-SENSITIVE-LINES</SelectItem>
                                                    {/* <SelectItem value="Not Defined">Not Defined</SelectItem> */}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <div className="flex items-center space-x-2">
                                <FormField
                                    control={form.control}
                                    name="overrideGrvLabelQty"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                            <FormControl>
                                                <Checkbox
                                                    disabled={isCompanyDebtor}
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-xs">Override GRV Label Qty - Override</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="overrideQty"
                                    render={({ field }) => (
                                        <FormItem className="item-center flex gap-2">
                                            <FormControl>
                                                <Input {...field} className="h-8 w-16 text-xs" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="excludeFromExtraCharge"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                        <FormControl>
                                            <Checkbox
                                                disabled={isCompanyDebtor}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="text-xs">
                                            Exclude from Extra Charge Cost Allocation on GRV - Tick for Yes
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ignoreQuantityChange"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                        <FormControl>
                                            <Checkbox
                                                disabled={isCompanyDebtor}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="text-xs">
                                            Ignore {"'Quantity Change'"} Security Override - Tick for Yes
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-700">Images</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ImageManager
                                mode={isEditing ? 'managed' : 'pending'}
                                scope="product"
                                scopeId={isEditing ? stockId : undefined}
                                disabled={isCompanyDebtor}
                                onChange={isEditing ? undefined : setPendingProductImages}
                                helperText={
                                    isEditing
                                        ? 'Upload, reorder, set the primary image, or delete product images. Changes apply immediately.'
                                        : 'Images are uploaded first and attached to the product when it is saved.'
                                }
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    <Card className="gap-4">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-700">Item Categorisation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="majorDepartment"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Major Department</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="dept1">Department 1</SelectItem>
                                                    <SelectItem value="dept2">Department 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="minorDepartment"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Minor Department</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="minor1">Minor 1</SelectItem>
                                                    <SelectItem value="minor2">Minor 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ranges"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Ranges</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="range1">Range 1</SelectItem>
                                                    <SelectItem value="range2">Range 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cycle"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Cycle</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cycle1">Cycle 1</SelectItem>
                                                    <SelectItem value="cycle2">Cycle 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="taxRate"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Tax Rate</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">1</SelectItem>
                                                    <SelectItem value="15">15</SelectItem>
                                                    <SelectItem value="0">0</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card className="gap-4">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-700">Item Storage</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="dcItemCode"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">DC Item Code</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="h-7 text-xs" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="storageBinLocation"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Storage / BIN Location</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="h-7 text-xs" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="lifeTimeDays"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Life Time (Days)</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="h-7 text-xs" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="defaultLineRep"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Default Line Rep</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="rep1">Rep 1</SelectItem>
                                                    <SelectItem value="rep2">Rep 2</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card className="gap-4">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-700">Volumetrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="unitOfMeasureHolding"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Unit of Measure (Holding)</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue placeholder="Units" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="units">Units</SelectItem>
                                                    <SelectItem value="kg">Kg</SelectItem>
                                                    <SelectItem value="litres">Litres</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="unitOfMeasureInput"
                                render={({ field }) => (
                                    <FormItem className="item-center flex gap-2">
                                        <FormLabel className="w-28 text-xs">Unit of Measure (Input)</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger disabled={isCompanyDebtor} className="!h-fit text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="units">Units</SelectItem>
                                                    <SelectItem value="kg">Kg</SelectItem>
                                                    <SelectItem value="litres">Litres</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <div className="pt-4">
                                <h4 className="mb-3 text-sm font-medium text-gray-700">Load / Storage Dimensions</h4>
                                <div className="space-y-3">
                                    <FormField
                                        control={form.control}
                                        name="weight"
                                        render={({ field }) => (
                                            <FormItem className="item-center flex gap-2">
                                                <FormLabel className="w-28 text-xs">Weight</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="h-7 text-xs" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="length"
                                        render={({ field }) => (
                                            <FormItem className="item-center flex gap-2">
                                                <FormLabel className="w-28 text-xs">Length</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="h-7 text-xs" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="width"
                                        render={({ field }) => (
                                            <FormItem className="item-center flex gap-2">
                                                <FormLabel className="w-28 text-xs">Width</FormLabel>
                                                <FormControl>
                                                    <Input {...field} className="h-7 text-xs" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="gap-4">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-700">Item Price Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="allowSellingUnderCost"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                        <FormControl>
                                            <Checkbox
                                                disabled={isCompanyDebtor}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="w-28 text-xs">
                                            Allow Selling under cost - Tick for Yes
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="allowSellingIntoNegative"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                        <FormControl>
                                            <Checkbox
                                                disabled={isCompanyDebtor}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="w-28 text-xs">
                                            Allow Selling Into Negative - Tick for Yes
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="allowDiscount"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                        <FormControl>
                                            <Checkbox
                                                disabled={isCompanyDebtor}
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="w-28 text-xs">
                                            Allow Discount - Click for Options
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />

                            <div className="pt-4">
                                <h4 className="mb-3 text-sm font-medium text-gray-700">Item Status Settings</h4>
                                <div className="space-y-3">
                                    <FormField
                                        control={form.control}
                                        name="itemOnHold"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                                <FormControl>
                                                    <Checkbox
                                                        disabled={isCompanyDebtor}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="w-28 text-xs">
                                                    Item on Hold - Click for Options
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex items-center space-x-2">
                                        <Label className="text-xs">Set Dormant (Days)</Label>
                                        <FormField
                                            control={form.control}
                                            name="setDormantDays"
                                            render={({ field }) => (
                                                <FormItem className="item-center flex gap-2">
                                                    <FormControl>
                                                        <Input {...field} className="h-8 w-16 text-xs" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="storeSerialNumbers"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                                <FormControl>
                                                    <Checkbox
                                                        disabled={isCompanyDebtor}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="w-28 text-xs">
                                                    Store Serial Numbers - Tick for Yes
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="scaleItem"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-y-0 space-x-2">
                                                <FormControl>
                                                    <Checkbox
                                                        disabled={isCompanyDebtor}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="w-28 text-xs">
                                                    Scale Item - Tick for Yes
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div> */}
            </form>

            {isPackItemDialogOpen && (
                <ProductSelection
                    isOpen={isPackItemDialogOpen}
                    onClose={onProductSelectionClose}
                    onSelectProduct={handleSelectPackItem}
                    key={initialData?.id || ''}
                    isOnline={isOnline}
                    isReportToItem={true}
                    isGRV={true}
                />
            )}
        </Form>
    );
}

export default function StockDetailsForm({
    stockId,
    backButton,
    onClose,
}: {
    stockId: string;
    backButton?: ReactNode;
    onClose: () => void;
}) {
    const stockDetails = useCompanyStockDetailById(stockId);
    return (
        <StockDetailsWrapper
            stockId={stockId}
            initialData={stockDetails.data?.data}
            backButton={backButton}
            onClose={onClose}
        />
    );
}
