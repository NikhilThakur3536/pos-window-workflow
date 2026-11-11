import { SearchIcon, XIcon } from 'lucide-react';
import { Button } from '../ui/button';

interface FilterActionButtonProps {
    showClearButton: boolean;
    onApplyFilters: () => void;
    onClearClick: () => void;
    height?: string;
}

const FilterActionButtons = ({ showClearButton, onClearClick, onApplyFilters, height }: FilterActionButtonProps) => {
    return (
        <>
            <Button type="submit" onClick={onApplyFilters} size="icon" className={`${height || '!h-7'}`}>
                <SearchIcon className="h-4 w-4" />
            </Button>

            {showClearButton ? (
                <Button
                    type="button"
                    onClick={onClearClick}
                    variant="outline"
                    size="icon"
                    className={`${height || '!h-7'}`}
                >
                    <XIcon className="h-4 w-4" />
                </Button>
            ) : null}
        </>
    );
};

export default FilterActionButtons;
