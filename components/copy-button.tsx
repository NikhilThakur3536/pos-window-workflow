import { Button } from '@/components/ui/button';
import { CheckIcon, CopyIcon } from 'lucide-react';
import React from 'react';

type CopyButtonProps = {
    value: string;
} & React.ComponentProps<typeof Button>;

export default function CopyButton({ value, ...props }: CopyButtonProps) {
    const [copied, setCopied] = React.useState(false);
    const Icon = copied ? CheckIcon : CopyIcon;
    const copyToClipboard = async (text: string) => {
        try {
            setCopied(true);
            await navigator.clipboard.writeText(text);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };
    return (
        <Button {...props} onClick={() => copyToClipboard(value)}>
            <Icon className="h-3 w-3" />
        </Button>
    );
}
