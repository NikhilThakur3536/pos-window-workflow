export const IMPORT_RESULTS_STATUSES = ['PENDING', 'VALID', 'INVALID'] as const;

export type ImportResultsStatus = (typeof IMPORT_RESULTS_STATUSES)[number];
