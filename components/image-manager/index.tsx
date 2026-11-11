import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Star, Trash2, Upload, Loader2, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    validateImages,
    normalizeImagesResponse,
    uploadProductImage,
    uploadCategoryImage,
    listProductImages,
    listCategoryImages,
    updateProductImageOrder,
    updateCategoryImageOrder,
    deleteProductImage,
    deleteCategoryImage,
    IMAGE_ACCEPT_ATTR,
    type ScopedImage,
    type CategoryImageScopeType,
} from '@/api-queries/company/images';

// A single image-manager used by three places:
//   - Product create (mode="pending")  : uploads are done WITHOUT a product id; the returned
//                                        rows are held here and attached on create via the
//                                        `productImages` array (onChange keeps the parent in sync).
//   - Product edit (mode="managed")    : images are loaded for the product and every mutation
//                                        (upload / set primary / reorder / delete) hits the
//                                        /api/company/productImages/* endpoints directly.
//   - Category / Sub-category edit     : same managed flow against /api/company/categoryImages/*,
//                                        scoped by scopeType (CATEGORY | SUBCATEGORY) + scopeId.
export interface ImageManagerProps {
    mode: 'managed' | 'pending';
    scope?: 'product' | 'category';
    scopeType?: CategoryImageScopeType;
    scopeId?: string;
    disabled?: boolean;
    label?: string;
    helperText?: string;
    initialPending?: ScopedImage[];
    onChange?: (images: ScopedImage[]) => void;
}

