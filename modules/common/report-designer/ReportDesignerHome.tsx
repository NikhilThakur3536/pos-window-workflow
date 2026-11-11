'use client';

import * as React from 'react';
import { useRouter } from 'next/router';
import { Plus, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import {
    useCreateReportTemplate,
    useListReportTemplates,
    type ReportTemplate,
    type CreateReportTemplateResponse,
} from '@/api-queries/report-designer';
import { stocktableReportMock } from './stocktable-report.mock';

const FALLBACK_TEMPLATES: ReportTemplate[] = [
    {
        id: stocktableReportMock.reportId,
        name: 'Stock (Complete Listing)',
        code: 'STOCKTABLE',
        description: 'Complete stock listing report',
        status: 'PUBLISHED',
    },
    {
        id: 'demo-invoice',
        name: 'Invoice (Demo)',
        code: 'INV_DEMO',
        description: 'Demo invoice report template',
        status: 'DRAFT',
    },
];

function normalizeTemplates(templates: ReportTemplate[]): ReportTemplate[] {
    const normalized = templates.map((template) => {
        const id = template.id ?? template.code ?? template.name;
        return {
            ...template,
            id: id as string,
            name: template.name ?? template.code ?? template.id,
        };
    });
    return normalized;
}

export function ReportDesignerHome() {
    const router = useRouter();
    const [search, setSearch] = React.useState('');

    const templatesQuery = useListReportTemplates(true, { limit: 200 });
    const { createReportTemplateMutation } = useCreateReportTemplate();

    const fetchedTemplates = React.useMemo<ReportTemplate[]>(() => {
        const data = templatesQuery.data?.data;
        if (Array.isArray(data)) return normalizeTemplates(data);
        if (data && Array.isArray(data.rows)) return normalizeTemplates(data.rows);
        return [];
    }, [templatesQuery.data]);

    const templates = React.useMemo<ReportTemplate[]>(() => {
        if (templatesQuery.isLoading) return [];
        if (templatesQuery.isError || fetchedTemplates.length === 0) {
            return normalizeTemplates(FALLBACK_TEMPLATES);
        }
        return fetchedTemplates;
    }, [templatesQuery.isLoading, templatesQuery.isError, fetchedTemplates]);

    const visibleTemplates = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return templates;
        return templates.filter(
            (template) =>
                template.name?.toLowerCase().includes(query) ||
                template.code?.toLowerCase().includes(query) ||
                template.description?.toLowerCase().includes(query),
        );
    }, [templates, search]);

    const openDesigner = (template: ReportTemplate) => {
        if (template.id) router.push(`/report-designer/${template.id}`);
    };

    const handleCreate = async () => {
        let id = '';
        try {
            // The mutation's onSuccess rewrites the resolved value to the
            // created template itself, so read `id` from the template shape.
            const created = (await createReportTemplateMutation({
                name: 'Untitled Report',
            })) as CreateReportTemplateResponse & { id?: string };
            id = created?.id ?? created?.data?.id ?? '';
        } catch {
            // Create endpoint unavailable — still open a blank editor below.
        }
        router.push(`/report-designer/${id || `new-report-${Date.now()}`}`);
    };

    const columns = [
        {
            key: 'name',
            label: 'Report Name',
            render: (row: ReportTemplate) => (
                <div className="flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-neutral-500" />
                    <span className="font-medium text-neutral-800">{row.name}</span>
                </div>
            ),
        },
        {
            key: 'code',
            label: 'Code',
            render: (row: ReportTemplate) => (
                <span className="text-neutral-600">{row.code || '—'}</span>
            ),
        },
        {
            key: 'description',
            label: 'Description',
        },
        {
            key: 'status',
            label: 'Status',
            render: (row: ReportTemplate) => (
                <span className="text-xs font-medium uppercase text-neutral-600">
                    {row.status || '—'}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-2 p-4">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Report Designer</h2>
                    <p className="text-sm text-neutral-500">
                        Open a report to design it, or create a new one.
                    </p>
                </div>
                <Button className="flex items-center gap-2" onClick={handleCreate}>
                    <Plus className="h-4 w-4" />
                    Create Report
                </Button>
            </div>

            <div className="flex w-full items-center gap-2">
                <Input
                    placeholder="Search reports by name or code..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="!max-w-sm"
                />
            </div>

            <ListOnlyTable
                columns={columns}
                data={visibleTemplates}
                isLoading={templatesQuery.isLoading}
                staticTable
                shouldShowPagination={false}
                onRowClick={(row) => openDesigner(row as ReportTemplate)}
                rowKeyExtractor={(row) => (row as ReportTemplate).id}
            />
        </div>
    );
}
