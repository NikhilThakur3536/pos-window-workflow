// // import { useState } from 'react';

// // interface Pagination {
// //     pageIndex: number;
// //     pageSize: number;
// // }


// // const useTableFilters = <T extends Record<string, any>>(initialFilters: T, defaultPageSize: number = 10) => {
// //     const [filters, setFilters] = useState<T>(initialFilters);
// //     const [appliedFilters, setAppliedFilters] = useState<T>(initialFilters);
// //     const [showClearButton, setShowClearButton] = useState(false);
// //     const [pagination, setPagination] = useState<Pagination>({
// //         pageIndex: 0,
// //         pageSize: defaultPageSize,
// //     });
// //     console.log("page index",pagination)


// //     function handleFilters(updatedFilters: T) {
// //         console.log("handleFilters called");
// //         setShowClearButton(true);
// //         setAppliedFilters(updatedFilters);
// //         setPagination((prev) => ({
// //             pageIndex: 0,
// //             pageSize: prev.pageSize,
// //         }));
// //     }

// //     function clearFilters() {
// //         console.log("clearFilters called");
// //         setShowClearButton(false);
// //         setFilters(initialFilters);
// //         setAppliedFilters(initialFilters);
// //         setPagination((prev) => ({
// //             pageIndex: 0,
// //             pageSize: prev.pageSize,
// //         }));
// //     }

// //     return {
// //         filters,
// //         setFilters,
// //         appliedFilters,
// //         handleFilters,
// //         clearFilters,
// //         showClearButton,
// //         pagination,
// //         setPagination,
// //     };
// // };

// // export default useTableFilters;

// import { useEffect, useRef, useState } from 'react';

// interface Pagination {
//     pageIndex: number;
//     pageSize: number;
// }

// const useTableFilters = <T extends Record<string, any>>(
//     initialFilters: T,
//     defaultPageSize: number = 10,
// ) => {
//     // =========================
//     // Render Counter
//     // =========================
//     const renderCount = useRef(0);
//     renderCount.current++;

//     console.log(
//         `%c================ Render #${renderCount.current} ================`,
//         'color:cyan;font-weight:bold;'
//     );

//     // =========================
//     // States
//     // =========================
//     const [filtersState, _setFilters] = useState<T>(initialFilters);
//     const [appliedFiltersState, _setAppliedFilters] = useState<T>(initialFilters);
//     const [showClearButtonState, _setShowClearButton] = useState(false);

//     const [paginationState, _setPagination] = useState<Pagination>({
//         pageIndex: 0,
//         pageSize: defaultPageSize,
//     });

//     // =========================
//     // Mount / Unmount
//     // =========================
//     useEffect(() => {
//         console.log(
//             '%cuseTableFilters Mounted',
//             'background:green;color:white;padding:2px 6px'
//         );

//         return () => {
//             console.log(
//                 '%cuseTableFilters Unmounted',
//                 'background:red;color:white;padding:2px 6px'
//             );
//         };
//     }, []);

//     // =========================
//     // State Watchers
//     // =========================
//     useEffect(() => {
//         console.log('Pagination Changed =>', paginationState);
//     }, [paginationState]);

//     useEffect(() => {
//         console.log('Filters Changed =>', filtersState);
//     }, [filtersState]);

//     useEffect(() => {
//         console.log('Applied Filters Changed =>', appliedFiltersState);
//     }, [appliedFiltersState]);

//     useEffect(() => {
//         console.log('Show Clear Button Changed =>', showClearButtonState);
//     }, [showClearButtonState]);

//     // =========================
//     // Wrapped Setters
//     // =========================

//     const setPagination: typeof _setPagination = (value) => {
//         console.group('%csetPagination()', 'color:orange;font-weight:bold');

//         console.trace('Called From');

//         _setPagination((prev) => {
//             const next =
//                 typeof value === 'function'
//                     ? (value as (prev: Pagination) => Pagination)(prev)
//                     : value;

//             console.log('Previous Pagination:', prev);
//             console.log('Next Pagination:', next);

//             return next;
//         });

//         console.groupEnd();
//     };

//     const setFilters: typeof _setFilters = (value) => {
//         console.group('%csetFilters()', 'color:blue;font-weight:bold');

//         console.trace('Called From');

//         console.log('Previous Filters:', filtersState);
//         console.log('Incoming:', value);

//         _setFilters(value);

//         console.groupEnd();
//     };

