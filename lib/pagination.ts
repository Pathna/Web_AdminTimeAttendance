export function getVisiblePageNumbers(
  activePage: number,
  totalPages: number,
  maxVisiblePages = 5,
) {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(maxVisiblePages / 2);
  const lastStartPage = totalPages - maxVisiblePages + 1;
  const startPage = Math.max(
    1,
    Math.min(activePage - halfWindow, lastStartPage),
  );

  return Array.from({ length: maxVisiblePages }, (_, index) => startPage + index);
}
