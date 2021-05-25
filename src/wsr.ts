
export function wsr(str: string): string {
    if (!str) return str;
    return str.replace(/(?<!vs)[\s](?!vs)/g, '').replace(/[\/\']/, '').toLowerCase();
}
