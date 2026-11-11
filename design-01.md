# Dynamic UI System Design - Next.js & shadcn/ui

## Architecture Overview

### Core Components

- **Schema-driven UI**: JSON schemas define form fields, validation, and conditional logic
- **Dynamic Form Renderer**: Renders forms based on configuration
- **Dynamic Table System**: Configurable tables with filters and sorting
- **Validation Engine**: Runtime validation with custom rules
- **State Management**: Zustand for global state, React Hook Form for form state

## Project Structure

```
src/
├── components/
│   ├── ui/
│   ├── dynamic-form/
│   │   ├── index.tsx
│   │   ├── field-renderer.tsx
│   │   ├── conditional-wrapper.tsx
│   │   └── validation-provider.tsx
│   ├── dynamic-table/
│   │   ├── index.tsx
│   │   ├── table-filters.tsx
│   │   ├── column-renderer.tsx
│   │   └── table-actions.tsx
│   └── layout/
│       ├── app-layout.tsx
│       └── page-header.tsx
├── schemas/
│   ├── form-schemas/
│   ├── table-schemas/
│   └── validation-schemas/
├── hooks/
│   ├── use-dynamic-form.ts
│   ├── use-dynamic-table.ts
│   ├── use-valdation.ts
│   └── use-conditional-fields.ts
├── stores/
│   ├── form-store.ts
│   ├── table-store.ts
│   └── app-store.ts
├── types/
│   ├── form.types.ts
│   ├── table.types.ts
│   └── common.types.ts
├── utils/
│   ├── validation.utils.ts
│   ├── form.utils.ts
│   └── table.utils.ts
└── app/
│   ├── debtors/
│   │   ├── page.tsx
│   ├── journal/
│   │   ├── page.tsx
│   ├── reports/
│   │   ├── page.tsx

```

## Core Type Definitions

### Form Configuration Types

```typescript
interface FormFieldConfig {
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
}

interface FormConfig {
    id: string;
    title: string;
    description?: string;
    sections: FormSection[];
    layout: 'grid' | 'stacked' | 'tabs';
    submitAction: string;
    resetAction?: string;
}

interface FormSection {
    id: string;
    title: string;
    fields: FormFieldConfig[];
    conditional?: ConditionalConfig;
    gridColumns?: number;
}

type FieldType =
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
    | 'percentage';

interface ConditionalConfig {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_empty';
    value: any;
    logicalOperator?: 'AND' | 'OR';
    conditions?: ConditionalConfig[];
}

interface ValidationConfig {
    rules: ValidationRule[];
    messages?: Record<string, string>;
}

interface ValidationRule {
    type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
    value?: any;
    message?: string;
    customValidator?: (value: any, formData: any) => boolean | string;
}
```

### Table Configuration Types

```typescript
interface TableConfig {
    id: string;
    title: string;
    columns: ColumnConfig[];
    filters: FilterConfig[];
    actions: TableAction[];
    pagination: PaginationConfig;
    sorting: SortingConfig;
    selection?: SelectionConfig;
}

interface ColumnConfig {
    id: string;
    key: string;
    label: string;
    type: ColumnType;
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    formatter?: (value: any, row: any) => React.ReactNode;
    conditional?: ConditionalConfig;
}

type ColumnType = 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean' | 'badge' | 'actions' | 'link';

interface FilterConfig {
    id: string;
    label: string;
    type: FilterType;
    column: string;
    options?: SelectOption[];
    defaultValue?: any;
    multiple?: boolean;
}

type FilterType = 'text' | 'select' | 'date-range' | 'number-range' | 'boolean';
```

## Core Components Implementation

### 1. Dynamic Form Component

