import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import React, { ReactNode } from 'react';

type ConfirmPropsBase = {
    title?: string;
    description?: string;
    onConfirm: () => void;
    variant?: React.ComponentProps<typeof Button>['variant'];
    confirmBtnTitle?: string;
    hideCancel?: boolean;
};

type WithTrigger = ConfirmPropsBase & {
    trigger: React.ReactNode;
    open?: never;
    setOpen?: never;
    children?: ReactNode;
};

type WithoutTrigger = ConfirmPropsBase & {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    trigger?: undefined;
    children?: ReactNode;
};

type ConfirmProps = WithTrigger | WithoutTrigger;

export default function ConfirmDialog(props: ConfirmProps) {
    const {
        title = 'Are you sure?',
        description = 'This action cannot be undone.',
        variant = 'default',
        onConfirm,
        confirmBtnTitle = 'Confirm',
        hideCancel = false,
        children,
    } = props;

    if ('trigger' in props && props.trigger) {
        return (
            <AlertDialog>
                <AlertDialogTrigger asChild>{props.trigger}</AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className={`${variant === 'destructive' ? 'text-red-700' : ''}`}>
                            {title}
                        </AlertDialogTitle>
                        <AlertDialogDescription>{description}</AlertDialogDescription>
                    </AlertDialogHeader>

                    {children && children}

                    <AlertDialogFooter>
                        {hideCancel ? null : <AlertDialogCancel>Cancel</AlertDialogCancel>}
                        <AlertDialogAction variant={variant} onClick={onConfirm}>
                            {confirmBtnTitle || 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    const { open, setOpen } = props as WithoutTrigger;
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className={`text-${variant}`}>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>

                {children && children}

                <AlertDialogFooter>
                    {hideCancel ? null : <AlertDialogCancel>Cancel</AlertDialogCancel>}
                    <AlertDialogAction variant={variant} onClick={onConfirm}>
                        {confirmBtnTitle || 'Confirm'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
