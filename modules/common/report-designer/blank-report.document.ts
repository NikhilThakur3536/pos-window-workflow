import type { DataTreeNode, ObjectProperty, ReportDesignerDocument } from './report-designer.types';

const PAGE_PROPERTIES: ObjectProperty[] = [
    { id: 'backpicture', label: 'BackPicture', value: '(Not assigned)', editor: 'picture' },
    { id: 'bottommargin', label: 'BottomMargin', value: 1, editor: 'number' },
    { id: 'topmargin', label: 'TopMargin', value: 1, editor: 'number' },
    { id: 'leftmargin', label: 'LeftMargin', value: 1, editor: 'number' },
    { id: 'rightmargin', label: 'RightMargin', value: 1, editor: 'number' },
    { id: 'columns', label: 'Columns', value: 0, editor: 'number' },
    { id: 'dataset', label: 'DataSet', value: '(Not assigned)', editor: 'text' },
];

const BAND_PROPERTIES: ObjectProperty[] = [
    { id: 'name', label: 'Name', value: '', editor: 'text' },
    { id: 'height', label: 'Height', value: 20, editor: 'number' },
    { id: 'visible', label: 'Visible', value: true, editor: 'boolean' },
];

/**
 * Creates an empty designer document used for brand-new / not-yet-loaded
 * reports. The canvas starts with the standard page header / master data /
 * page footer bands (with no fields) so the report can be built by dragging
 * data fields in.
 */
export function createBlankReportDocument(
    reportId: string,
    dataTree: DataTreeNode[] = [],
): ReportDesignerDocument {
    const page = { id: 'page1', name: 'Page1' };

    const pageheader = {
        id: 'pageheader1',
        type: 'PageHeader' as const,
        label: 'PageHeader1',
        height: 20,
        fields: [],
    };
    const masterdata = {
        id: 'masterdata1',
        type: 'MasterData' as const,
        label: 'MasterData1',
        height: 20,
        fields: [],
    };
    const pagefooter = {
        id: 'pagefooter1',
        type: 'PageFooter' as const,
        label: 'PageFooter1',
        height: 20,
        fields: [],
    };

    return {
        reportId,
        selectedObjectId: 'page1',
        reportTree: [
            {
                id: page.id,
                label: page.name,
                kind: 'page',
                children: [
                    { id: pageheader.id, label: pageheader.label, kind: 'band', children: [] },
                    { id: masterdata.id, label: masterdata.label, kind: 'band', children: [] },
                    { id: pagefooter.id, label: pagefooter.label, kind: 'band', children: [] },
                ],
            },
        ],
        dataTree,
        objectInspector: {
            [page.id]: PAGE_PROPERTIES,
            [pageheader.id]: BAND_PROPERTIES.map((prop) =>
                prop.id === 'name' ? { ...prop, value: pageheader.label } : prop,
            ),
            [masterdata.id]: BAND_PROPERTIES.map((prop) =>
                prop.id === 'name' ? { ...prop, value: masterdata.label } : prop,
            ),
            [pagefooter.id]: BAND_PROPERTIES.map((prop) =>
                prop.id === 'name' ? { ...prop, value: pagefooter.label } : prop,
            ),
        },
        page: {
            id: page.id,
            name: page.name,
            bands: [pageheader, masterdata, pagefooter],
        },
    };
}
