/**
 * FileInputElement - Represents file upload input fields.
 *
 * Handles input type="file" for file selection and upload.
 */

import { AbstractElement } from "./abstract.element.js";
import { ElementAction } from "./actions.js";

export class FileInputElement extends AbstractElement {
  static readonly cssSelectors = ['input[type="file"]:not([disabled])'];
  static readonly priority = 2;
  static readonly description = "File upload input field";

  getDefaultActions(): ElementAction[] {
    return [ElementAction.SET_FILES, ElementAction.FOCUS, ElementAction.BLUR];
  }

  async getConfidenceScore(): Promise<number> {
    const props = await this.elementHandle.evaluate((el) => {
      const tagName = el.tagName.toLowerCase();
      const type = (el as HTMLInputElement).type || "";
      return { tagName, type };
    });

    if (props.tagName === "input" && props.type === "file") {
      return 100;
    }
    return 0;
  }

  async setFiles(filePaths: string[]): Promise<void> {
    return this.elementHandle.setInputFiles(filePaths);
  }

  async getAcceptedTypes(): Promise<string | null> {
    try {
      return await this.elementHandle.getAttribute("accept");
    } catch {
      return null;
    }
  }

  async isMultiple(): Promise<boolean> {
    try {
      const hasMultiple = await this.elementHandle.evaluate((el) =>
        el.hasAttribute("multiple"),
      );
      return hasMultiple;
    } catch {
      return false;
    }
  }

  async getFiles(): Promise<string[]> {
    try {
      return await this.elementHandle.evaluate((el) => {
        const input = el as HTMLInputElement;
        if (!input.files) {
          return [];
        }
        return Array.from(input.files).map((file) => file.name);
      });
    } catch {
      return [];
    }
  }
}