//     const setAppliedFilters: typeof _setAppliedFilters = (value) => {
//         console.group('%csetAppliedFilters()', 'color:purple;font-weight:bold');

//         console.trace('Called From');

//         console.log('Previous Applied Filters:', appliedFiltersState);
//         console.log('Incoming:', value);

//         _setAppliedFilters(value);

//         console.groupEnd();
//     };

//     const setShowClearButton: typeof _setShowClearButton = (value) => {
//         console.group('%csetShowClearButton()', 'color:green;font-weight:bold');

//         console.trace('Called From');

//         console.log('Previous:', showClearButtonState);
//         console.log('Incoming:', value);

//         _setShowClearButton(value);

//         console.groupEnd();
//     };

//     // =========================
//     // Actions
//     // =========================

//     function handleFilters(updatedFilters: T) {
//         console.group(
//             '%chandleFilters()',
//             'background:#2563eb;color:white;padding:2px 6px'
//         );

//         console.trace();

//         console.log('Updated Filters:', updatedFilters);

//         setShowClearButton(true);
//         setAppliedFilters(updatedFilters);

//         setPagination((prev) => ({
//             pageIndex: 0,
//             pageSize: prev.pageSize,
//         }));

//         console.groupEnd();
//     }

//     function clearFilters() {
//         console.group(
//             '%cclearFilters()',
//             'background:#dc2626;color:white;padding:2px 6px'
//         );

//         console.trace();

//         console.log('Initial Filters:', initialFilters);

//         setShowClearButton(false);
//         setFilters(initialFilters);
//         setAppliedFilters(initialFilters);

//         setPagination((prev) => ({
//             pageIndex: 0,
//             pageSize: prev.pageSize,
//         }));

//         console.groupEnd();
//     }

//     // =========================
//     // Snapshot
//     // =========================
//     console.table({
//         pageIndex: paginationState.pageIndex,
//         pageSize: paginationState.pageSize,
//         showClearButton: showClearButtonState,
//     });

//     return {
//         filters: filtersState,
//         setFilters,
//         appliedFilters: appliedFiltersState,
//         handleFilters,
//         clearFilters,
//         showClearButton: showClearButtonState,
//         pagination: paginationState,
//         setPagination,
//     };
// };

// export default useTableFilters;
import { useCallback, useRef, useState } from 'react';

interface Pagination {
    pageIndex: number;
    pageSize: number;
}

const useTableFilters = <T extends Record<string, any>>(
    initialFilters: T,
    defaultPageSize: number = 10,
) => {
    // Keep a stable reference to the caller-supplied initial filters, even if
    // the caller passes a fresh object literal on every render. Only the
    // very first value is ever used (as an initializer / reset target).
    const initialFiltersRef = useRef(initialFilters);

    const [filters, setFilters] = useState<T>(initialFiltersRef.current);
    const [appliedFilters, setAppliedFilters] = useState<T>(initialFiltersRef.current);
    const [showClearButton, setShowClearButton] = useState(false);

    const [pagination, _setPagination] = useState<Pagination>({
        pageIndex: 0,
        pageSize: defaultPageSize,
    });

    // Stable identity across renders - this is what gets handed to
    // react-table as onPaginationChange, so it must not change on every render.
    const setPagination: typeof _setPagination = useCallback((value) => {
        _setPagination((prev) => (typeof value === 'function' ? (value as (prev: Pagination) => Pagination)(prev) : value));
    }, []);

    const handleFilters = useCallback((updatedFilters: T) => {
        setShowClearButton(true);
        // Keep the visible filter state in sync with what was applied, otherwise
        // controls bound to `filters` (e.g. SelectPopover) keep showing the old value.
        setFilters(updatedFilters);
        setAppliedFilters(updatedFilters);
        setPagination((prev) => ({
            pageIndex: 0,
            pageSize: prev.pageSize,
        }));
    }, [setPagination]);

    const clearFilters = useCallback(() => {
        setShowClearButton(false);
        setFilters(initialFiltersRef.current);
        setAppliedFilters(initialFiltersRef.current);
        setPagination((prev) => ({
            pageIndex: 0,
            pageSize: prev.pageSize,
        }));
    }, [setPagination]);

    return {
        filters,
        setFilters,
        appliedFilters,
        handleFilters,
        clearFilters,
        showClearButton,
        pagination,
        setPagination,
    };
};

export default useTableFilters;