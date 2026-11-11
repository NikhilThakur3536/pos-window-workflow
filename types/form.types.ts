export interface FormFieldConfig {
    id: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    validation?: ValidationConfig;
    conditional?: ConditionalConfig;
    options?: SelectOption[];
    gridColumn?: string;
    dependencies?: string[];
    defaultValue?: any;
    // Array field specific properties
    arrayConfig?: ArrayFieldConfig;
    className?: string;
}

export interface ArrayFieldConfig {
    minItems?: number;
    maxItems?: number;
    itemSchema: ArrayItemField[];
    addButtonText?: string;
    removeButtonText?: string;
    itemTitle?: string;
}

export interface ArrayItemField {
    id: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: SelectOption[];
    validation?: ValidationConfig;
    gridColumn?: string;
}

export interface FormConfig {
    id: string;
    title: string;
    description?: string;
    sections: FormSection[];
    layout: 'grid' | 'stacked' | 'tabs';
    submitAction: string;
    resetAction?: string;
}

export interface FormSection {
    id: string;
    title: string;
    fields: FormFieldConfig[];
    conditional?: ConditionalConfig;
    gridColumns?: number;
}

export type FieldType =
    | 'text'
    | 'number'
    | 'date'
    | 'select'
    | 'multiselect'
    | 'checkbox'
    | 'radio'
    | 'textarea'
    | 'file'
    | 'currency'
    | 'percentage'
    | 'array';

export interface ConditionalConfig {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_empty';
    value: any;
    logicalOperator?: 'AND' | 'OR';
    conditions?: ConditionalConfig[];
}

export interface ValidationConfig {
    rules: ValidationRule[];
    messages?: Record<string, string>;
}

export interface ValidationRule {
    type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
    value?: any;
    message?: string;
    customValidator?: (value: any, formData: any) => boolean | string;
}

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}
