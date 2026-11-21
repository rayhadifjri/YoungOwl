/**
 * Lab mode: this copy of Young Owl is the deliberately vulnerable target (see docs/lab-mode.md).
 * Read at request time on the server, so the same image works in both modes.
 */
export function isLabMode() {
  return process.env.VULN_MODE === 'true';
}
