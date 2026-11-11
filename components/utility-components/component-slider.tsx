import React, { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ComponentSliderProps {
    totalPages?: number;
    currentPage: number;
    setCurrentPage: Dispatch<SetStateAction<number>>;
    arrowsClassName?: string;
}

const ComponentSlider = ({ totalPages = 2, currentPage, setCurrentPage, arrowsClassName }: ComponentSliderProps) => {
    const handleNext = () => {
        setCurrentPage((prev) => (prev + 1) % totalPages);
    };

    const handlePrev = () => {
        setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
    };

    return (
        <>
            <Button
                onClick={handlePrev}
                disabled={currentPage === 0}
                variant="ghost"
                className={`absolute top-[50vh] left-1 !h-8 !w-8 rounded-full bg-blue-600 !text-white transition-transform duration-200 hover:scale-105 hover:bg-blue-700 ${arrowsClassName}`}
            >
                <ChevronLeft className="!h-7 !w-7" />
            </Button>
            <Button
                onClick={handleNext}
                disabled={currentPage === totalPages - 1}
                variant="ghost"
                size="icon"
                className={`absolute top-[50vh] right-1 !h-8 !w-8 rounded-full bg-blue-600 !text-white transition-transform duration-200 hover:scale-105 hover:bg-blue-700 ${arrowsClassName}`}
            >
                <ChevronRight className="!h-7 !w-7" />
            </Button>
        </>
    );
};

export default ComponentSlider;
