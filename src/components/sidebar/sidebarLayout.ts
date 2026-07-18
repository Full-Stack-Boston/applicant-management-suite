/** Shared sidebar layout timing — keep Sidebar + AdminLayout in sync. */

export const SIDEBAR_WIDTH_COLLAPSED = 45;
export const SIDEBAR_WIDTH_EXPANDED = 180;
export const SIDEBAR_DURATION_MS = 280;
export const SIDEBAR_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

export const SIDEBAR_WIDTH_TRANSITION = `width ${SIDEBAR_DURATION_MS}ms ${SIDEBAR_EASING}`;
export const SIDEBAR_LAYOUT_TRANSITION = `${SIDEBAR_WIDTH_TRANSITION}, margin-left ${SIDEBAR_DURATION_MS}ms ${SIDEBAR_EASING}, max-width ${SIDEBAR_DURATION_MS}ms ${SIDEBAR_EASING}`;
export const SIDEBAR_FADE_TRANSITION = `opacity 180ms ${SIDEBAR_EASING}`;
