const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  wallet:
    '<path d="M20 8V5a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v11H6a3 3 0 0 1-3-3V6"/><path d="M21 12h-5v5h5z"/><path d="M17 14.5h.01"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checklist:
    '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 8 1 1 2-2m-3 8 1 1 2-2m3-6h3m-3 7h3"/>',
  store:
    '<path d="M3 9h18l-2-6H5L3 9Zm0 0v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9M5 14v7h14v-7m-9 7v-6h4v6"/>',
  settings:
    '<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3H9Z"/><circle cx="12" cy="11" r="3"/>',
  heart:
    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  arrowUp: '<path d="M7 17 17 7M7 7h10v10"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-12 9a3 3 0 0 0 6 0"/>',
  flower:
    '<path d="M12 9c-6-10-12-1-5 3-10 6-1 12 3 5 6 10 12 1 5-3 10-6 1-12-3-5Z"/><circle cx="11" cy="13" r="2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  edit: '<path d="m16 3 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 7Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3m-10 0 1 15h12l1-15M10 10v7m4-7v7"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sparkles:
    '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Zm8-1v4m-2-2h4"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  coins:
    '<ellipse cx="9" cy="6" rx="6" ry="3"/><path d="M3 6v5c0 4 12 4 12 0V6M3 11v5c0 4 12 4 12 0v-5m0-3c8-1 8 5 0 6m6-3v5c0 3-5 4-8 3"/>',
  external: '<path d="M15 3h6v6m0-6L10 14M9 3H3v18h18v-6"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',
};

export function icon(name, className = "") {
  return `<svg class="icon ${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.heart}</svg>`;
}

export const logo =
  '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><ellipse cx="18" cy="27" rx="11" ry="14" transform="rotate(-26 18 27)" stroke="currentColor" stroke-width="2.2"/><ellipse cx="30" cy="27" rx="11" ry="14" transform="rotate(26 30 27)" stroke="currentColor" stroke-width="2.2"/><path d="m24 3 1.8 5.2L31 10l-5.2 1.8L24 17l-1.8-5.2L17 10l5.2-1.8L24 3Z" fill="currentColor" stroke="none"/></svg>';
