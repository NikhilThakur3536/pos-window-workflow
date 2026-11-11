import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance, apiUrls } from '..';
import { getApiKey } from '@/utils/helpers';
import type {
    DataFieldType,
    DataTreeNode,
    ObjectProperty,
    PropertyValue,
    ReportDesignerDocument,
} from '@/modules/common/report-designer/report-designer.types';

// ------------------------------- TYPES -----------------------------
export type ReportTemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
export type ReportVersionStatus = 'DRAFT' | 'PUBLISHED' | string;
export type ExportFormat = 'pdf' | 'excel' | 'xlsx' | string;
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | string;
export type SortDirection = 'ASC' | 'DESC' | string;

export interface ReportDataSourceSummary {
    id: string;
    name?: string;
    code?: string;
    description?: string;
    [key: string]: any;
}

export interface ReportField {
    id: string;
    name?: string;
    type?: FieldType;
    [key: string]: any;
}

export interface ReportDataSourceDetail {
    dataSource: ReportDataSourceSummary;
    fields: ReportField[];
}

export interface ReportPageConfig {
    size?: string;
    orientation?: 'portrait' | 'landscape' | string;
    margin?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
}

export interface ReportDefinitionDataSource {
    id: string;
    sourceId: string;
}

export interface ReportElementStyle {
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    alignment?: 'left' | 'center' | 'right' | string;
    [key: string]: any;
}

export interface ReportElement {
    id: string;
    type: 'text' | 'field' | 'table' | 'image' | 'line' | 'rectangle' | 'expression' | string;
    field?: string;
    expression?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    style?: ReportElementStyle;
    visible?: boolean;
    printable?: boolean;
    wordWrap?: boolean;
    autoWidth?: boolean;
    canGrow?: boolean;
    canShrink?: boolean;
    hideZeros?: boolean;
    displayFormat?: string;
    [key: string]: any;
}

export interface ReportFilter {
    field: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'BETWEEN' | 'IS_NULL' | 'IS_NOT_NULL' | string;
    value?: any;
}

export interface ReportSort {
    field: string;
    direction?: SortDirection;
}

export interface ReportGroup {
    field: string;
    direction?: SortDirection;
}

export interface ReportDefinition {
    schemaVersion?: number;
    page?: ReportPageConfig;
    dataSources?: ReportDefinitionDataSource[];
    bands?: any[];
    elements?: ReportElement[];
    filters?: ReportFilter[];
    sorting?: ReportSort[];
    groups?: ReportGroup[];
    parameters?: Record<string, any>;
    [key: string]: any;
}

export interface ReportTemplate {
    id: string;
    companyId?: string;
    domainId?: string;
    name?: string;
    code?: string;
    description?: string;
    status?: ReportTemplateStatus;
    currentVersionId?: string;
    publishedVersionId?: string;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
}

export interface ReportTemplateVersion {
    id: string;
    reportTemplateId?: string;
    version?: number;
    schemaVersion?: number;
    definitionJson?: ReportDefinition;
    status?: ReportVersionStatus;
    createdBy?: string;
    publishedBy?: string;
    createdAt?: string;
    publishedAt?: string;
    [key: string]: any;
}

export type ReportTemplateFilterProps = {
    page?: number;
    limit?: number;
    search?: string;
    status?: ReportTemplateStatus;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
};

// ---------- Responses ----------
export interface ListDataSourcesResponse {
    success?: boolean;
    dataSources?: ReportDataSourceSummary[];
    data?: ReportDataSourceSummary[] | { dataSources?: ReportDataSourceSummary[] };
    message?: string;
}

export interface GetDataSourceResponse {
    success?: boolean;
    dataSource?: ReportDataSourceSummary;
    fields?: ReportField[];
    data?: ReportDataSourceDetail;
    message?: string;
}

export interface AvailableDataSourcesResponse {
    success?: boolean;
    dataSources?: ReportDataSourceSummary[];
    data?: { dataSources?: ReportDataSourceSummary[] };
    message?: string;
}

export interface GetTemplatesResponse {
    success?: boolean;
    data?: ReportTemplate[] | {
        count: number;
        rows: ReportTemplate[];
    };
    message?: string;
}

