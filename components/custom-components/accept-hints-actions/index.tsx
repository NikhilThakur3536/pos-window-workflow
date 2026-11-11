import type React from 'react';
import { Button } from '@/components/ui/button';
import { CheckIcon, CircleQuestionMark, type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface AcceptHintActionsProps {
    onShowHints: () => void;
    onAccept: () => void;
    containerClassName?: string;
    saveButtonTitle?: string;
    SaveButtonIcon?: LucideIcon;
    disabled?: boolean;
    children?: ReactNode;
}

const AcceptHintActions: React.FC<AcceptHintActionsProps> = ({
    onShowHints,
    onAccept,
    containerClassName,
    saveButtonTitle,
    SaveButtonIcon,
    disabled = false,
    children,
}) => {
    return (
        <div className={`flex justify-end gap-2 border-t border-gray-200 p-4 ${containerClassName}`}>
            {children && children}

            {/* <Button
                type="button"
                onClick={onShowHints}
                className="cursor-pointer bg-blue-500 text-white hover:bg-blue-600"
            >
                <CircleQuestionMark className="!h-5 !w-5" />
                Show Hints
            </Button> */}
            <Button
                type="submit"
                onClick={onAccept}
                disabled={disabled}
                className="cursor-pointer bg-green-500 text-white hover:bg-green-600"
            >
                {SaveButtonIcon ? <SaveButtonIcon className="!h-5 !w-5" /> : <CheckIcon className="!h-5 !w-5" />}
                {saveButtonTitle || 'Accept'}
            </Button>
        </div>
    );
};

export default AcceptHintActions;