```typescript
// components/dynamic-form/index.tsx
interface DynamicFormProps {
  config: FormConfig;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  loading?: boolean;
}

export function DynamicForm({ config, initialData, onSubmit, loading }: DynamicFormProps) {
  const form = useForm({
    defaultValues: initialData,
    resolver: zodResolver(generateValidationSchema(config))
  });

  const { watchedValues, conditionalFields } = useConditionalFields(config, form.watch);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <PageHeader title={config.title} description={config.description} />

        {config.sections.map((section) => (
          <ConditionalWrapper
            key={section.id}
            condition={section.conditional}
            watchedValues={watchedValues}
          >
            <FormSection
              section={section}
              form={form}
              conditionalFields={conditionalFields}
            />
          </ConditionalWrapper>
        ))}

        <FormActions loading={loading} />
      </form>
    </Form>
  );
}
```

### 2. Field Renderer Component

```typescript
// components/dynamic-form/field-renderer.tsx
interface FieldRendererProps {
  field: FormFieldConfig;
  form: UseFormReturn<any>;
  disabled?: boolean;
}

export function FieldRenderer({ field, form, disabled }: FieldRendererProps) {
  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <FormField
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    placeholder={field.placeholder}
                    disabled={disabled || field.disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'select':
        return (
          <FormField
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <Select
                  onValueChange={formField.onChange}
                  defaultValue={formField.value}
                  disabled={disabled || field.disabled}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'date':
        return (
          <FormField
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{field.label}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !formField.value && "text-muted-foreground"
                        )}
                        disabled={disabled || field.disabled}
                      >
                        {formField.value ? (
                          format(formField.value, "PPP")
                        ) : (
                          <span>{field.placeholder || "Pick a date"}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formField.value}
                      onSelect={formField.onChange}
                      disabled={disabled || field.disabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'currency':
        return (
          <FormField
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      {...formField}
                      type="number"
                      step="0.01"
                      className="pl-7"
                      placeholder={field.placeholder}
                      disabled={disabled || field.disabled}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-2", field.gridColumn && `col-span-${field.gridColumn}`)}>
      {renderField()}
    </div>
  );
}
```

### 3. Dynamic Table Component

```typescript
// components/dynamic-table/index.tsx
interface DynamicTableProps {
  config: TableConfig;
  data: any[];
  loading?: boolean;
  onAction?: (action: string, row: any) => void;
}

export function DynamicTable({ config, data, loading, onAction }: DynamicTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const columns = useMemo(() =>
    generateColumns(config.columns, onAction),
    [config.columns, onAction]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{config.title}</h2>
        <TableFilters
          config={config.filters}
          table={table}
          onFiltersChange={setColumnFilters}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={getColumnAlignment(header.column.columnDef)}>
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center space-x-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => header.column.toggleSorting()}
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={getColumnAlignment(cell.column.columnDef)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination table={table} />
    </div>
  );
}
```

### 4. Conditional Logic Hook

```typescript
// hooks/use-conditional-fields.ts
export function useConditionalFields(config: FormConfig, watchFn: any) {
    const watchedValues = watchFn();

    const conditionalFields = useMemo(() => {
        const result: Record<string, boolean> = {};

        const evaluateCondition = (condition: ConditionalConfig, values: any): boolean => {
            if (!condition) return true;

            const fieldValue = values[condition.field];

            let conditionMet = false;

            switch (condition.operator) {
                case 'equals':
                    conditionMet = fieldValue === condition.value;
                    break;
                case 'not_equals':
                    conditionMet = fieldValue !== condition.value;
                    break;
                case 'greater_than':
                    conditionMet = Number(fieldValue) > Number(condition.value);
                    break;
                case 'less_than':
                    conditionMet = Number(fieldValue) < Number(condition.value);
                    break;
                case 'contains':
                    conditionMet = String(fieldValue).includes(String(condition.value));
                    break;
                case 'not_empty':
                    conditionMet = fieldValue != null && fieldValue !== '';
                    break;
            }

            if (condition.conditions && condition.conditions.length > 0) {
                const subResults = condition.conditions.map((subCondition) => evaluateCondition(subCondition, values));

                if (condition.logicalOperator === 'OR') {
                    conditionMet = conditionMet || subResults.some(Boolean);
                } else {
                    conditionMet = conditionMet && subResults.every(Boolean);
                }
            }

            return conditionMet;
        };

        config.sections.forEach((section) => {
            section.fields.forEach((field) => {
                if (field.conditional) {
                    result[field.id] = evaluateCondition(field.conditional, watchedValues);
                } else {
                    result[field.id] = true;
                }
            });
        });

        return result;
    }, [config, watchedValues]);

    return { watchedValues, conditionalFields };
}
```

