/**
 * Track Event Listeners Utility
 *
 * Patches the native browser event handling system to track event listeners on
 * DOM elements. This utility modifies the standard `addEventListener` and
 * `removeEventListener` methods to maintain a record of which events are
 * attached to each element, storing this information as a custom attribute.
 *
 * The tracking works by:
 * 1. Storing event names in a JSON array in a custom attribute on the element
 * 2. Event names are stored in the format "event-listener::${eventType.toLowerCase()}"
 * 3. The attribute is automatically updated when events are added or removed
 * 4. The attribute is removed entirely when no events remain
 *
 * This function is injected into the browser context via addInitScript().
 *
 * @param attributeName - The name of the data attribute to store event info
 */
export function trackEventListeners(attributeName: string): void {
  const addEventListener = EventTarget.prototype.addEventListener;
  const removeEventListener = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    if (this instanceof Element) {
      const currentEvents = this.getAttribute(attributeName);
      const events: string[] = currentEvents
        ? (JSON.parse(currentEvents) as string[])
        : [];
      const eventName = `event-listener::${type.toLowerCase()}`;
      if (!events.includes(eventName)) {
        events.push(eventName);
        this.setAttribute(attributeName, JSON.stringify(events));
      }
    }
    addEventListener.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) {
    if (this instanceof Element) {
      const currentEvents = this.getAttribute(attributeName);
      if (currentEvents) {
        const events: string[] = JSON.parse(currentEvents) as string[];
        const eventName = `event-listener::${type.toLowerCase()}`;
        const updatedEvents = events.filter(
          (event: string) => event !== eventName
        );
        if (updatedEvents.length === 0) {
          this.removeAttribute(attributeName);
        } else {
          this.setAttribute(attributeName, JSON.stringify(updatedEvents));
        }
      }
    }
    removeEventListener.call(this, type, listener, options);
  };
}
