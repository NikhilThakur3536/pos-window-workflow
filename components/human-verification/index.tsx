import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Calculator, CheckCircle2, XCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HumanVerificationProps {
    mathQuestion: { a: number; b: number };
    mathAnswer: string;
    setMathAnswer: (val: string) => void;
}

export function HumanVerification({ mathQuestion, mathAnswer, setMathAnswer }: HumanVerificationProps) {
    const correct = parseInt(mathAnswer) === mathQuestion.a + mathQuestion.b;
    const hasAnswer = mathAnswer.trim() !== '';

    return (
        <div className="flex w-full flex-col gap-3">
            <Separator className="my-1" />

            <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-green-600 uppercase">
                    <ShieldCheck className="h-3 w-3" />
                    Prevents automated submissions
                </p>

                <Badge variant="secondary" className="ml-auto font-mono text-[10px] tracking-widest uppercase">
                    <User /> Check
                </Badge>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
                <Calculator className="h-4 w-4 shrink-0 text-blue-400" />
                <p className="text-muted-foreground text-sm">
                    What is{' '}
                    <span className="text-foreground font-mono text-base font-bold">
                        {mathQuestion.a} + {mathQuestion.b}
                    </span>
                    ?
                </p>
            </div>

            <div className="relative flex items-center">
                <Input
                    value={mathAnswer}
                    onChange={(e) => setMathAnswer(e.target.value)}
                    type="number"
                    placeholder="Enter your answer"
                    className={cn(
                        'pr-10 font-mono text-base transition-all duration-200',
                        '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                        hasAnswer &&
                            correct &&
                            'border-emerald-500/60 bg-emerald-500/5 focus-visible:ring-emerald-500/30',
                        hasAnswer &&
                            !correct &&
                            'border-destructive/60 bg-destructive/5 focus-visible:ring-destructive/30',
                    )}
                />
                {hasAnswer && (
                    <div className="pointer-events-none absolute right-3">
                        {correct ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <XCircle className="text-destructive h-4 w-4" />
                        )}
                    </div>
                )}
            </div>

            <Separator className="my-1" />
        </div>
    );
}
