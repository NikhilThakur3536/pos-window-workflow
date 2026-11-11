import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface InvoiceCount {
    terminalId: string;
    asInvoiceCount: number;
    csInvoiceCount: number;
    grvInvoiceCount: number;
    dnInvoiceCount: number;
    cnInvoiceCount: number;
    debtorReceiptCount: number;
    setTerminalId: (state: string) => void;
    setASInvoiceCount: (state: number) => void;
    setCSInvoiceCount: (state: number) => void;
    setGRVInvoiceCount: (state: number) => void;
    setDNInvoiceCount: (state: number) => void;
    setCNInvoiceCount: (state: number) => void;
    setDebtorReceiptCount: (state: number) => void;
}

export const useInvoiceCountState = create<InvoiceCount>()(
    persist(
        (set) => ({
            terminalId: '',
            asInvoiceCount: 0,
            csInvoiceCount: 0,
            grvInvoiceCount: 0,
            dnInvoiceCount: 0,
            cnInvoiceCount: 0,
            debtorReceiptCount: 0,
            setTerminalId: (state) => set({ terminalId: state }),
            setASInvoiceCount: (state) => set({ asInvoiceCount: state }),
            setCSInvoiceCount: (state) => set({ csInvoiceCount: state }),
            setGRVInvoiceCount: (state) => set({ grvInvoiceCount: state }),
            setDNInvoiceCount: (state) => set({ dnInvoiceCount: state }),
            setCNInvoiceCount: (state) => set({ cnInvoiceCount: state }),
            setDebtorReceiptCount: (state) => set({ debtorReceiptCount: state }),
        }),
        {
            name: 'pos-invoice-count-store',
        },
    ),
);