const ImageManager = ({
    mode,
    scope = 'product',
    scopeType,
    scopeId,
    disabled = false,
    label,
    helperText,
    initialPending = [],
    onChange,
}: ImageManagerProps) => {
    // Capture the initial list once. `initialPending` can be a fresh array literal on every
    // parent render; using it (or re-setting state from it) in effects would re-trigger the
    // list fetch forever, so it is frozen into a ref instead of tracked as a dependency.
    const initialImagesRef = useRef<ScopedImage[]>(initialPending);
    const [images, setImages] = useState<ScopedImage[]>(initialImagesRef.current);
    const [isLoading, setIsLoading] = useState(mode === 'managed' && !!scopeId);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const isManaged = mode === 'managed';
    const hasScope = isManaged && !!scopeId;
    const effectiveLabel =
        label ||
        (scope === 'category'
            ? 'Category Images'
            : isManaged
              ? 'Product Images'
              : 'Product Images (attached on save)');

    const getErrorMessage = (e: unknown) => {
        // @ts-ignore
        return e?.response?.data?.message || e?.message || 'Failed to update images';
    };

    const refreshList = useCallback(async () => {
        if (!hasScope) return;
        setIsLoading(true);
        try {
            const res =
                scope === 'product'
                    ? await listProductImages(scopeId as string)
                    : await listCategoryImages(scopeType as CategoryImageScopeType, scopeId as string);
            setImages(normalizeImagesResponse(res));
        } catch (e) {
            toast.error(getErrorMessage(e));
        } finally {
            setIsLoading(false);
        }
    }, [hasScope, scope, scopeType, scopeId]);

    useEffect(() => {
        if (hasScope) void refreshList();
        else if (mode === 'pending') setImages(initialImagesRef.current);
    }, [hasScope, mode, refreshList]);

    // pending mode only: keep the parent (product create form) in sync.
    useEffect(() => {
        if (mode === 'pending') onChange?.(images);
    }, [images]);

    const uploadFiles = async (files: File[]) => {
        if (!files.length) return;
        const validationError = validateImages(files, images.length);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        setIsUploading(true);
        try {
            for (const file of files) {
                const res =
                    isManaged && scope === 'product'
                        ? await uploadProductImage({ file, companyStockDetailId: scopeId, isPrimary: images.length === 0 })
                        : isManaged && scope === 'category'
                          ? await uploadCategoryImage({
                                scopeType: scopeType as CategoryImageScopeType,
                                scopeId: scopeId as string,
                                file,
                                isPrimary: images.length === 0,
                            })
                          : await uploadProductImage({ file, isPrimary: images.length === 0 });
                const uploaded = normalizeImagesResponse(res);
                if (!uploaded.length) {
                    toast.error(`No image was returned for ${file.name}.`);
                    continue;
                }
                if (isManaged) {
                    await refreshList();
                } else {
                    setImages((prev) => [...prev, ...uploaded]);
                }
            }
            if (!isManaged) toast.success('Images uploaded. They will be attached when the product is saved.');
        } catch (e) {
            toast.error(getErrorMessage(e));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const commitOrder = async (next: ScopedImage[]) => {
        if (!isManaged) return;
        const orderItems = next
            .map((img, i) => ({ id: img.id as string, isPrimary: i === next.findIndex((x) => x.isPrimary) }))
            .filter((item) => item.id);
        if (!orderItems.length) return;
        try {
            if (scope === 'product') {
                await updateProductImageOrder(scopeId as string, orderItems);
            } else {
                await updateCategoryImageOrder(
                    scopeType as CategoryImageScopeType,
                    scopeId as string,
                    orderItems,
                );
            }
            await refreshList();
        } catch (e) {
            toast.error(getErrorMessage(e));
        }
    };

    const move = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= images.length) return;
        const next = [...images];
        [next[index], next[target]] = [next[target], next[index]];
        setImages(next);
        if (isManaged) void commitOrder(next);
    };

    const setPrimary = (index: number) => {
        const next = images.map((img, i) => ({ ...img, isPrimary: i === index }));
        setImages(next);
        if (isManaged) void commitOrder(next);
    };

    const remove = async (index: number) => {
        const img = images[index];
        if (!img) return;
        if (isManaged) {
            if (!img.id) return;
            setPendingAction(img.id);
            try {
                if (scope === 'product') await deleteProductImage(img.id);
                else await deleteCategoryImage(img.id);
                await refreshList();
            } catch (e) {
                toast.error(getErrorMessage(e));
            } finally {
                setPendingAction(null);
            }
        } else {
            setImages((prev) => prev.filter((_, i) => i !== index));
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs">{effectiveLabel}</Label>
                {!disabled && (
                    <>
                        <Input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={IMAGE_ACCEPT_ATTR}
                            className="hidden"
                            onChange={(e) => void uploadFiles(Array.from(e.target.files || []))}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={disabled || isUploading || (isManaged && isLoading)}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            Upload
                        </Button>
                    </>
                )}
            </div>
            {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}

            {isLoading ? (
                <div className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading images…
                </div>
            ) : images.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground">
                    <ImageOff className="h-4 w-4" />
                    No images yet. Upload to add one.
                </div>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {images.map((img, i) => (
                        <div key={img.id || `${i}-${img.imageKey || img.imageUrl}`} className="w-24">
                            <div className="relative">
                                {img.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={img.imageUrl}
                                        alt={img.fileName || `Image ${i + 1}`}
                                        className="h-24 w-24 rounded-md border object-cover"
                                    />
                                ) : (
                                    <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-slate-50 text-muted-foreground">
                                        <ImageOff className="h-5 w-5" />
                                    </div>
                                )}
                                {img.isPrimary && (
                                    <span
                                        className="absolute -left-2 -top-2 rounded-full bg-emerald-500 p-1 text-white shadow"
                                        title="Primary image"
                                    >
                                        <Star className="h-3 w-3 fill-current" />
                                    </span>
                                )}
                            </div>
                            <div className="mt-1 flex justify-center gap-1">
                                <button
                                    type="button"
                                    disabled={disabled || i === 0 || !!pendingAction}
                                    onClick={() => move(i, -1)}
                                    className={cn('rounded p-0.5 hover:bg-slate-100 disabled:opacity-30', disabled && 'hidden')}
                                >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    disabled={disabled || i === images.length - 1 || !!pendingAction}
                                    onClick={() => move(i, 1)}
                                    className={cn('rounded p-0.5 hover:bg-slate-100 disabled:opacity-30', disabled && 'hidden')}
                                >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    disabled={disabled || !!img.isPrimary || !!pendingAction}
                                    onClick={() => setPrimary(i)}
                                    title="Set as primary"
                                    className={cn('rounded p-0.5 text-amber-500 hover:bg-slate-100 disabled:opacity-30', disabled && 'hidden')}
                                >
                                    <Star className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    disabled={disabled || !!pendingAction}
                                    onClick={() => void remove(i)}
                                    className={cn('rounded p-0.5 text-red-500 hover:bg-slate-100 disabled:opacity-30', disabled && 'hidden')}
                                >
                                    {pendingAction === img.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageManager;