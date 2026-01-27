import { describe, it, expect } from "bun:test";
import {
  ARIA_ROLE_MAP,
  ElementAction,
  ELEMENTS,
  getAriaRoleInfo,
  getDefaultActionsForRole,
  getBaseScoreForRole,
  isRoleInteractive,
  getInteractiveRoles,
  isTagImplicitForRole,
  calculateRoleBasedScore,
  getImplicitRoleForTag,
  isSupportedAriaRole,
  type AriaRole,
  type AriaRoleInfo,
  // New element classes
  PasswordInputElement,
  NumberInputElement,
  DateInputElement,
  FileInputElement,
  RangeInputElement,
  ColorInputElement,
} from "./index.js";

describe("Element Types", () => {
  describe("ARIA Role Mappings", () => {
    it("has comprehensive ARIA role mappings (50+ roles)", () => {
      expect(Object.keys(ARIA_ROLE_MAP).length).toBeGreaterThan(50);
    });

    it("has button role defined", () => {
      expect(ARIA_ROLE_MAP["button"]).toBeDefined();
    });

    it("has textbox role defined", () => {
      expect(ARIA_ROLE_MAP["textbox"]).toBeDefined();
    });

    it("button role has correct properties", () => {
      const buttonInfo = ARIA_ROLE_MAP["button"];
      expect(buttonInfo).toBeDefined();
      expect(buttonInfo!.defaultActions).toContain(ElementAction.CLICK);
      expect(buttonInfo!.implicitTags).toContain("button");
      expect(buttonInfo!.isInteractive).toBe(true);
      expect(buttonInfo!.baseScore).toBeGreaterThan(0);
      expect(buttonInfo!.description).toBeDefined();
    });

    it("textbox role has correct properties", () => {
      const textboxInfo = ARIA_ROLE_MAP["textbox"];
      expect(textboxInfo).toBeDefined();
      expect(textboxInfo!.defaultActions).toContain(ElementAction.FILL);
      expect(textboxInfo!.defaultActions).toContain(ElementAction.TYPE);
      expect(textboxInfo!.implicitTags).toContain("input");
      expect(textboxInfo!.implicitTags).toContain("textarea");
      expect(textboxInfo!.isInteractive).toBe(true);
    });
  });

  describe("Element Actions", () => {
    it("defines CLICK action", () => {
      expect(ElementAction.CLICK).toBeDefined();
      expect(ElementAction.CLICK).toBe("click");
    });

    it("defines TYPE action", () => {
      expect(ElementAction.TYPE).toBeDefined();
      expect(ElementAction.TYPE).toBe("type");
    });

    it("defines FILL action", () => {
      expect(ElementAction.FILL).toBeDefined();
      expect(ElementAction.FILL).toBe("fill");
    });

    it("defines all basic interaction actions", () => {
      expect(ElementAction.HOVER).toBeDefined();
      expect(ElementAction.FOCUS).toBeDefined();
      expect(ElementAction.BLUR).toBeDefined();
    });

    it("defines selection actions", () => {
      expect(ElementAction.CHECK).toBeDefined();
      expect(ElementAction.UNCHECK).toBeDefined();
      expect(ElementAction.TOGGLE).toBeDefined();
      expect(ElementAction.SELECT_OPTION).toBeDefined();
    });

    it("defines form actions", () => {
      expect(ElementAction.SUBMIT).toBeDefined();
      expect(ElementAction.RESET).toBeDefined();
    });
  });

  describe("Element Classes Array", () => {
    it("exports ELEMENTS array with 14 element types", () => {
      expect(Array.isArray(ELEMENTS)).toBe(true);
      expect(ELEMENTS.length).toBe(14);
    });

    it("has all elements sorted by priority (lowest first)", () => {
      let previousPriority = 0;
      for (const ElementClass of ELEMENTS) {
        expect(ElementClass.priority).toBeGreaterThanOrEqual(previousPriority);
        previousPriority = ElementClass.priority;
      }
    });

    it("each element class has required static properties", () => {
      for (const ElementClass of ELEMENTS) {
        expect(ElementClass.cssSelectors).toBeDefined();
        expect(Array.isArray(ElementClass.cssSelectors)).toBe(true);
        expect(ElementClass.cssSelectors.length).toBeGreaterThan(0);
        expect(typeof ElementClass.priority).toBe("number");
        expect(typeof ElementClass.description).toBe("string");
      }
    });
  });

  describe("New Element Classes", () => {
    describe("PasswordInputElement", () => {
      it("has correct static properties", () => {
        expect(PasswordInputElement.cssSelectors).toContain(
          'input[type="password"]:not([disabled]):not([readonly])',
        );
        expect(PasswordInputElement.priority).toBe(4);
        expect(PasswordInputElement.description).toBe(
          "Password input field for secure text entry",
        );
      });
    });

    describe("NumberInputElement", () => {
      it("has correct static properties", () => {
        expect(PasswordInputElement.cssSelectors.length).toBeGreaterThan(0);
        expect(NumberInputElement.priority).toBe(3);
        expect(NumberInputElement.description).toContain("Numeric input");
      });
    });

    describe("DateInputElement", () => {
      it("has correct static properties", () => {
        expect(DateInputElement.cssSelectors.length).toBeGreaterThan(0);
        expect(DateInputElement.priority).toBe(3);
        expect(DateInputElement.description).toContain("Date/time");
      });
    });

    describe("FileInputElement", () => {
      it("has correct static properties", () => {
        expect(FileInputElement.cssSelectors).toContain(
          'input[type="file"]:not([disabled])',
        );
        expect(FileInputElement.priority).toBe(2);
        expect(FileInputElement.description).toContain("File upload");
      });
    });

    describe("RangeInputElement", () => {
      it("has correct static properties", () => {
        expect(RangeInputElement.cssSelectors.length).toBeGreaterThan(0);
        expect(RangeInputElement.priority).toBe(2);
        expect(RangeInputElement.description).toContain("Range slider");
      });
    });

    describe("ColorInputElement", () => {
      it("has correct static properties", () => {
        expect(ColorInputElement.cssSelectors).toContain(
          'input[type="color"]:not([disabled])',
        );
        expect(ColorInputElement.priority).toBe(2);
        expect(ColorInputElement.description).toContain("Color picker");
      });
    });
  });

  describe("ARIA Helper Functions", () => {
    describe("isSupportedAriaRole", () => {
      it("returns true for supported roles", () => {
        expect(isSupportedAriaRole("button")).toBe(true);
        expect(isSupportedAriaRole("textbox")).toBe(true);
        expect(isSupportedAriaRole("checkbox")).toBe(true);
      });

      it("returns false for unsupported roles", () => {
        expect(isSupportedAriaRole("nonexistent")).toBe(false);
        expect(isSupportedAriaRole("")).toBe(false);
      });
    });

    describe("getAriaRoleInfo", () => {
      it("returns role info for valid roles", () => {
        const info = getAriaRoleInfo("button");
        expect(info).toBeDefined();
        expect(info!.defaultActions).toBeDefined();
        expect(info!.isInteractive).toBe(true);
      });

      it("returns undefined for invalid roles", () => {
        expect(getAriaRoleInfo("nonexistent")).toBeUndefined();
      });
    });

    describe("getDefaultActionsForRole", () => {
      it("returns actions for valid roles", () => {
        const actions = getDefaultActionsForRole("button");
        expect(actions.length).toBeGreaterThan(0);
        expect(actions).toContain(ElementAction.CLICK);
      });

      it("returns empty array for invalid roles", () => {
        const actions = getDefaultActionsForRole("nonexistent");
        expect(actions).toEqual([]);
      });
    });

    describe("getBaseScoreForRole", () => {
      it("returns score for valid roles", () => {
        const score = getBaseScoreForRole("button");
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      it("returns 0 for invalid roles", () => {
        expect(getBaseScoreForRole("nonexistent")).toBe(0);
      });
    });

    describe("isRoleInteractive", () => {
      it("returns true for interactive roles", () => {
        expect(isRoleInteractive("button")).toBe(true);
        expect(isRoleInteractive("textbox")).toBe(true);
        expect(isRoleInteractive("checkbox")).toBe(true);
      });

      it("returns false for non-interactive roles", () => {
        expect(isRoleInteractive("separator")).toBe(false);
        expect(isRoleInteractive("presentation")).toBe(false);
      });

      it("returns false for invalid roles", () => {
        expect(isRoleInteractive("nonexistent")).toBe(false);
      });
    });

    describe("getInteractiveRoles", () => {
      it("returns array of interactive roles", () => {
        const roles = getInteractiveRoles();
        expect(Array.isArray(roles)).toBe(true);
        expect(roles.length).toBeGreaterThan(10);
        expect(roles).toContain("button");
        expect(roles).toContain("textbox");
      });
    });

    describe("isTagImplicitForRole", () => {
      it("returns true when tag matches role", () => {
        expect(isTagImplicitForRole("button", "button")).toBe(true);
        expect(isTagImplicitForRole("a", "link")).toBe(true);
        expect(isTagImplicitForRole("input", "textbox")).toBe(true);
      });

      it("returns false when tag does not match role", () => {
        expect(isTagImplicitForRole("div", "button")).toBe(false);
        expect(isTagImplicitForRole("span", "textbox")).toBe(false);
      });
    });

    describe("calculateRoleBasedScore", () => {
      it("returns base score for role", () => {
        const score = calculateRoleBasedScore("button", "div");
        expect(score).toBeGreaterThan(0);
      });

      it("boosts score when tag is implicit for role", () => {
        const scoreWithImplicit = calculateRoleBasedScore("button", "button");
        const scoreWithoutImplicit = calculateRoleBasedScore("button", "div");
        expect(scoreWithImplicit).toBeGreaterThan(scoreWithoutImplicit);
      });

      it("applies additional factor bonuses", () => {
        const baseScore = calculateRoleBasedScore("button", "div");
        const scoreWithFactors = calculateRoleBasedScore("button", "div", {
          hasTabindex: true,
          hasAriaLabel: true,
        });
        expect(scoreWithFactors).toBeGreaterThan(baseScore);
      });

      it("caps score at 95", () => {
        const score = calculateRoleBasedScore("button", "button", {
          hasTabindex: true,
          hasAriaLabel: true,
          hasMatchingClasses: true,
        });
        expect(score).toBeLessThanOrEqual(95);
      });

      it("returns 0 for invalid roles", () => {
        expect(calculateRoleBasedScore("nonexistent", "div")).toBe(0);
      });
    });

    describe("getImplicitRoleForTag", () => {
      it("returns button role for button tag", () => {
        expect(getImplicitRoleForTag("button")).toBe("button");
      });

      it("returns link role for anchor tag", () => {
        expect(getImplicitRoleForTag("a")).toBe("link");
      });

      it("returns textbox role for textarea", () => {
        expect(getImplicitRoleForTag("textarea")).toBe("textbox");
      });

      it("returns correct role for input types", () => {
        expect(getImplicitRoleForTag("input", "text")).toBe("textbox");
        expect(getImplicitRoleForTag("input", "checkbox")).toBe("checkbox");
        expect(getImplicitRoleForTag("input", "radio")).toBe("radio");
        expect(getImplicitRoleForTag("input", "range")).toBe("slider");
        expect(getImplicitRoleForTag("input", "button")).toBe("button");
        expect(getImplicitRoleForTag("input", "submit")).toBe("button");
      });

      it("returns textbox for input without type", () => {
        expect(getImplicitRoleForTag("input")).toBe("textbox");
      });

      it("returns undefined for tags without implicit role", () => {
        expect(getImplicitRoleForTag("div")).toBeUndefined();
        expect(getImplicitRoleForTag("span")).toBeUndefined();
      });

      it("returns undefined for input types without implicit role", () => {
        expect(getImplicitRoleForTag("input", "hidden")).toBeUndefined();
        expect(getImplicitRoleForTag("input", "file")).toBeUndefined();
      });
    });
  });
});
