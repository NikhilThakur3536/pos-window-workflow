import { useCompanyStockPricingLevelList } from '@/api-queries/company/stock-level';
import {
    CompanyStockPricing,
    useCompanyStockPricingList,
    useCreateCompanyStockPricing,
    useUpdateCompanyStockPricing,
} from '@/api-queries/company/stock-pricing';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import moment from 'moment-timezone';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import PricingTypeCombobox from '../company/pricing/pricing-type-combobox';
import { createStockPricingSchema, CreateStockPricingSchema } from '@/schema/company/stock-details';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2 } from 'lucide-react';
import { Fragment, HTMLInputTypeAttribute, ReactNode, useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useCompanyStockPricingTypeList, CompanyStockPricingType } from '@/api-queries/company/stock-pricing-type';
import {
    calculateGpPercent,
    calculateMarkupPercent,
    calculatePriceFromGp,
    calculatePriceFromMarkup,
    toFixedNumber,
} from '@/utils/helpers';
import { useAuthUser } from '@/stores/auth-user.store';
import { useCompanyStockDetailById } from '@/api-queries/company/stock-details';
import { useGetSPVariantGroups } from '@/api-queries/variant-groups/sell-price';
import { PageLoader } from '@/components/custom-components/PageLoader';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { isApprovalRequiredError, useApprovalRequired } from '@/hooks/use-approval-required';
import {
    OUTCOME_BADGE_CLASS,
    OUTCOME_LABELS,
    PricingPolicyValidationResult,
    RULE_SOURCE_LABELS,
    useValidatePricingPolicy,
} from '@/api-queries/pricing-policy/cost-consistency';

const EMPTY_ROW = {
    companyStockPricingTypeId: '',
    priceExclusive: undefined,
    priceInclusive: undefined,
    markupPercent: undefined,
    gpPercent: undefined,
    // markupPercentLatestCost: 0,
    // gpPercentLatestCost: 0,
    // markupPercentFutureCost: 0,
    // gpPercentFutureCost: 0,
};

type FIELD_KEYS_TYPE = {
    key: keyof CreateStockPricingSchema['pricingTypes'][0];
    label: string;
    type: HTMLInputTypeAttribute;
    disabled?: boolean;
};

const FIELD_KEYS: FIELD_KEYS_TYPE[] = [
    { key: 'priceExclusive', label: 'Price Exclusive', type: 'number' },
    { key: 'priceInclusive', label: 'Price Inclusive', type: 'number' },
    { key: 'gpPercent', label: 'GP %', type: 'number' },
    { key: 'markupPercent', label: 'Markup %', type: 'number' },
    { key: 'enable', label: 'Enable', type: 'checkbox' },
    // { key: 'markupPercentLatestCost', label: 'Markup % (Latest Cost)', type: 'number', disabled: true },
    // { key: 'gpPercentLatestCost', label: 'GP % (Latest Cost)', type: 'number', disabled: true },
    // { key: 'markupPercentFutureCost', label: 'Markup % (Future Cost)', type: 'number', disabled: true },
    // { key: 'gpPercentFutureCost', label: 'GP % (Future Cost)', type: 'number', disabled: true },
];

// Preview result for a single edited price level. Each row is validated separately so the
// metrics shown belong to the row the operator is editing.
interface RowPolicyCheck {
    loading: boolean;
    result?: PricingPolicyValidationResult;
    error?: string;
}

