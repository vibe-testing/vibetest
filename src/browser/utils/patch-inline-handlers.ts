/**
 * Patch Inline Handlers Utility
 *
 * Patches all inline event handler properties (`on*`) on HTMLElement and
 * Element prototypes to track them in the same attribute system used by
 * `trackEventListeners`.
 *
 * This utility modifies the property setters for inline event handlers to
 * automatically update a custom attribute on the element whenever an inline
 * handler is assigned. The tracking works by:
 * 1. Storing event names in a JSON array in a custom attribute on the element
 * 2. Event names are stored in the format "inline::${eventType}" (e.g., "inline::onclick")
 * 3. The attribute is automatically updated when handlers are assigned
 * 4. Also scans existing HTML attributes at initialization time
 *
 * This function is injected into the browser context via addInitScript().
 *
 * @param attributeName - The name of the attribute to use for tracking
 */
export function patchInlineHandlers(attributeName: string): void {
  const eventProps = [
    "onclick",
    "ondblclick",
    "onmousedown",
    "onmouseup",
    "onmouseover",
    "onmouseout",
    "onmouseenter",
    "onmouseleave",
    "onmousemove",
    "onkeydown",
    "onkeyup",
    "onkeypress",
    "onfocus",
    "onblur",
    "oninput",
    "onchange",
    "onsubmit",
    "onreset",
    "onselect",
    "oncontextmenu",
    "ondrag",
    "ondrop",
    "ondragstart",
    "ondragend",
    "ondragenter",
    "ondragleave",
    "ondragover",
    "onwheel",
    "oncopy",
    "oncut",
    "onpaste",
    "ontouchstart",
    "ontouchend",
    "ontouchmove",
    "ontouchcancel",
    "onpointerdown",
    "onpointerup",
    "onpointerover",
    "onpointerout",
    "onpointermove",
    "onpointercancel",
    "ontransitionend",
    "onanimationstart",
    "onanimationend",
    "onanimationiteration",
    "onerror",
    "onabort",
    "onload",
    "onunload",
    "onresize",
    "onscroll",
    "onbeforeunload",
  ];

  /**
   * Helper function to add an inline handler to the element's tracking attribute
   */
  function addInlineHandler(el: Element, prop: string): void {
    const currentEvents = el.getAttribute(attributeName);
    const events: string[] = currentEvents
      ? (JSON.parse(currentEvents) as string[])
      : [];
    const eventName = `inline::${prop}`;
    if (!events.includes(eventName)) {
      events.push(eventName);
      el.setAttribute(attributeName, JSON.stringify(events));
    }
  }

  // Patch the property setters on both HTMLElement and Element prototypes
  [HTMLElement.prototype, Element.prototype].forEach((proto) => {
    eventProps.forEach((prop) => {
      const desc = Object.getOwnPropertyDescriptor(proto, prop);
      if (desc && desc.set) {
        Object.defineProperty(proto, prop, {
          ...desc,
          set: function (this: Element, fn: unknown, ...args: unknown[]) {
            // When a function is assigned, track it in the attribute
            if (typeof fn === "function") {
              addInlineHandler(this, prop);
            }
            // Call the original setter
            desc.set!.call(this, fn, ...args);
          },
          configurable: true,
        });
      }
    });
  });

  // Scan existing elements for inline handlers defined in HTML attributes
  const all = Array.from(document.querySelectorAll("*"));
  for (const el of all) {
    for (const prop of eventProps) {
      if (el.hasAttribute && el.hasAttribute(prop)) {
        addInlineHandler(el, prop);
      }
    }
  }
}
