export function removeSpecialCharacters(value: string): string {
  return value.replace(/[^\w\s]/gi, '');
}