export interface GetTemplateResponse {
    success?: boolean;
    data?: ReportTemplate & {
        currentVersion?: ReportTemplateVersion;
        publishedVersion?: ReportTemplateVersion;
    };
    message?: string;
}

export interface GetVersionsResponse {
    success?: boolean;
    data?: ReportTemplateVersion[] | {
        count: number;
        rows: ReportTemplateVersion[];
    };
    message?: string;
}

export interface PreviewExportResponse {
    success?: boolean;
    data?: any;
    message?: string;
}

// --------------------------------------- LIST DATA SOURCES ---------------------------------------
export const listReportDataSourcesFn = async (): Promise<ListDataSourcesResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.companyReports.listDataSources.url,
            method: apiUrls.companyReports.listDataSources.method,
        })
    ).data;
};

export const useListReportDataSources = (enabled: boolean = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyReports.listDataSources)],
        queryFn: () => listReportDataSourcesFn(),
        enabled,
    });
};

// --------------------------------------- GET DATA SOURCE + FIELDS ---------------------------------------
export const getReportDataSourceFn = async (
    id: string
): Promise<GetDataSourceResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.companyReports.getDataSource.url + id,
            method: apiUrls.companyReports.getDataSource.method,
        })
    ).data;
};

export const useGetReportDataSource = (
    id?: string,
    enabled: boolean = true
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyReports.getDataSource), id],
        queryFn: () => getReportDataSourceFn(id!),
        enabled: enabled && !!id,
    });
};

// --------------------------------------- AVAILABLE CONNECTED SOURCES ---------------------------------------
export interface AvailableDataSourcesPayload {
    selectedDataSources: string[];
}

export const getAvailableDataSourcesFn = async (
    data: AvailableDataSourcesPayload
): Promise<AvailableDataSourcesResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.companyReports.availableDataSources.url,
            method: apiUrls.companyReports.availableDataSources.method,
            data,
        })
    ).data;
};

export const useGetAvailableDataSources = () => {
    const {
        isPending,
        isSuccess,
        error,
        mutateAsync: getAvailableDataSourcesMutation,
    } = useMutation({
        mutationFn: getAvailableDataSourcesFn,
        onSuccess: (response) => {
            console.log('Successfully fetched available data sources');
            return response;
        },
        onError: (error) => {
            console.log('error fetching available data sources');
            return error.message;
        },
    });

    return {
        getAvailableDataSourcesMutation,
        error,
        isPending,
        isSuccess,
    };
};

// --------------------------------------- REPORT DATA TREE ---------------------------------------
/** Maps a backend field type to the designer's DataFieldType. */
function mapReportFieldType(type?: string): DataFieldType {
    const value = (type ?? '').toLowerCase();
    if (value.includes('curren') || value.includes('money') || value.includes('decimal')) return 'currency';
    if (
        value.includes('int') ||
        value.includes('num') ||
        value.includes('double') ||
        value.includes('float') ||
        value.includes('real')
    ) {
        return 'number';
    }
    if (value.includes('bool')) return 'boolean';
    if (value.includes('date') || value.includes('time')) return 'date';
    return 'string';
}

/**
 * Builds the Data Tree panel content from the real report data-sources API:
 * every listed data source becomes a table node, each field a child node.
 */
export const buildReportDataTreeFn = async (): Promise<DataTreeNode[]> => {
    const listResp = await listReportDataSourcesFn();
    const sources =
        listResp?.dataSources ??
        (Array.isArray(listResp?.data) ? listResp.data : listResp?.data?.dataSources) ??
        [];

    const nodes: DataTreeNode[] = [];
    for (const source of sources) {
        const id = source.id ?? source.code ?? source.name;
        if (!id) continue;

        let fields: ReportField[] = [];
        try {
            const detailResp = await getReportDataSourceFn(id as string);
            const detail: ReportDataSourceDetail | undefined = detailResp?.data;
            fields = detail?.fields ?? detailResp?.fields ?? [];
        } catch {
            fields = [];
        }

        nodes.push({
            id: id as string,
            label: source.name ?? source.code ?? (id as string),
            type: 'table',
            children: (fields ?? []).map((field) => ({
                id: (field.id ?? field.name ?? '') as string,
                label: (field.name ?? field.id ?? '') as string,
                type: mapReportFieldType(field.type),
            })),
        });
    }
    return nodes;
};

