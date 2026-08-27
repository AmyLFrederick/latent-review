// The copy buttons — ONE implementation, for every surface that has one.
//
// WHY IT LEFT THE COMPONENT IT WAS WRITTEN IN. This was an inline script in
// src/components/DoorBoxes.astro, which was fine while the door was the only
// place anything was copyable. Prompts now hands a chat AI a question the same
// way the door hands it a brief, and a second copy of this loop would be a
// second set of failure messages, a second timeout, and a second chance for one
// of them to stop telling the truth about a refused clipboard.
//
// SCOPED BY ROOT SELECTOR, WHICH IS NOT DECORATION. Both callers run on /door:
// DoorBoxes wires the address button in box 1, PasteBlock wires its own. A
// document-wide `button[data-copy]` in each would bind every button twice, so a
// single click would write the clipboard twice and race two "Copied" resets
// against each other.

/**
 * Wire every copy button inside `root` (a CSS selector for the owning block).
 *
 * Every copyable string is also rendered as visible, selectable text, so this
 * is a convenience and never the only way through: with JavaScript off the page
 * still works by hand.
 */
export function wireCopyButtons(root) {
  for (const button of document.querySelectorAll(`${root} button[data-copy]`)) {
    button.addEventListener('click', async () => {
      const text = button.getAttribute('data-copy') ?? '';
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = 'Copied';
      } catch {
        // Clipboard access can be refused, and saying so is better than a
        // button that looks like it worked.
        button.textContent = 'Copy failed — select it by hand';
      }
      setTimeout(() => {
        button.textContent = original;
      }, 2500);
    });
  }
}