function StockPricingWrapper({
    initialData,
    stockId,
    backButton,
    onClose,
    taxRate,
}: {
    initialData?: CompanyStockPricing;
    stockId: string;
    backButton?: ReactNode;
    onClose: () => void;
    taxRate: number;
}) {
    const isAdmin = useAuthUser((state) => state.user?.companyUserGroups?.[0]?.group?.name)?.toLowerCase() === 'admin';
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const authUserType = useAuthUser((state) => state.user?.userType);

    const variantGroupsQuery = useGetSPVariantGroups({});
    const sellingPriceVariantGroups = variantGroupsQuery.data?.data?.rows;

    const create = useCreateCompanyStockPricing();
    const update = useUpdateCompanyStockPricing();
    const fn = !!stockId ? update : create;

    // Cost consistency approval state:
    // - /pricingPolicy/validate is a preview; the create/update API makes the final decision.
    // - a 428 carries data.approvalRequestId, which opens the supervisor/fingerprint dialog.
    // - the approved retry resends the exact same payload with the X-Approval-Token header.
    const pendingPayloadRef = useRef<any>(null);
    const approvalRequestedRef = useRef(false);
    const approvalCtl = useApprovalRequired();

    // Each edited price level is validated separately and its result is kept against that row.
    const validateMutation = useValidatePricingPolicy();
    const [rowChecks, setRowChecks] = useState<Record<number, RowPolicyCheck>>({});
    // Updates always require a reason; creates only request one when approval is required.
    const [reasonRequired, setReasonRequired] = useState(!!stockId);
    const validateTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
    // Responses can arrive out of order; only the latest request for a row may set its result.
    const validateSeqRef = useRef<Record<number, number>>({});

    const costLevelsQuery = useCompanyStockPricingLevelList({});
    const pricingTypesQuery = useCompanyStockPricingTypeList({});
    const costLevelsList = costLevelsQuery.data?.data?.rows;
    const pricingTypesList = pricingTypesQuery.data?.data?.rows?.filter((data) =>
        authUserType === 'COMPANY-DEBTOR-USER' ? data.code === 'P1' : true,
    );
    const masterDataLoading =
        variantGroupsQuery.isLoading || costLevelsQuery.isLoading || pricingTypesQuery.isLoading;
    const masterDataError = [
        variantGroupsQuery.isError ? 'selling price variant groups' : '',
        costLevelsQuery.isError ? 'cost level definitions' : '',
        pricingTypesQuery.isError ? 'selling price levels' : '',
    ]
        .filter(Boolean)
        .join(', ');

    useEffect(() => {
        if (pricingTypesList && !initialData) {
            const types = pricingTypesList;
            types.forEach((type, idx) => {
                if (idx < pricingTypes.fields.length) {
                    form.setValue(`pricingTypes.${idx}.companyStockPricingTypeId`, type.id);
                }
            });
        }
    }, [pricingTypesList]);

    function buildPricingTypes(
        initialData: { pricingTypes?: CompanyStockPricing['pricingTypes'] },
        pricingTypesList: CompanyStockPricingType[],
    ) {
        if (!pricingTypesList) return [];

        const initialMap: Record<string, CompanyStockPricing['pricingTypes'][0]> = {};
        initialData?.pricingTypes?.forEach((p) => {
            initialMap[p.companyStockPricingTypeId] = p;
        });

        return pricingTypesList.map((type) => {
            const init = initialMap[type.id];

            return init
                ? {
                      priceExclusive:
                          init.priceExclusive != null ? toFixedNumber(init.priceExclusive) : undefined,
                      priceInclusive:
                          init.priceInclusive != null ? toFixedNumber(init.priceInclusive) : undefined,
                      markupPercent: init.markupPercent != null ? toFixedNumber(init.markupPercent) : undefined,
                      gpPercent: init.gpPercent != null ? toFixedNumber(init.gpPercent) : undefined,
                      enable: init.enable !== undefined ? init.enable : false,
                      companyStockPricingTypeId: type.id,
                  }
                : {
                      ...EMPTY_ROW,
                      companyStockPricingTypeId: type.id,
                  };
        });
    }

    const savedCategoryGpOverride = initialData?.settings?.overrideCategoryGpPolicy === true;
    const form = useForm({
        resolver: zodResolver(createStockPricingSchema),
        values: pricingTypesList
            ? {
                  companyStockDetailId: stockId,
                  reason: '',
                  pricingTypes: buildPricingTypes(initialData ?? {}, pricingTypesList),
                  settings: {
                      recommendedGpPercent: initialData?.settings?.recommendedGpPercent ?? undefined,
                      sellPriceVariantGroupId: initialData?.settings?.sellPriceVariantGroupId ?? '',
                      unitCost: initialData?.settings?.unitCost ?? undefined,
                      futureCost: initialData?.settings?.futureCost ?? undefined,
                      minGpPercent: savedCategoryGpOverride ? (initialData?.settings?.minGpPercent ?? null) : null,
                      maxGpPercent: savedCategoryGpOverride ? (initialData?.settings?.maxGpPercent ?? null) : null,
                      gpTolerancePercent: savedCategoryGpOverride
                          ? (initialData?.settings?.gpTolerancePercent ?? null)
                          : null,
                      blockingGpVariancePercent: savedCategoryGpOverride
                          ? (initialData?.settings?.blockingGpVariancePercent ?? null)
                          : null,
                      enforceGpPolicy: savedCategoryGpOverride
                          ? (initialData?.settings?.enforceGpPolicy ?? null)
                          : null,
                      overrideCategoryGpPolicy: savedCategoryGpOverride,
                  },
              }
            : undefined,
    });

    const { handleSubmit } = form;

    const pricingTypes = useFieldArray({
        control: form.control,
        name: 'pricingTypes',
    });

    const pricingTypeValues = form.watch('pricingTypes');
    const settingsValues = form.watch('settings');
    const reasonValue = form.watch('reason');
    const hasCategoryGpOverride = settingsValues?.overrideCategoryGpPolicy === true;

    // Identifies the exact payload an approval would cover. Any change to a price, a
    // setting or the reason after a 428 was issued invalidates that request.
    const approvalSignature = JSON.stringify({
        pricingTypes: (pricingTypeValues || []).map((row) => ({
            typeId: row?.companyStockPricingTypeId || '',
            exclusive: Number(row?.priceExclusive) || 0,
            inclusive: Number(row?.priceInclusive) || 0,
            gp: Number(row?.gpPercent) || 0,
            markup: Number(row?.markupPercent) || 0,
            enable: !!row?.enable,
        })),
        settings: settingsValues,
        reason: reasonValue || '',
    });

    useEffect(() => {
        if (!approvalRequestedRef.current) return;
        approvalRequestedRef.current = false;
        pendingPayloadRef.current = null;
        approvalCtl.closeApproval();
        setReasonRequired(true);
        form.setValue('reason', '');
        toast.info('Pricing changed — a new supervisor approval is required');
    }, [approvalSignature]);

    // Validate one edited price level at a time. Starting a new check clears that row's
    // previous result, so a stale "Within Policy" is never shown while the new one runs.
    const schedulePolicyValidation = (idx: number, priceExclusive: number | undefined) => {
        if (!stockId) return;

        const seq = (validateSeqRef.current[idx] || 0) + 1;
        validateSeqRef.current[idx] = seq;

        if (validateTimersRef.current[idx]) clearTimeout(validateTimersRef.current[idx]);

        if (priceExclusive == null || !Number.isFinite(priceExclusive) || priceExclusive < 0) {
            setRowChecks((prev) => {
                const next = { ...prev };
                delete next[idx];
                return next;
            });
            return;
        }

        setRowChecks((prev) => ({ ...prev, [idx]: { loading: true } }));

        validateTimersRef.current[idx] = setTimeout(() => {
            validateMutation.mutate(
                { companyStockDetailId: stockId, priceExclusive },
                {
                    onSuccess: (res) => {
                        if (seq !== validateSeqRef.current[idx]) return;
                        if (res?.success && res.data) {
                            setRowChecks((prev) => ({ ...prev, [idx]: { loading: false, result: res.data } }));
                        } else {
                            setRowChecks((prev) => ({
                                ...prev,
                                [idx]: { loading: false, error: res?.message || 'Validation failed' },
                            }));
                        }
                    },
                    // A failed check must not block typing; the save path still reports it.
                    onError: (error: any) => {
                        if (seq !== validateSeqRef.current[idx]) return;
                        setRowChecks((prev) => ({
                            ...prev,
                            [idx]: {
                                loading: false,
                                error: error?.response?.data?.message || 'Validation failed',
                            },
                        }));
                    },
                },
            );
        }, 400);
    };

    const handlePriceFieldChange = (idx: number, key: FIELD_KEYS_TYPE['key'], value?: number) => {
        if (key === 'enable') return;

        const latestCost = initialData?.costTypes?.latestCost;
        let nextExclusive: number | undefined;

        if (value === undefined) {
            if (key === 'priceExclusive' || key === 'priceInclusive') {
                form.setValue(`pricingTypes.${idx}.priceExclusive`, undefined);
                form.setValue(`pricingTypes.${idx}.priceInclusive`, undefined);
                form.setValue(`pricingTypes.${idx}.gpPercent`, undefined);
                form.setValue(`pricingTypes.${idx}.markupPercent`, undefined);
            }
        } else if (key === 'priceInclusive') {
            nextExclusive = +(value / (1 + taxRate)).toFixed(2);
            form.setValue(`pricingTypes.${idx}.priceExclusive`, nextExclusive);
            if (latestCost != null) {
                form.setValue(`pricingTypes.${idx}.gpPercent`, +calculateGpPercent(value, latestCost).toFixed(2));
                form.setValue(
                    `pricingTypes.${idx}.markupPercent`,
                    +calculateMarkupPercent(value, latestCost).toFixed(2),
                );
            } else {
                form.setValue(`pricingTypes.${idx}.gpPercent`, undefined);
                form.setValue(`pricingTypes.${idx}.markupPercent`, undefined);
            }
        } else if (key === 'priceExclusive') {
            nextExclusive = value;
            const priceInclusive = value * (1 + taxRate);
            form.setValue(`pricingTypes.${idx}.priceInclusive`, +priceInclusive.toFixed(2));
            if (latestCost != null) {
                form.setValue(`pricingTypes.${idx}.gpPercent`, calculateGpPercent(priceInclusive, latestCost));
                form.setValue(`pricingTypes.${idx}.markupPercent`, calculateMarkupPercent(priceInclusive, latestCost));
            } else {
                form.setValue(`pricingTypes.${idx}.gpPercent`, undefined);
                form.setValue(`pricingTypes.${idx}.markupPercent`, undefined);
            }
        } else if (key === 'gpPercent' && latestCost != null) {
            const priceInclusive = calculatePriceFromGp(value, latestCost);
            nextExclusive = +(priceInclusive / (1 + taxRate)).toFixed(2);
            form.setValue(`pricingTypes.${idx}.priceExclusive`, nextExclusive);
            form.setValue(`pricingTypes.${idx}.priceInclusive`, priceInclusive);
            form.setValue(`pricingTypes.${idx}.markupPercent`, calculateMarkupPercent(priceInclusive, latestCost));
        } else if (key === 'markupPercent' && latestCost != null) {
            const priceInclusive = calculatePriceFromMarkup(value, latestCost);
            nextExclusive = +(priceInclusive / (1 + taxRate)).toFixed(2);
            form.setValue(`pricingTypes.${idx}.priceExclusive`, nextExclusive);
            form.setValue(`pricingTypes.${idx}.priceInclusive`, priceInclusive);
            form.setValue(`pricingTypes.${idx}.gpPercent`, calculateGpPercent(priceInclusive, latestCost));
        }

        schedulePolicyValidation(idx, nextExclusive);
    };

    useEffect(
        () => () => {
            Object.values(validateTimersRef.current).forEach((timer) => clearTimeout(timer));
        },
        [],
    );

    const rowCheckList = Object.values(rowChecks);
    const blockedCheck = rowCheckList.find((check) => check.result?.blocked || check.result?.outcome === 'BLOCKED');
    const approvalRequired = rowCheckList.some(
        (check) => check.result?.requiresApproval || check.result?.outcome === 'APPROVAL_REQUIRED',
    );

    useEffect(() => {
        // Approval required is known from the preview: reveal the reason field now.
        if (approvalRequired) setReasonRequired(true);
    }, [approvalRequired]);

    function onSubmit(data: CreateStockPricingSchema) {
        // BLOCKED: do not submit; surface the message from the last validation.
        if (blockedCheck?.result) {
            toast.error(blockedCheck.result.warning || 'This price is blocked by the cost consistency policy');
            return;
        }
        if (!pricingTypesList) {
            toast.error('Pricing types could not be loaded. Please try again.');
            return;
        }
        if (masterDataError) {
            toast.error(`Could not load ${masterDataError}. Please retry.`);
            return;
        }

        const reason = String(data.reason || '').trim();

        // Updates and approval-required creates need a reason before submitting.
        if ((stockId || approvalRequired) && !reason) {
            setReasonRequired(true);
            setTimeout(() => form.setFocus('reason'), 50);
            toast.error('Enter a reason for this price change');
            return;
        }

        const payload: any = {
            ...data,
            ...(initialData?.id ? { id: initialData.id } : {}),
            timezone: moment.tz.guess(),
        };
        // No reason is sent for a within-policy or warning-only save.
        if (reason) payload.reason = reason;
        else delete payload.reason;
        payload.pricingTypes = data.pricingTypes.filter((item) => item.companyStockPricingTypeId);
        payload.pricingTypes = payload.pricingTypes.map((row: CreateStockPricingSchema['pricingTypes'][number]) =>
            Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)),
        );
        if (payload.settings?.overrideCategoryGpPolicy !== true) {
            delete payload.settings.minGpPercent;
            delete payload.settings.maxGpPercent;
            delete payload.settings.gpTolerancePercent;
            delete payload.settings.blockingGpVariancePercent;
            delete payload.settings.enforceGpPolicy;
        }
        submitPayload(payload);
    }

    // Company stock pricing runs the same cost consistency validation as pricingPolicy/validate.
    // WITHIN_POLICY / WARNING save normally. When the update answers HTTP 428 the approval
    // request id opens the supervisor dialog, and the identical payload is retried with the
    // granted token in the X-Approval-Token header.
    function submitPayload(payload: any, approvalToken?: string) {
        approvalRequestedRef.current = false;

        const request = approvalToken ? { ...payload, approvalToken } : payload;

        fn.mutate(request, {
            onSuccess: (res: any) => {
                approvalRequestedRef.current = false;
                pendingPayloadRef.current = null;

                if (res?.success) {
                    toast.success(`Stock pricing ${stockId ? 'updated' : 'created'} successfully`);
                    setRowChecks({});
                    form.reset();
                    onClose();
                    return;
                }

                const result = res?.data || {};

                if (result.blocked) {
                    toast.error(result.warning || res?.message || 'This price is blocked by the cost consistency policy');
                    return;
                }

                toast.error(res?.message || `Stock ${stockId ? 'updation' : 'creation'} failed`);
            },
            onError: (error: any) => {
                const approvalInfo = isApprovalRequiredError(error);
                if (approvalInfo) {
                    // The update may discover the approval requirement only at save time.
                    // Prompt for the reason first, then resubmit so the approval request
                    // covers the final payload (including the reason).
                    const reason = String(payload?.reason || '').trim();
                    if (!reason) {
                        pendingPayloadRef.current = null;
                        approvalRequestedRef.current = false;
                        setReasonRequired(true);
                        setTimeout(() => form.setFocus('reason'), 50);
                        toast.error('Enter a reason for this price change');
                        return;
                    }

                    pendingPayloadRef.current = payload;
                    approvalRequestedRef.current = true;
                    approvalCtl.setApproval({ ...approvalInfo, actionLabel: 'Manage Pricing Matrix' });
                    return;
                }

                pendingPayloadRef.current = null;
                approvalRequestedRef.current = false;
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    // Supervisor approved the request; retry the exact same update payload, this time with
    // the granted token. Success is only shown once that update actually succeeds.
    const handleApproved = (token: string, tokens?: Record<string, string>) => {
        const payload = pendingPayloadRef.current;
        const approvalToken = token || Object.values(tokens || {})[0];
        approvalCtl.closeApproval();
        if (!payload || !approvalToken) return;
        submitPayload(payload, approvalToken);
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for default settings');
    };

    const handleAccept = () => {
        handleSubmit(onSubmit)();
    };

    const formValues = form.getValues();

    return (
        <PageLoader isLoading={masterDataLoading || update.isPending || create.isPending} width="100vw" height="100vh">
            <Form {...form}>
                <AcceptHintActions
                    onShowHints={handleShowHints}
                    onAccept={handleAccept}
                    containerClassName="flex-none !p-0 border-t-0 absolute right-0 top-0"
                    SaveButtonIcon={Save}
                    saveButtonTitle="Save"
                >
                    {backButton ? backButton : null}
                </AcceptHintActions>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {masterDataError && (
                        <p role="alert" className="text-sm text-red-700">
                            Could not load {masterDataError}. Please retry before saving pricing.
                        </p>
                    )}
                    <div className="overflow-x-auto">
                        <table className="min-w-full border text-xs">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-2" />
                                    <td className="border p-2 text-center font-semibold">Price Type</td>
                                    {FIELD_KEYS.map((col) => (
                                        <th key={col.key} className="border p-2 font-medium text-gray-700">
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pricingTypes.fields.map((field, idx) => {
                                    const check = rowChecks[idx];
                                    return (
                                        <Fragment key={field.id}>
                                            <tr className="even:bg-gray-50">
                                        <td className="border p-2 text-center font-semibold">{idx + 1}</td>
                                        <td className="border p-2 text-center font-semibold">
                                            {pricingTypesList && (
                                                <PricingTypeCombobox
                                                    id={formValues.pricingTypes?.[idx]?.companyStockPricingTypeId}
                                                    pricingTypesList={pricingTypesList || []}
                                                />
                                            )}
                                        </td>
                                        {FIELD_KEYS.map((col) => (
                                            <td key={col.key} className="border p-2">
                                                <FormField
                                                    control={form.control}
                                                    name={`pricingTypes.${idx}.${col.key}`}
                                                    render={({ field }) => (
                                                        <FormItem className="m-0">
                                                            <FormControl>
                                                                {col.type === 'checkbox' ? (
                                                                    <Checkbox
                                                                        checked={field.value as boolean}
                                                                        onCheckedChange={field.onChange}
                                                                        onBlur={field.onBlur}
                                                                        name={field.name}
                                                                    />
                                                                ) : (
                                                                    <Input
                                                                        {...field}
                                                                        type={col.type}
                                                                        className="h-7 text-xs"
                                                                        value={
                                                                            typeof field.value === 'number'
                                                                                ? field.value
                                                                                : ''
                                                                        }
                                                                        disabled={col.disabled}
                                                                        onChange={(e) => {
                                                                            const rawValue = e.currentTarget.value;
                                                                            const value =
                                                                                rawValue === ''
                                                                                    ? undefined
                                                                                    : e.currentTarget.valueAsNumber;
                                                                            const parsedValue =
                                                                                value !== undefined && Number.isFinite(value)
                                                                                    ? value
                                                                                    : undefined;
                                                                            field.onChange(parsedValue);
                                                                            handlePriceFieldChange(idx, col.key, parsedValue);
                                                                        }}
                                                                    />
                                                                )}
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </td>
                                        ))}
                                            </tr>
                                            {check ? (
                                                <tr>
                                                    <td
                                                        colSpan={2 + FIELD_KEYS.length}
                                                        className="border bg-slate-50 p-2"
                                                    >
                                                        {check.loading ? (
                                                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                                Checking pricing policy…
                                                            </div>
                                                        ) : check.result ? (
                                                            <div className="space-y-2">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="text-xs font-semibold tracking-wide uppercase">
                                                                        Cost Consistency
                                                                    </span>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={
                                                                            OUTCOME_BADGE_CLASS[check.result.outcome]
                                                                        }
                                                                    >
                                                                        {OUTCOME_LABELS[check.result.outcome]}
                                                                    </Badge>
                                                                    {check.result.ruleSource && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="bg-sky-100 text-sky-800"
                                                                        >
                                                                            {
                                                                                RULE_SOURCE_LABELS[
                                                                                    check.result.ruleSource
                                                                                ]
                                                                            }
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                                                                    <div>
                                                                        <p className="text-muted-foreground">
                                                                            Cost Basis
                                                                        </p>
                                                                        <p className="font-mono font-semibold">
                                                                            {check.result.costBasis != null
                                                                                ? `${currencySymbol} ${Number(check.result.costBasis).toFixed(2)}`
                                                                                : 'Cost unavailable—GP cannot be calculated'}
                                                                        </p>
                                                                        <p className="text-muted-foreground">
                                                                            {check.result.costBasisType || '—'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground">
                                                                            Gross Profit
                                                                        </p>
                                                                        <p className="font-mono font-semibold">
                                                                            {check.result.calculatedGpPercent != null
                                                                                ? `${Number(check.result.calculatedGpPercent).toFixed(2)}%`
                                                                                : '—'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground">Markup</p>
                                                                        <p className="font-mono font-semibold">
                                                                            {check.result.calculatedMarkupPercent !=
                                                                            null
                                                                                ? `${Number(check.result.calculatedMarkupPercent).toFixed(2)}%`
                                                                                : '—'}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground">
                                                                            Variance From Target
                                                                        </p>
                                                                        <p className="font-mono font-semibold">
                                                                            {check.result.varianceFromTargetPercent !=
                                                                            null
                                                                                ? `${Number(check.result.varianceFromTargetPercent).toFixed(2)}%`
                                                                                : '—'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {check.result.warning && (
                                                                    <p
                                                                        className={
                                                                            check.result.blocked
                                                                                ? 'text-xs text-red-700'
                                                                                : 'text-xs text-amber-700'
                                                                        }
                                                                    >
                                                                        {check.result.warning}
                                                                    </p>
                                                                )}
                                                                {check.result.appliedRule && (
                                                                    <div className="text-xs">
                                                                        <span className="font-semibold">
                                                                            Effective limits (
                                                                            {RULE_SOURCE_LABELS[
                                                                                check.result.appliedRule.ruleSource
                                                                            ] || check.result.appliedRule.ruleSource}
                                                                            ):
                                                                        </span>{' '}
                                                                        {[
                                                                            [
                                                                                'Min GP',
                                                                                check.result.appliedRule.minGpPercent,
                                                                            ],
                                                                            [
                                                                                'Max GP',
                                                                                check.result.appliedRule.maxGpPercent,
                                                                            ],
                                                                            [
                                                                                'Target GP',
                                                                                check.result.appliedRule
                                                                                    .targetGpPercent,
                                                                            ],
                                                                            [
                                                                                'Tolerance',
                                                                                check.result.appliedRule
                                                                                    .tolerancePercent,
                                                                            ],
                                                                            [
                                                                                'Blocking variance',
                                                                                check.result.appliedRule
                                                                                    .blockingVariancePercent,
                                                                            ],
                                                                        ]
                                                                            .filter(([, value]) => value != null)
                                                                            .map(
                                                                                ([label, value]) =>
                                                                                    `${label} ${Number(value).toFixed(2)}%`,
                                                                            )
                                                                            .join(' · ') || 'No GP limits configured'}
                                                                            {check.result.appliedRule.enforceGpPolicy != null &&
                                                                                ` · ${check.result.appliedRule.enforceGpPolicy ? 'Approval required' : 'Warning only'}`}
                                                                    </div>
                                                                )}
                                                                {(check.result.requiresApproval ||
                                                                    check.result.outcome === 'APPROVAL_REQUIRED') && (
                                                                    <p className="text-xs font-semibold text-orange-700">
                                                                        Supervisor approval required.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-red-700">
                                                                {check.error || 'Validation failed for this price.'}
                                                            </p>
                                                        )}
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {reasonRequired && (
                        <div className="mt-3">
                            <Label className="text-xs">
                                Reason <MandatoryField />
                            </Label>
                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem className="m-0">
                                        <FormControl>
                                            <Textarea
                                                className="mt-1 text-xs"
                                                rows={2}
                                                placeholder="Enter reason for this price change."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                    {authUserType === 'COMPANY-DEBTOR-USER' ? null : (
                        <div className="mt-8 flex flex-col gap-6 md:flex-row">
                            <div className="bg-muted flex-1 rounded border p-4">
                                <div className="mb-2 text-sm font-semibold">Recommended Retail Based On</div>
                                {/* <div className="text-muted-foreground mb-3 text-xs">* Recommended GP%: Not Assigned</div> */}
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="col-span-1 flex flex-col gap-2">
                                        <div className="grid grid-cols-[repeat(2,1fr)] gap-1">
                                            <div className="mb-1 px-2 font-medium">Price Level</div>
                                            <div className="mb-1 flex items-center justify-between gap-2 px-2 font-medium">
                                                <div>Level Value</div>
                                                <div>Date</div>
                                            </div>

                                            {costLevelsList?.map((level) => {
                                                const costLevelValue = initialData?.costLevels?.find(
                                                    (item) => item.companyStockPricingCostLevelTypeId === level.id,
                                                );
                                                const costLevelDate = costLevelValue?.type?.updatedAt;

                                                return (
                                                    <Fragment key={level.id}>
                                                        <div className="flex h-7 items-center rounded border bg-white px-2 text-xs">
                                                            {costLevelValue?.type?.name || level.name}
                                                        </div>
                                                        <div className="bg-muted flex h-7 items-center justify-between gap-2 rounded border px-2 text-xs">
                                                            <div>
                                                                {costLevelValue?.value == null
                                                                    ? '—'
                                                                    : `${currencySymbol} ${Number(costLevelValue.value).toFixed(2)}`}
                                                            </div>
                                                            <div>
                                                                {costLevelDate
                                                                    ? moment(costLevelDate).format('DD/MM/YY')
                                                                    : 'N/A'}
                                                            </div>
                                                        </div>
                                                    </Fragment>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="col-span-1 flex flex-col gap-1">
                                        <div className="mb-1 px-2 font-medium">Costs</div>

                                        {[
                                            { label: 'Average Cost', key: 'averageCost' },
                                            { label: 'Latest Cost', key: 'latestCost' },
                                            { label: 'Base Cost', key: 'baseCost' },
                                            // { label: 'Future Cost', key: 'futureCost' },
                                            { label: 'Previous Cost', key: 'previousCost' },
                                            // { label: 'Manager Cost', key: 'managerCost' },
                                            { label: 'Highest Cost', key: 'highestCost' },
                                        ].map((cost) => {
                                            const costValue =
                                                initialData?.costTypes?.[
                                                    cost.key as keyof NonNullable<typeof initialData.costTypes>
                                                ];
                                            return (
                                                <div key={cost.key} className="flex items-center gap-2">
                                                    <div className="flex h-7 !w-24 items-center rounded border bg-white px-2 text-xs">
                                                        {cost.label}
                                                    </div>
                                                    <div className="bg-muted flex h-7 flex-1 items-center rounded border px-2 text-xs">
                                                        {costValue == null
                                                            ? '—'
                                                            : `${currencySymbol} ${Number(costValue).toFixed(2)}`}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted flex-1 rounded border p-4">
                                <div className="mb-2 text-sm font-semibold">Pricing</div>
                                <div className="flex flex-col gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-32">Tax Rate ( % )</span>
                                        <div className="flex h-7 w-20 items-center rounded border bg-gray-100 px-2 text-xs">
                                            {taxRate * 100}
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="settings.sellPriceVariantGroupId"
                                        render={({ field }) => (
                                            <div className="flex items-center gap-2">
                                                <span className="w-32">Selling Price Variant Group</span>
                                                <select
                                                    className="h-7 w-64 rounded border bg-white px-2 text-xs"
                                                    {...field}
                                                    value={field.value || ''}
                                                >
                                                    <option value="">Select</option>
                                                    {sellingPriceVariantGroups
                                                        ? sellingPriceVariantGroups?.map((group) => (
                                                              <option key={group.id} value={group.id}>
                                                                  {group.name} ({group.code})
                                                              </option>
                                                          ))
                                                        : null}
                                                </select>
                                            </div>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="settings.unitCost"
                                        render={({ field }) => (
                                            <div className="flex items-center gap-2">
                                                <span className="w-32">Unit Cost</span>
                                                <Input
                                                    type="number"
                                                    className="h-7 w-20 text-xs"
                                                    {...field}
                                                    disabled={!isAdmin}
                                                    value={(field.value as number | undefined) ?? ''}
                                                    onChange={(event) =>
                                                        field.onChange(
                                                            event.target.value === '' ? undefined : event.target.valueAsNumber,
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="settings.recommendedGpPercent"
                                        render={({ field }) => (
                                            <div className="flex items-center gap-2">
                                                <span className="w-32">Recommended GP%</span>
                                                <Input
                                                    type="number"
                                                    className="h-7 w-20 text-xs"
                                                    {...field}
                                                    value={(field.value as number | undefined) ?? ''}
                                                    onChange={(event) =>
                                                        field.onChange(
                                                            event.target.value === '' ? undefined : event.target.valueAsNumber,
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="settings.futureCost"
                                        render={({ field }) => (
                                            <div className="flex items-center gap-2">
                                                <span className="w-32">Future Cost</span>
                                                <Input
                                                    type="number"
                                                    className="h-7 w-20 text-xs"
                                                    {...field}
                                                    value={(field.value as number | undefined) ?? ''}
                                                    onChange={(event) =>
                                                        field.onChange(
                                                            event.target.value === '' ? undefined : event.target.valueAsNumber,
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                    />

                                    {(
                                        [
                                            ['minGpPercent', 'Min GP%'],
                                            ['maxGpPercent', 'Max GP%'],
                                            ['gpTolerancePercent', 'GP Tolerance%'],
                                        ] as const
                                    ).map(([name, label]) => (
                                        <FormField
                                            key={name}
                                            control={form.control}
                                            name={`settings.${name}` as const}
                                            render={({ field }) => (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-32">{label}</span>
                                                    <Input
                                                        type="number"
                                                        className="h-7 w-20 text-xs"
                                                        {...field}
                                                        disabled={!hasCategoryGpOverride}
                                                        value={(field.value as number | null) ?? ''}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                Number.isNaN(e.target.valueAsNumber)
                                                                    ? null
                                                                    : e.target.valueAsNumber,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            )}
                                        />
                                    ))}

                                    <FormField
                                        control={form.control}
                                        name="settings.enforceGpPolicy"
                                        render={({ field }) => (
                                            <div className="mt-2 flex flex-col gap-1 text-xs">
                                                <span className="font-medium">When GP limits are exceeded</span>
                                                {!hasCategoryGpOverride && (
                                                    <span className="text-muted-foreground">
                                                        Inherited from the effective category/company policy.
                                                    </span>
                                                )}
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        checked={field.value === false}
                                                        disabled={!hasCategoryGpOverride}
                                                        onChange={() => field.onChange(false)}
                                                    />
                                                    Warning only
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        checked={field.value === true}
                                                        disabled={!hasCategoryGpOverride}
                                                        onChange={() => field.onChange(true)}
                                                    />
                                                    Require approval
                                                </label>
                                            </div>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="settings.overrideCategoryGpPolicy"
                                        render={({ field }) => (
                                            <label className="mt-2 flex items-center gap-2 text-xs">
                                                <Checkbox
                                                    checked={!!field.value}
                                                    onCheckedChange={(checked) => field.onChange(checked)}
                                                />
                                                Override category GP policy
                                            </label>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                <ApprovalDialog
                    open={approvalCtl.openApproval}
                    onClose={approvalCtl.closeApproval}
                    approvalRequestId={approvalCtl.approval?.approvalRequestId}
                    approvals={approvalCtl.approval?.approvals}
                    allowedMethods={approvalCtl.approval?.allowedMethods}
                    actionLabel={approvalCtl.approval?.actionLabel || 'Manage Pricing Matrix'}
                    approverGroupName={approvalCtl.approval?.approverGroupName}
                    scopeLabel={approvalCtl.approval?.scopeLabel}
                    onApproved={handleApproved}
                />
            </Form>
        </PageLoader>
    );
}

export default function StockPricingForm({
    stockId,
    backButton,
    onClose,
}: {
    stockId: string;
    backButton?: ReactNode;
    onClose: () => void;
}) {
    // const [stockId] = useQueryState('stockId', { defaultValue: '' });
    const stockPricing = useCompanyStockPricingList(stockId);
    const initialData = stockPricing.data?.rows?.[0];
    const stockDetails = useCompanyStockDetailById(stockId);
    const responseTaxRatePercent = initialData?.taxRate?.percent;

    if (stockPricing.isError) {
        return <div role="alert">Could not load saved pricing. Please try again.</div>;
    }

    if (stockPricing.isLoading || (responseTaxRatePercent == null && stockDetails.isLoading)) return null;

    if (responseTaxRatePercent == null && stockDetails.isError) {
        return <div role="alert">Could not load the stock tax rate. Please try again.</div>;
    }

    const stockDetailsTaxRatePercent = stockDetails.data?.data?.subCategory?.taxRate?.taxRatePercent;
    const taxRatePercent = responseTaxRatePercent ?? stockDetailsTaxRatePercent;
    if (taxRatePercent == null) {
        return <div role="alert">The stock tax rate is unavailable, so pricing cannot be edited safely.</div>;
    }

    return (
        <StockPricingWrapper
            stockId={stockId}
            initialData={initialData}
            backButton={backButton}
            onClose={onClose}
            taxRate={taxRatePercent / 100}
        />
    );
}