export const useReportDataTree = (enabled: boolean = true) =>
    useQuery({
        queryKey: ['report-data-tree'],
        queryFn: buildReportDataTreeFn,
        enabled,
        retry: false,
        staleTime: 60_000,
    });

// --------------------------------------- LIST TEMPLATES ---------------------------------------
export const listReportTemplatesFn = async (
    props?: ReportTemplateFilterProps
): Promise<GetTemplatesResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.companyReports.listTemplates.url,
            method: apiUrls.companyReports.listTemplates.method,
            params: props,
        })
    ).data;
};

export const useListReportTemplates = (
    enabled: boolean = true,
    props?: ReportTemplateFilterProps
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyReports.listTemplates), props],
        queryFn: () => listReportTemplatesFn(props),
        enabled,
    });
};

// --------------------------------------- CREATE TEMPLATE ---------------------------------------
export interface CreateReportTemplatePayload {
    name: string;
    code?: string;
    description?: string;
    definitionJson?: ReportDefinition;
    status?: ReportTemplateStatus;
}

export interface CreateReportTemplateResponse {
    success?: boolean;
    data?: ReportTemplate;
    message?: string;
}

export const createReportTemplateFn = async (
    data: CreateReportTemplatePayload
): Promise<CreateReportTemplateResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.companyReports.createTemplate.url,
            method: apiUrls.companyReports.createTemplate.method,
            data,
        })
    ).data;
};

export const useCreateReportTemplate = () => {
    const {
        isPending,
        isSuccess,
        error,
        mutateAsync: createReportTemplateMutation,
    } = useMutation({
        mutationFn: createReportTemplateFn,
        onSuccess: (response) => {
            console.log('Successfully Created Report Template');
            return response?.data;
        },
        onError: (error) => {
            console.log('error during report template creation');
            return error.message;
        },
    });

    return {
        createReportTemplateMutation,
        error,
        isPending,
        isSuccess,
    };
};

// --------------------------------------- GET TEMPLATE ---------------------------------------
export const getReportTemplateFn = async (
    id: string
): Promise<GetTemplateResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.companyReports.getTemplate.url + id,
            method: apiUrls.companyReports.getTemplate.method,
        })
    ).data;
};

export const useGetReportTemplate = (
    id?: string,
    enabled: boolean = true
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyReports.getTemplate), id],
        queryFn: () => getReportTemplateFn(id!),
        enabled: enabled && !!id,
    });
};

// --------------------------------------- UPDATE TEMPLATE ---------------------------------------
export interface UpdateReportTemplatePayload {
    templateId: string;
    name?: string;
    code?: string;
    description?: string;
    definitionJson?: ReportDefinition;
    status?: ReportTemplateStatus;
}

export interface UpdateReportTemplateResponse {
    success?: boolean;
    data?: ReportTemplate;
    message?: string;
}

export const updateReportTemplateFn = async (
    data: UpdateReportTemplatePayload
): Promise<UpdateReportTemplateResponse> => {
    const { templateId, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.companyReports.updateTemplate.url + templateId,
            method: apiUrls.companyReports.updateTemplate.method,
            data: payload,
        })
    ).data;
};

export const useUpdateReportTemplate = () => {
    const {
        isPending,
        isSuccess,
        error,
        mutateAsync: updateReportTemplateMutation,
    } = useMutation({
        mutationFn: updateReportTemplateFn,
        onSuccess: (response) => {
            console.log('Successfully Updated Report Template');
            return response?.data;
        },
        onError: (error) => {
            console.log('error during report template update');
            return error.message;
        },
    });

    return {
        updateReportTemplateMutation,
        error,
        isPending,
        isSuccess,
    };
};

// --------------------------------------- DELETE TEMPLATE ---------------------------------------
export interface DeleteReportTemplateResponse {
    success?: boolean;
    data?: any;
    message?: string;
}

export const deleteReportTemplateFn = async (
    id: string
): Promise<DeleteReportTemplateResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.companyReports.deleteTemplate.url + id,
            method: apiUrls.companyReports.deleteTemplate.method,
        })
    ).data;
};

