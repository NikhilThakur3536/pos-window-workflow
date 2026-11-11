import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { TaxStatus, UpdatedCompanyCreditor } from '@/types/creditor.types';
import { useCreateCreditorFn, useUpdateCreditorFn } from '@/api-queries/creditor';
import { toast } from 'sonner';
import moment from 'moment-timezone';
import { cleanDataPayload, toNumber } from '@/utils/helpers';

const PAYMENT_TERM_OPTIONS = ['COD', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days'];

interface AccountInformationFormData {
    accountNumber: string;
    name: string;
    alternativeName?: string;
    tradingAs?: string;
    companyRegistrationNumber?: string;
    taxNumber?: string;
    taxStatus: TaxStatus;
    preferredTaxRate: string;
    title?: string;
    initials?: string;
    idNumber?: string;
    contact?: string;
    birthday?: string;
    cellphoneNumber?: string;
    emailAddress?: string;
    faxNumber?: string;
    telephoneNumberOne?: string;
    telephoneNumberTwo?: string;
    country?: string;
    area?: string;
    postalAddress?: string;
    postalCode?: string;
    deliveryAddress?: string;
    deliveryAddressPostalCode?: string;
    deliveryRoute?: string;
    picture?: FileList | null;
    terms: string;
    creditLimit: string;
}

type CreateExtras = {
    bankingInfo?: Record<string, unknown>;
    settings?: Record<string, unknown>;
};

const AccountInformation = ({
    creditor,
    onClose,
    createExtrasRef,
    onCreateSubmitReady,
}: {
    creditor: UpdatedCompanyCreditor | null;
    onClose: () => void;
    createExtrasRef?: MutableRefObject<CreateExtras>;
    onCreateSubmitReady?: (submit: (() => void) | null) => void;
}) => {
    const { register, handleSubmit, control, watch, reset } = useForm<AccountInformationFormData>({
        defaultValues: {
            accountNumber: creditor?.accountNumber || '',
            name: creditor?.name || '',
            // alternativeName: creditor?.alternativeName || '',
            tradingAs: creditor?.tradingAs || '',
            companyRegistrationNumber: creditor?.companyRegistrationNumber || '',
            taxNumber: creditor?.taxNumber || '',
            taxStatus: creditor?.taxStatus || TaxStatus.NON_VAT,
            preferredTaxRate: creditor?.preferredTaxRate || '0',
            title: creditor?.title || '',
            initials: creditor?.initials || '',
            idNumber: creditor?.idNumber || '',
            contact: creditor?.contact || '',
            birthday: creditor?.birthday || '',
            cellphoneNumber: creditor?.cellphoneNumber || '',
            emailAddress: creditor?.emailAddress || '',
            faxNumber: creditor?.faxNumber || '',
            telephoneNumberOne: creditor?.telephoneNumberOne || '',
            telephoneNumberTwo: creditor?.telephoneNumberTwo || '',
            country: creditor?.countryId || '',
            area: creditor?.area || '',
            postalAddress: creditor?.postalAddress || '',
            postalCode: creditor?.postalCode || '',
            deliveryAddress: creditor?.deliveryAddress || '',
            deliveryAddressPostalCode: creditor?.deliveryAddressPostalCode || '',
            deliveryRoute: creditor?.deliveryAddress || '',
            terms: creditor?.terms ?? 'COD',
            creditLimit: creditor?.creditLimit != null ? String(creditor.creditLimit) : '',
        },
    });
    const { mutate: createCreditor } = useCreateCreditorFn();
    const { mutate: updateCreditor } = useUpdateCreditorFn();

    const onSubmit = (data: AccountInformationFormData) => {
        const createExtras = createExtrasRef?.current;
        const payload = cleanDataPayload({
            ...data,
            creditLimit: data.creditLimit === '' ? undefined : toNumber(data.creditLimit),
        });
        // Banking details are read/written through `bankingInfo` and are edited only on the
        // Payment Settings tab. On update they are omitted so stored bank details stay
        // untouched; create still needs the draft because no creditor row exists yet.
        const bankingInfo = cleanDataPayload(createExtras?.bankingInfo ?? {});
        const hasBankingDetails = Boolean(bankingInfo?.bankName && bankingInfo?.bankAccount);

        if (creditor) {
            updateCreditor(
                {
                    creditorId: creditor?.id,
                    ...payload,
                },
                {
                    onSuccess: () => {
                        toast.success('Creditor updated successfully');
                        reset();
                        onClose();
                    },
                    onError: (error: any) => {
                        // @ts-ignore
                        toast.error(error?.response.data.message || 'Internal Server Error!');
                    },
                },
            );
        } else {
            createCreditor(
                {
                    ...payload,
                    timezone: moment.tz.guess(),
                    ...(hasBankingDetails ? { bankingInfo } : {}),
                    ...(createExtras?.settings?.status ? { status: String(createExtras.settings.status) } : {}),
                    ...(createExtras?.settings ? { settings: createExtras.settings } : {}),
                },
                {
                    onSuccess: () => {
                        toast.success('Creditor added successfully');
                        reset();
                        onClose();
                    },
                    onError: (error: any) => {
                        // @ts-ignore
                        toast.error(error?.response.data.message || 'Internal Server Error!');
                    },
                },
            );
        }

        if (data.picture && data.picture.length > 0) {
            console.log('Picture:', data.picture[0].name);
        }
    };

    const submitForm = handleSubmit(onSubmit);
    const submitFormRef = useRef(submitForm);
    submitFormRef.current = submitForm;

    // Other tabs use this shared submit so the create request always contains the
    // Account Information fields as well as their own drafts.
    useEffect(() => {
        if (creditor) return;
        onCreateSubmitReady?.(() => submitFormRef.current());
        return () => onCreateSubmitReady?.(null);
    }, [creditor, onCreateSubmitReady]);

    const handleShowHints = () => {
        console.log('Show Hints clicked for Account Information');
    };

    const logoFile = watch('picture');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        if (logoFile && logoFile.length > 0) {
            const file = logoFile[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setLogoPreview(null);
        }
    }, [logoFile]);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 gap-3 p-2 lg:grid-cols-2">
                    <Card className="flex-1 gap-0 overflow-hidden py-0 pb-2">
                        <CardHeader className="mb-2 gap-0 bg-white px-4 py-1">
                            <CardTitle className="text-sm">Creditor Information</CardTitle>
                        </CardHeader>

                        <CardContent className="grid gap-2 p-4 py-0">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="accountNumber" className="text-sm">
                                    Account Number
                                </Label>
                                <Input id="accountNumber" {...register('accountNumber')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="name" className="text-sm">
                                    Name
                                </Label>
                                <Input id="name" {...register('name')} className="col-span-2 h-8" />
                            </div>
                            {/* <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="alterNativeName" className="text-sm">
                                    Alternative Name
                                </Label>
                                <Input id="alterNativeName" {...register('alterNativeName')} className="col-span-2 h-8" />
                            </div> */}
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="tradingAs" className="text-sm">
                                    Trading As
                                </Label>
                                <Input id="tradingAs" {...register('tradingAs')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="taxNumber" className="text-sm">
                                    Company Registry No
                                </Label>
                                <Input
                                    id="companyRegistrationNumber"
                                    {...register('companyRegistrationNumber')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Tax No</Label>
                                <Input {...register('taxNumber')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="taxStatus" className="text-sm">
                                    Tax Status
                                </Label>
                                <Controller
                                    name="taxStatus"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select tax status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Registered">Registered</SelectItem>
                                                <SelectItem value="Unregistered">Unregistered</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Preferred Tax Rate</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="preferredTaxRate"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                    <Select>
                                        <SelectTrigger className="h-8 w-full flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="15%">15%</SelectItem>
                                            <SelectItem value="0%">0%</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Terms and credit limit live on the main creditor account, not in
                                bankingInfo. Payment Settings owns the bank details. */}
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Payment Terms</Label>
                                <Controller
                                    name="terms"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select payment terms" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {field.value && !PAYMENT_TERM_OPTIONS.includes(field.value) ? (
                                                    <SelectItem value={field.value}>{field.value}</SelectItem>
                                                ) : null}
                                                {PAYMENT_TERM_OPTIONS.map((term) => (
                                                    <SelectItem key={term} value={term}>
                                                        {term}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="creditLimit" className="text-sm">
                                    Credit Limit
                                </Label>
                                <Input
                                    id="creditLimit"
                                    type="number"
                                    step="0.01"
                                    {...register('creditLimit')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 gap-0 overflow-hidden py-0 pb-2">
                        <CardHeader className="mb-2 gap-0 bg-white px-4 py-1">
                            <CardTitle className="text-sm">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 p-4 py-0">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="title" className="text-sm">
                                    Title
                                </Label>
                                <Controller
                                    name="title"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select title" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Mr.">Mr.</SelectItem>
                                                <SelectItem value="Ms.">Ms.</SelectItem>
                                                <SelectItem value="Mrs.">Mrs.</SelectItem>
                                                <SelectItem value="Dr.">Dr.</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="initials" className="text-sm">
                                    Initials
                                </Label>
                                <Input id="initials" {...register('initials')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="idNumber" className="text-sm">
                                    I.D. Number
                                </Label>
                                <Input id="idNumber" {...register('idNumber')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="contact" className="text-sm">
                                    Contact
                                </Label>
                                <Input id="contact" {...register('contact')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="birthday" className="text-sm">
                                    Birthday
                                </Label>
                                <Input id="birthday" type="date" {...register('birthday')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="cellphoneNumber" className="text-sm">
                                    Cellphone Number
                                </Label>
                                <Input
                                    id="cellphoneNumber"
                                    {...register('cellphoneNumber')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="emailAddress" className="text-sm">
                                    E-Mail Address
                                </Label>
                                <Input
                                    id="emailAddress"
                                    type="email"
                                    {...register('emailAddress')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="faxNumber" className="text-sm">
                                    Fax Number
                                </Label>
                                <Input id="faxNumber" {...register('faxNumber')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="telephoneNumberOne" className="text-sm">
                                    Telephone Number 1
                                </Label>
                                <Input
                                    id="telephoneNumberOne"
                                    {...register('telephoneNumberOne')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="telephoneNumberTwo" className="text-sm">
                                    Telephone Number 2
                                </Label>
                                <Input
                                    id="telephoneNumberTwo"
                                    {...register('telephoneNumberTwo')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 gap-0 overflow-hidden py-0 pb-2">
                        <CardHeader className="mb-2 gap-0 bg-white px-4 py-1">
                            <CardTitle className="text-sm">Address</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 p-4 py-0">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="country" className="text-sm">
                                    Country
                                </Label>
                                <Controller
                                    name="country"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select country" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="South Africa">South Africa</SelectItem>
                                                <SelectItem value="USA">USA</SelectItem>
                                                <SelectItem value="UK">UK</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="area" className="text-sm">
                                    Area
                                </Label>
                                <Input id="area" {...register('area')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-start gap-2">
                                <Label htmlFor="postalAddress" className="pt-2 text-sm">
                                    Postal Address
                                </Label>
                                <textarea
                                    id="postalAddress"
                                    {...register('postalAddress')}
                                    rows={3}
                                    className="border-input focus:ring-ring col-span-2 resize-none rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="postalCode" className="text-sm">
                                    Postal Code
                                </Label>
                                <Input id="postalCode" {...register('postalCode')} className="h-8 w-24" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 gap-0 overflow-hidden py-0 pb-2">
                        <CardHeader className="mb-2 gap-0 bg-white px-4 py-1">
                            <CardTitle className="text-sm">Delivery Address</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 p-4 py-0">
                            <div className="grid grid-cols-3 items-start gap-2">
                                <Label htmlFor="deliveryAddress" className="pt-2 text-sm">
                                    Delivery Address
                                </Label>
                                <textarea
                                    id="deliveryAddress"
                                    {...register('deliveryAddress')}
                                    rows={4}
                                    className="border-input focus:ring-ring col-span-2 resize-none rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="deliveryAddressPostalCode" className="text-sm">
                                    Delivery Postal Code
                                </Label>
                                <Input
                                    id="deliveryAddressPostalCode"
                                    {...register('deliveryAddressPostalCode')}
                                    className="h-8 w-24"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Delivery Route</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Select>
                                        <SelectTrigger className="h-8 w-full flex-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Route 1">Route 1</SelectItem>
                                            <SelectItem value="Route 2">Route 2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input {...register('deliveryRoute')} className="h-8 flex-1" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Picture card intentionally disabled. Banking details live only on the
                        Payment Settings tab so there is a single Banking Information section. */}

                    {/* <Card className="flex-1 gap-0 overflow-hidden py-0 pb-2">
                        <CardHeader className="mb-2 gap-0 bg-white px-4 py-1">
                            <CardTitle className="text-sm">Picture</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 p-4 py-0">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="picture" className="text-sm">
                                    Upload Picture
                                </Label>
                                <Input
                                    id="picture"
                                    type="file"
                                    {...register('picture')}
                                    className="col-span-2 h-8"
                                    accept="image/*"
                                />
                            </div>
                            {logoPreview && (
                                <div className="grid grid-cols-3 items-center gap-2">
                                    <Label className="text-sm">Picture Preview</Label>
                                    <img
                                        src={logoPreview || '/placeholder.svg'}
                                        alt="Picture Preview"
                                        className="col-span-2 h-24 w-24 rounded-md border border-gray-200 object-contain"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card> */}
                </div>
            </div>

            <div className="mt-4 flex-none">
                <AcceptHintActions onShowHints={handleShowHints} onAccept={handleSubmit(onSubmit)} />
            </div>
        </form>
    );
};

export default AccountInformation;
