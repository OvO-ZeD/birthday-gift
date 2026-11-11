/**
 * The gallery tiles and the photo viewer talk through one small browser event, so the viewer can
 * live once at the top of the page (outside every tile) instead of inside each one.
 */
export const OPEN_PHOTO_EVENT = "afterglow:open-photo";

export function openPhoto(src: string) {
  window.dispatchEvent(new CustomEvent(OPEN_PHOTO_EVENT, { detail: { src } }));
}
