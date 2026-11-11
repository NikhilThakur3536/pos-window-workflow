import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

// Some APIs serialize numeric columns back as strings (e.g. a price like "12.000").
// When such a string is prefilled into a number field of an edit form, zod fails it
// with "Expected number, received string". This wrapper is a drop-in replacement for
// zodResolver: it converts non-empty numeric strings to numbers only for validation,
// then hands the original values to the submit handler, so a prefilled "12.000" is
// submitted back unchanged as a string and a value typed by the user still goes as a
// number. Empty strings and non-numeric strings are left untouched (still rejected).

type NumberPathNode = {
    leaf: boolean;
    children: Map<string, NumberPathNode> | null;
};

const NUMBER_LEAF = z.ZodNumber;

function collectNumberPatterns(schema: z.ZodType, prefix: string, out: string[]): void {
    if (schema instanceof NUMBER_LEAF) {
        out.push(prefix);
        return;
    }

    const def = (schema as { _def?: { shape?: Record<string, z.ZodType>; innerType?: z.ZodType; element?: z.ZodType } })._def;
    if (!def) return;

    // zod v4 keeps the object shape on .refine/.superRefine results too.
    if (def.shape) {
        for (const key of Object.keys(def.shape)) {
            collectNumberPatterns(def.shape[key], prefix ? `${prefix}.${key}` : key, out);
        }
        return;
    }

    // ZodOptional / ZodNullable / ZodDefault wrap the inner type.
    if (def.innerType) {
        collectNumberPatterns(def.innerType, prefix, out);
        return;
    }

    // Arrays use a wildcard segment for each element.
    if (def.element) {
        collectNumberPatterns(def.element, prefix ? `${prefix}.*` : '*', out);
    }
}

function buildTrie(patterns: string[]): NumberPathNode {
    const root: NumberPathNode = { leaf: false, children: null };
    for (const pattern of patterns) {
        let node = root;
        for (const segment of pattern.split('.')) {
            if (!node.children) node.children = new Map();
            if (!node.children.has(segment)) node.children.set(segment, { leaf: false, children: null });
            node = node.children.get(segment) as NumberPathNode;
        }
        node.leaf = true;
    }
    return root;
}

const isCoercibleNumber = (value: unknown): boolean =>
    typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value));

function coerceTree(data: unknown, node: NumberPathNode): unknown {
    if (node.leaf) {
        return isCoercibleNumber(data) ? Number(data) : data;
    }
    if (!node.children) return data;

    const wildcard = node.children.get('*');
    if (wildcard && Array.isArray(data)) {
        return data.map((item) => coerceTree(item, wildcard));
    }

    if (data === null || typeof data !== 'object') return data;

    const out: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    for (const [key, child] of node.children) {
        out[key] = coerceTree((data as Record<string, unknown>)[key], child);
    }
    return out;
}

export function zodResolverCoerced<
    Input extends FieldValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Context = any,
    Output = Input,
    TSchema extends z.ZodType<Output, Input> = z.ZodType<Output, Input>,
>(
    schema: TSchema,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schemaOptions?: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolverOptions?: any,
): Resolver<z.input<TSchema>, Context, z.output<TSchema>> {
    const patterns: string[] = [];
    collectNumberPatterns(schema, '', patterns);

    // No numeric fields: identical to the plain resolver.
    if (!patterns.length) {
        return zodResolver(schema as never, schemaOptions as never, resolverOptions as never) as Resolver<
            z.input<TSchema>,
            Context,
            z.output<TSchema>
        >;
    }

    const trie = buildTrie(patterns);
    const base = zodResolver(schema as never, schemaOptions as never, resolverOptions as never);

    const resolver = async (
        values: z.input<TSchema>,
        context: Context,
        options: Parameters<typeof base>[2],
    ): Promise<
        { values: z.input<TSchema>; errors: Record<string, never> } | { values: Record<string, never>; errors: unknown }
    > => {
        const validationValues = coerceTree(values, trie);
        const result = await base(validationValues as never, context as never, options as never);
        if (result.errors && Object.keys(result.errors).length) {
            return { values: {}, errors: result.errors };
        }
        // Keep the original (possibly string) values so prefilled API numbers
        // round-trip unchanged; validation already ran on the coerced numbers.
        return { values, errors: {} };
    };

    return resolver as unknown as Resolver<z.input<TSchema>, Context, z.output<TSchema>>;
}