export const useDeleteReportTemplate = () => {
    const {
        isPending,
        isSuccess,
        error,
        mutateAsync: deleteReportTemplateMutation,
    } = useMutation({
        mutationFn: deleteReportTemplateFn,
        onSuccess: (response) => {
            console.log('Successfully Deleted Report Template');
            return response?.data;
        },
        onError: (error) => {
            console.log('error during report template deletion');
            return error.message;
        },
    });

    return {
        deleteReportTemplateMutation,
        error,
        isPending,
        isSuccess,
    };
};

// --------------------------------------- VERSION HISTORY ---------------------------------------
export const listReportTemplateVersionsFn = async (
    id: string
): Promise<GetVersionsResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.companyReports.listVersions.url + id + '/versions',
            method: apiUrls.companyReports.listVersions.method,
        })
    ).data;
};

export const useListReportTemplateVersions = (
    id?: string,
    enabled: boolean = true
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyReports.listVersions), id],
        queryFn: () => listReportTemplateVersionsFn(id!),
        enabled: enabled && !!id,
    });
};

// --------------------------------------- PUBLISH ---------------------------------------
export interface PublishReportTemplatePayload {
    templateId: string;
    versionId?: string;
}

export const publishReportTemplateFn = async (
    data: PublishReportTemplatePayload
): Promise<GetTemplateResponse> => {
    const { templateId, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.companyReports.publishTemplate.url + templateId + '/publish',
            method: apiUrls.companyReports.publishTemplate.method,
            data: payload,
        })
    ).data;
};

export const usePublishReportTemplate = () => {
    const {
        isPending,
        isSuccess,
        error,
        mutateAsync: publishReportTemplateMutation,
    } = useMutation({
        mutationFn: publishReportTemplateFn,
        onSuccess: (response) => {
            console.log('Successfully Published Report Template');
            return response?.data;
        },
        onError: (error) => {
            console.log('error during publish report template');
            return error.message;
        },
    });

    return {
        publishReportTemplateMutation,
        error,
        isPending,
        isSuccess,
    };
};

// --------------------------------------- ROLLBACK ---------------------------------------
export interface RollbackReportTemplatePayload {
    templateId: string;
    versionId: string;
}

export const rollbackReportTemplateFn = async (
    data: RollbackReportTemplatePayload
): Promise<GetTemplateResponse> => {
    const { templateId, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.companyReports.rollbackTemplate.url + templateId + '/rollback',
            method: apiUrls.companyReports.rollbackTemplate.method,
            data: payload,
        })
    ).data;
};

export const useRollbackReportTemplate = () => {
    const {
        isPending,
        isSuccess,
        error,
        mutateAsync: rollbackReportTemplateMutation,
    } = useMutation({
        mutationFn: rollbackReportTemplateFn,
        onSuccess: (response) => {
            console.log('Successfully Rolled Back Report Template');
            return response?.data;
        },
        onError: (error) => {
            console.log('error during rollback report template');
            return error.message;
        },
    });

    return {
        rollbackReportTemplateMutation,
        error,
        isPending,
        isSuccess,
    };
};

// --------------------------------------- PREVIEW ---------------------------------------
export interface PreviewReportTemplatePayload {
    templateId: string;
    filters?: Record<string, any>;
    parameters?: Record<string, any>;
    versionId?: string;
}

export const previewReportTemplateFn = async (
    data: PreviewReportTemplatePayload
): Promise<PreviewExportResponse> => {
    const { templateId, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.companyReports.previewTemplate.url + templateId + '/preview',
            method: apiUrls.companyReports.previewTemplate.method,
            data: payload,
        })
    ).data;
};

export const usePreviewReportTemplate = () => {
    const {
        isPending,
        isSuccess,
        error,
        mutateAsync: previewReportTemplateMutation,
    } = useMutation({
        mutationFn: previewReportTemplateFn,
        onSuccess: (response) => {
            console.log('Successfully Previewed Report Template');
            return response?.data;
        },
        onError: (error) => {
            console.log('error during preview report template');
            return error.message;
        },
    });

    return {
        previewReportTemplateMutation,
        error,
        isPending,
        isSuccess,
    };
};

// --------------------------------------- EXPORT ---------------------------------------
export interface ExportReportTemplatePayload {
    templateId: string;
    format: ExportFormat;
    filters?: Record<string, any>;
    parameters?: Record<string, any>;
    versionId?: string;
}

