import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import React from 'react';

type SubmitButtonProps = {
    isPending: boolean;
} & React.ComponentProps<typeof Button>;

export default function SubmitButton({ isPending, children, ...props }: SubmitButtonProps) {
    return (
        <Button type="submit" {...props} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {children}
        </Button>
    );
}
