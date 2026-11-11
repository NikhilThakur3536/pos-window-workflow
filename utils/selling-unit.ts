import type { StockDetails } from '@/api-queries/company/stock-details';

// Backlog 3235 helpers.
//
// A selling SKU may be a "pack" (e.g. a case or shrink wrap) that contains several of the
// smallest physical units. When the backend has configured the pack/unit mapping the pack row
// carries `inventoryUnitsPerSellingUnit` (units per selling D), a non-null
// `baseInventoryItemId`/`baseStockDetailId`, and `baseStockDetailId === id` on the unit row.
// These helpers are display/UX only: the POS always sends the selected selling SKU id, its own
// pricing ids and the quantity the operator entered, and lets the backend convert to base units.

type SellingUnitFields = Pick<
    StockDetails,
    'id' | 'baseInventoryItemId' | 'baseStockDetailId' | 'inventoryUnitsPerSellingUnit'
>;

export function hasConfiguredBaseMapping(product?: SellingUnitFields | null): boolean {
    if (!product) return false;
    if (product.inventoryUnitsPerSellingUnit != null) return true;
    return product.baseInventoryItemId != null || product.baseStockDetailId != null;
}

export function unitsPerSellingUnit(product?: SellingUnitFields | null): number {
    const units = product?.inventoryUnitsPerSellingUnit;
    if (units != null && units > 0) return units;
    return 1;
}

// True when this row sells more than one base unit (a pack/case). Falls back to the base
// stock detail mapping when the explicit unit count is absent.
export function isPackSellingUnit(product?: SellingUnitFields | null): boolean {
    if (!product) return false;
    const units = product.inventoryUnitsPerSellingUnit;
    if (units != null) return units > 1;
    return product.baseStockDetailId != null && product.baseStockDetailId !== product.id;
}

export function isUnitSellingUnit(product?: SellingUnitFields | null): boolean {
    if (!product) return false;
    return hasConfiguredBaseMapping(product) && !isPackSellingUnit(product);
}
