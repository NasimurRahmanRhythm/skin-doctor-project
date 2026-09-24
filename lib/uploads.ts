/**
 * The hard ceiling for anything that reaches the patient-files bucket.
 *
 * Lives on its own rather than in compress-image.ts because the server actions
 * need it too, and that module touches canvas and document.
 *
 * The limit is checked against the file as the desk picked it, before any
 * compression. A rule staff can state out loud -- nothing over 10 MB -- is
 * worth more at a busy counter than one that depends on how well a particular
 * photo happens to compress.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const MAX_UPLOAD_LABEL = "10 MB";
