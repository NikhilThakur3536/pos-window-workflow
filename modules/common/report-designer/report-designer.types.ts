export type TreeNodeKind =
    | 'page'
    | 'band'
    | 'field'
    | 'folder';

export interface ReportTreeNode {
    id: string;
    label: string;
    kind: TreeNodeKind;
    children?: ReportTreeNode[];
}

export type DataFieldType =
    | 'number'
    | 'string'
    | 'boolean'
    | 'date'
    | 'currency'
    | 'folder'
    | 'table';

export interface DataTreeNode {
    id: string;
    label: string;
    type: DataFieldType;
    children?: DataTreeNode[];
}

export type PropertyValue = string | number | boolean;

export interface ObjectProperty {
    id: string;
    label: string;
    value: PropertyValue;
    /** editable | readonly | boolean toggle | enum */
    editor?: 'text' | 'number' | 'boolean' | 'enum' | 'color' | 'picture';
    options?: string[];
    group?: string;
}

export interface ReportBandField {
    id: string;
    label: string;
    /** Data-bound expression shown inside the band cell, e.g. [Stocktable."CODE"] */
    expression: string;
    x: number;
    width: number;
}

export interface ReportBand {
    id: string;
    type: 'PageHeader' | 'MasterData' | 'PageFooter' | 'ReportSummary' | 'Header' | 'Detail';
    label: string;
    title?: string;
    height: number;
    highlighted?: boolean;
    fields: ReportBandField[];
}

export interface ReportPage {
    id: string;
    name: string;
    bands: ReportBand[];
}

export interface ReportDesignerDocument {
    reportId: string;
    reportTree: ReportTreeNode[];
    dataTree: DataTreeNode[];
    objectInspector: Record<string, ObjectProperty[]>;
    page: ReportPage;
    selectedObjectId: string;
}