## Configuration Examples

### Journal Entry Form Configuration

```json
{
    "id": "journal-entry-form",
    "title": "Journal Entry",
    "sections": [
        {
            "id": "journal-details",
            "title": "Journal Details",
            "gridColumns": 2,
            "fields": [
                {
                    "id": "accountNumber",
                    "type": "select",
                    "label": "Account Number",
                    "required": true,
                    "options": [
                        { "value": "ACC001", "label": "Account 001" },
                        { "value": "ACC002", "label": "Account 002" }
                    ]
                },
                {
                    "id": "journalDate",
                    "type": "date",
                    "label": "Journal Date",
                    "required": true,
                    "defaultValue": "today"
                },
                {
                    "id": "transactionType",
                    "type": "select",
                    "label": "Transaction Type",
                    "required": true,
                    "options": [
                        { "value": "DR", "label": "Debit" },
                        { "value": "CR", "label": "Credit" }
                    ]
                },
                {
                    "id": "amount",
                    "type": "currency",
                    "label": "Amount",
                    "required": true,
                    "validation": {
                        "rules": [{ "type": "min", "value": 0.01, "message": "Amount must be greater than 0" }]
                    }
                },
                {
                    "id": "reference",
                    "type": "text",
                    "label": "Reference",
                    "conditional": {
                        "field": "transactionType",
                        "operator": "equals",
                        "value": "DR"
                    }
                }
            ]
        }
    ]
}
```

### Debtors Table Configuration

```json
{
    "id": "debtors-table",
    "title": "Debtors Management",
    "columns": [
        {
            "id": "jobNumber",
            "key": "jobNumber",
            "label": "Job Number",
            "type": "text",
            "sortable": true,
            "filterable": true
        },
        {
            "id": "orderNo",
            "key": "orderNo",
            "label": "Order No",
            "type": "text",
            "sortable": true
        },
        {
            "id": "name",
            "key": "name",
            "label": "Name",
            "type": "text",
            "sortable": true,
            "filterable": true
        },
        {
            "id": "total",
            "key": "total",
            "label": "Total",
            "type": "currency",
            "align": "right",
            "sortable": true
        },
        {
            "id": "actions",
            "key": "actions",
            "label": "Actions",
            "type": "actions",
            "width": "100px"
        }
    ],
    "filters": [
        {
            "id": "name-filter",
            "label": "Name",
            "type": "text",
            "column": "name"
        },
        {
            "id": "date-filter",
            "label": "Date Range",
            "type": "date-range",
            "column": "date"
        }
    ]
}
```

## Key Features

### 1. **Dynamic Field Rendering**

- Support for all input types (text, number, date, select, etc.)
- Conditional field visibility based on other field values
- Real-time validation with custom rules

### 2. **Flexible Validation**

- Schema-based validation using Zod
- Custom validation functions
- Real-time and submit-time validation
- Field-level and form-level validation messages

### 3. **Advanced Conditional Logic**

- Multiple condition operators (equals, contains, greater_than, etc.)
- Logical operators (AND, OR) for complex conditions
- Nested conditional logic
- Watch-based reactive updates

### 4. **Dynamic Tables**

- Configurable columns with different data types
- Advanced filtering (text, select, date ranges)
- Sorting and pagination
- Row actions and bulk operations
- Responsive design

### 5. **State Management**

- Form state with React Hook Form
- Global state with Zustand
- Persistent filters and preferences
- Real-time data synchronization

This system provides a complete foundation for building dynamic, configuration-driven UIs that can handle complex business applications like the ones shown in your screenshots.