export const exportReportTemplateFn = async (
    data: ExportReportTemplatePayload
): Promise<PreviewExportResponse> => {
    const { templateId, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.companyReports.exportTemplate.url + templateId + '/export',
            method: apiUrls.companyReports.exportTemplate.method,
            data: payload,
            // responseType: 'blob', // uncomment if backend returns binary file
        })
    ).data;
};

export const useExportReportTemplate = () => {
    const {
        isPending,
        isSuccess,
        error,
        mutateAsync: exportReportTemplateMutation,
    } = useMutation({
        mutationFn: exportReportTemplateFn,
        onSuccess: (response) => {
            console.log('Successfully Exported Report Template');
            return response?.data;
        },
        onError: (error) => {
            console.log('error during export report template');
            return error.message;
        },
    });

    return {
        exportReportTemplateMutation,
        error,
        isPending,
        isSuccess,
    };
};

// --------------------------------------- REPORT DESIGNER DOCUMENT ---------------------------------------
const REPORT_DESIGNER_KEY = 'report-designer';

/** Loads the full designer document: report tree, data tree, canvas + inspector state. */
export const useReportDesignerDocument = (reportId: string) =>
    useQuery({
        queryKey: [REPORT_DESIGNER_KEY, reportId],
        queryFn: async () => {
            const { data } = await axiosInstance.get<ReportDesignerDocument>(
                apiUrls.companyReports.designerDocument.url + reportId,
            );
            return data;
        },
        enabled: !!reportId,
        staleTime: 30_000,
    });

// --------------------------------------- SELECT OBJECT ---------------------------------------
/** Selecting a node in the Report Tree / Canvas swaps the Object Inspector contents. */
export const useSelectReportObject = (reportId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (objectId: string) => {
            const { data } = await axiosInstance.post<{
                objectId: string;
                properties: ObjectProperty[];
            }>(
                apiUrls.companyReports.designerSelectObject.url +
                    reportId +
                    '/objects/' +
                    objectId +
                    '/select',
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData<ReportDesignerDocument | undefined>(
                [REPORT_DESIGNER_KEY, reportId],
                (previous) =>
                    previous && {
                        ...previous,
                        selectedObjectId: data.objectId,
                        objectInspector: {
                            ...previous.objectInspector,
                            [data.objectId]: data.properties,
                        },
                    },
            );
        },
    });
};

// --------------------------------------- UPDATE OBJECT PROPERTY ---------------------------------------
/** Edits a single property from the Object Inspector grid (optimistic update). */
export const useUpdateObjectProperty = (reportId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            objectId,
            propertyId,
            value,
        }: {
            objectId: string;
            propertyId: string;
            value: PropertyValue;
        }) => {
            const { data } = await axiosInstance.patch<{ property: ObjectProperty }>(
                apiUrls.companyReports.designerUpdateProperty.url +
                    reportId +
                    '/objects/' +
                    objectId +
                    '/properties',
                { propertyId, value },
            );
            return data;
        },
        onMutate: async ({ objectId, propertyId, value }) => {
            await queryClient.cancelQueries({ queryKey: [REPORT_DESIGNER_KEY, reportId] });
            const previous = queryClient.getQueryData<ReportDesignerDocument>([
                REPORT_DESIGNER_KEY,
                reportId,
            ]);

            queryClient.setQueryData<ReportDesignerDocument | undefined>(
                [REPORT_DESIGNER_KEY, reportId],
                (doc) =>
                    doc && {
                        ...doc,
                        objectInspector: {
                            ...doc.objectInspector,
                            [objectId]: doc.objectInspector[objectId]?.map((prop) =>
                                prop.id === propertyId ? { ...prop, value } : prop,
                            ),
                        },
                    },
            );

            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData([REPORT_DESIGNER_KEY, reportId], context.previous);
            }
        },
    });
};

// --------------------------------------- SAVE REPORT DESIGNER ---------------------------------------
/** Persists the whole document (toolbar "Save"). */
export const useSaveReportDesigner = (reportId: string) =>
    useMutation({
        mutationFn: async () => {
            const { data } = await axiosInstance.post(
                apiUrls.companyReports.designerSave.url + reportId + '/save',
            );
            return data;
        },
    });