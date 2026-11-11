import { useRouter } from 'next/router';

export default function FormId() {
    const { query } = useRouter();
    const formId = query['form-id'] as string;
    return <div>{formId}</div>;
}
