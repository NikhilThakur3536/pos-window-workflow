export const generateBreadcrumbs = (path: string): { label: string; href: string }[] => {
    if (path.startsWith('file:') || path.includes('.html')) {
        return [];
    }

    const segments = path.split('/').filter(Boolean);
    let href = '';

    return segments.map((seg) => {
        href += `/${seg}`;
        return {
            label: decodeURIComponent(seg).replace(/-/g, ' '),
            href,
        };
    });
};
