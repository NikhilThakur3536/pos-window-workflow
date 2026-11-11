import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
    COMPANY_DEBTOR_TYPES,
    CompanyDebtor,
    CompanyDebtorBankingInfo,
    CompanyDebtorSetting,
    CompanyDebtorType,
    TaxStatus,
} from '@/types/creditor.types';
import { useCreateDebtorFn, useUpdateDebtorFn } from '@/api-queries/debtor';
import { toast } from 'sonner';
import moment from 'moment-timezone';
import { toNumber } from '@/utils/helpers';
import { getCompanies, Company } from '@/api-queries/company-details';

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
    companyDebtorType: CompanyDebtorType;
    useAlternateBillingCompany?: boolean;
    billingCompanyId?: string | null;
    terms: string;
    creditLimit: string;
}

type CreateExtras = {
    bankingInfo?: Partial<CompanyDebtorBankingInfo>;
    settings?: Partial<CompanyDebtorSetting>;
};

const PAYMENT_TERM_OPTIONS = ['COD', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days'];

const AccountInformation = ({
    debtor,
    onClose,
    createExtrasRef,
    onCreateSubmitReady,
}: {
    debtor: CompanyDebtor | null;
    onClose: () => void;
    createExtrasRef?: MutableRefObject<CreateExtras>;
    onCreateSubmitReady?: (submit: (() => void) | null) => void;
}) => {
    // Get company data from localStorage
    const getCompanyData = () => {
        try {
            const authStore = localStorage.getItem('pos-auth-store');
            if (!authStore) return { id: '', name: '' };

            const parsed = JSON.parse(authStore);
            return {
                id: parsed?.state?.company?.id || '',
                name: parsed?.state?.company?.companyName || '',
            };
        } catch (e) {
            console.error('Failed to read company data from pos-auth-store', e);
            return { id: '', name: '' };
        }
    };

    const companyData = getCompanyData();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);

    // Pre-filled straight from POST /api/company/debtor/get, matching its field names.
    const buildDefaults = (): AccountInformationFormData => ({
        accountNumber: debtor?.accountNumber ?? '',
        name: debtor?.name ?? '',
        alternativeName: debtor?.name ?? '',
        tradingAs: debtor?.tradingAs ?? '',
        companyRegistrationNumber: debtor?.companyRegistrationNumber ?? '',
        taxNumber: debtor?.taxNumber ?? '',
        taxStatus: (debtor?.taxStatus as TaxStatus) ?? TaxStatus.NON_VAT,
        preferredTaxRate: String(Number(debtor?.preferredTaxRate) || 0),
        title: debtor?.title ?? '',
        initials: debtor?.initials ?? '',
        idNumber: debtor?.idNumber ?? '',
        contact: debtor?.contact ?? '',
        birthday: debtor?.birthday ?? '',
        cellphoneNumber: debtor?.cellphoneNumber ?? '',
        emailAddress: debtor?.emailAddress ?? '',
        faxNumber: debtor?.faxNumber ?? '',
        telephoneNumberOne: debtor?.telephoneNumberOne ?? '',
        telephoneNumberTwo: debtor?.telephoneNumberTwo ?? '',
        country: debtor?.country ?? '',
        area: debtor?.area ?? '',
        postalAddress: debtor?.postalAddress ?? '',
        postalCode: debtor?.postalCode ?? '',
        deliveryAddress: debtor?.deliveryAddress ?? '',
        deliveryAddressPostalCode: debtor?.deliveryAddressPostalCode ?? '',
        deliveryRoute: debtor?.deliveryRoutes ?? '',
        companyDebtorType: (debtor?.companyDebtorType as CompanyDebtorType) ?? 'EXTERNAL',
        useAlternateBillingCompany: debtor?.useAlternateBillingCompany ?? false,
        billingCompanyId: debtor?.billingCompanyId ?? companyData.id,
        terms: debtor?.terms ?? 'COD',
        creditLimit: debtor?.creditLimit != null ? String(debtor.creditLimit) : '',
    });

    const { register, handleSubmit, control, watch, reset } = useForm<AccountInformationFormData>({
        defaultValues: buildDefaults(),
    });

    // Re-open the tab for a different debtor and the form must show that debtor's values.
    useEffect(() => {
        reset(buildDefaults());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debtor?.id]);

    const { mutate: createDebtor } = useCreateDebtorFn();
    const { mutate: updateDebtor } = useUpdateDebtorFn();

    const companyDebtorType = watch('companyDebtorType');
    const useAlternateBillingCompany = watch('useAlternateBillingCompany');
    const showAlternateBilling = companyDebtorType === 'COMPANY_OWNED';
    // The company list is only relevant once the debtor actually opts into an
    // alternate biller, so it stays hidden (and unfetched) until then.
    const showBillingCompanyList = showAlternateBilling && !!useAlternateBillingCompany;

    useEffect(() => {
        const fetchCompanies = async () => {
            if (!showBillingCompanyList) return;

            setLoadingCompanies(true);
            try {
                const response = await getCompanies({});
                setCompanies(response.data || []);
            } catch (error) {
                console.error('Failed to fetch companies:', error);
                toast.error('Failed to load companies list');
            } finally {
                setLoadingCompanies(false);
            }
        };

        fetchCompanies();
    }, [showBillingCompanyList]);

    // Send the whole record back, not just the fields on screen. Anything the form does
    // not render is taken from the record the GET returned, so an edit on this tab can
    // never blank out a column that another tab owns.
    const buildPayload = (data: AccountInformationFormData) => {
        const record: Partial<CompanyDebtor> = debtor ?? {};
        const createExtras = createExtrasRef?.current;

        return {
            ...(debtor?.id ? { debtorId: record.id, id: record.id } : {}),
            timezone: record.timezone,
            domainId: record.domainId,
            companyId: record.companyId,
            accountNumber: data.accountNumber,
            name: data.name,
            tradingAs: data.tradingAs,
            companyRegistrationNumber: data.companyRegistrationNumber,
            taxNumber: data.taxNumber,
            taxStatus: data.taxStatus,
            // plain rate, no % sign: the value is reused directly as a tax number on invoices
            preferredTaxRate: toNumber(data.preferredTaxRate),
            title: data.title,
            branch: record.branch ?? null,
            // Terms and credit limit are main-account fields. The backend derives
            // paymentMode, creditTermDays and requireTenderOnAccountSale from `terms`,
            // so they are deliberately not sent from here.
            terms: data.terms,
            creditLimit: data.creditLimit === '' ? null : toNumber(data.creditLimit),
            normalRep: record.normalRep ?? null,
            initials: data.initials,
            idNumber: data.idNumber,
            contact: data.contact,
            birthday: data.birthday,
            cellphoneNumber: data.cellphoneNumber,
            faxNumber: data.faxNumber,
            emailAddress: data.emailAddress,
            address1: record.address1 ?? null,
            address2: record.address2 ?? null,
            address3: record.address3 ?? null,
            address4: record.address4 ?? null,
            // the country label column is `country`; `countryId` is a separate column
            country: data.country,
            countryId: record.countryId ?? null,
            telephoneNumberOne: data.telephoneNumberOne,
            telephoneNumberTwo: data.telephoneNumberTwo,
            area: data.area,
            postalAddress: data.postalAddress,
            postalCode: data.postalCode,
            deliveryAddress1: record.deliveryAddress1 ?? null,
            deliveryAddress2: record.deliveryAddress2 ?? null,
            deliveryAddress3: record.deliveryAddress3 ?? null,
            deliveryAddress4: record.deliveryAddress4 ?? null,
            deliveryAddress: data.deliveryAddress,
            deliveryAddressPostalCode: data.deliveryAddressPostalCode,
            deliveryRoutes: data.deliveryRoute,
            onHold: record.onHold ?? false,
            status: debtor ? (record.status ?? null) : (createExtras?.settings?.status ?? record.status ?? null),
            currency: record.currency ?? null,
            vatStatus: record.vatStatus ?? null,
            companyDebtorType: data.companyDebtorType,
            useAlternateBillingCompany: data.useAlternateBillingCompany,
            // Never send a biller while the option is switched off.
            billingCompanyId: data.useAlternateBillingCompany ? (data.billingCompanyId ?? null) : null,
            companyDebtorGroupId: record.companyDebtorGroupId ?? null,
            // Banking belongs to the Payment Settings tab. On update it is omitted so the
            // stored bank details stay untouched; the create request still needs the draft
            // because no debtor row exists yet.
            ...(!debtor && createExtras?.bankingInfo?.bankName && createExtras?.bankingInfo?.bankAccount
                ? { bankingInfo: createExtras.bankingInfo }
                : {}),
            // When creating, the Additional Information tab is mounted but has no record
            // to save against yet, so its values ride along with the create request.
            // The backend reads this block as `settings` on create/update.
            ...(!debtor && createExtras?.settings ? { settings: createExtras.settings } : {}),
        };
    };

    const onSubmit = (data: AccountInformationFormData) => {
        const payload = buildPayload(data);

        if (debtor) {
            updateDebtor(payload, {
                onSuccess: () => {
                    toast.success('Debtor updated successfully');
                    onClose();
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        } else {
            createDebtor(
                {
                    ...payload,
                    timezone: payload.timezone || moment.tz.guess(),
                },
                {
                    onSuccess: () => {
                        toast.success('Debtor created successfully');
                        reset();
                        onClose();
                    },
                    onError: (error: any) => {
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    },
                },
            );
        }
    };

    const submitForm = handleSubmit(onSubmit);
    const submitFormRef = useRef(submitForm);
    submitFormRef.current = submitForm;

    // Other tabs use this shared submit so the create request always contains the
    // Account Information fields as well as their own drafts.
    useEffect(() => {
        if (debtor) return;
        onCreateSubmitReady?.(() => submitFormRef.current());
        return () => onCreateSubmitReady?.(null);
    }, [debtor, onCreateSubmitReady]);

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
                            <CardTitle className="text-sm">Debtor Information</CardTitle>
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
                                <Label htmlFor="companyDebtorType" className="text-sm">
                                    Debtor Type
                                </Label>
                                <Controller
                                    name="companyDebtorType"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select company debtor type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COMPANY_DEBTOR_TYPES?.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {showAlternateBilling && (
                                <div className="grid grid-cols-3 items-center gap-2">
                                    <Label className="text-sm">Use Alternate Billing Company</Label>
                                    <div className="col-span-2">
                                        <Controller
                                            name="useAlternateBillingCompany"
                                            control={control}
                                            render={({ field }) => (
                                                <Checkbox
                                                    checked={!!field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {showBillingCompanyList && (
                                <div className="grid grid-cols-3 items-center gap-2">
                                    <Label className="text-sm">Billing Company</Label>
                                    <Controller
                                        name="billingCompanyId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                <SelectTrigger className="col-span-2 h-8 w-full">
                                                    <SelectValue placeholder="Select billing company" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {loadingCompanies ? (
                                                        <SelectItem value="any" disabled>
                                                            Loading companies...
                                                        </SelectItem>
                                                    ) : (
                                                        companies.map((company) => (
                                                            <SelectItem key={company.id} value={company.id}>
                                                                {company.companyName || company.companyName}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                    {companyData.id && !companies.some((c) => c.id === companyData.id) && (
                                                        <SelectItem value={companyData.id}>
                                                            {companyData.name} (Current)
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="companyRegistrationNumber" className="text-sm">
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
                                <div className="col-span-2">
                                    <Controller
                                        name="preferredTaxRate"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={String(field.value ?? '0')}>
                                                <SelectTrigger className="h-8 w-full">
                                                    <SelectValue placeholder="Select tax rate" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">0%</SelectItem>
                                                    <SelectItem value="15">15%</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* ========== Payment Terms / Credit Limit ========== */}
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
                            {/* Payment mode, credit term days and tender-on-account-sale are
                                derived by the backend from the selected terms. */}
                            {/* ============================================== */}
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
