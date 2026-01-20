/**
 * VibeTesting CLI - Test Namer
 *
 * Generates semantic, readable test names.
 * Pattern: 'should [action] when [scenario]'
 *
 * @license MIT
 */

import type { AnalyzedFlow, IntentType } from '../analysis/types.js';
import type { TestVariation, VariationCategory } from './types.js';

/**
 * Intent-specific action verbs.
 */
const INTENT_ACTIONS: Record<IntentType, string> = {
  form_submission: 'submit form',
  search: 'search',
  navigation: 'navigate',
  authentication: 'authenticate',
  checkout: 'complete checkout',
  filter: 'apply filter',
  sort: 'sort results',
  pagination: 'navigate pages',
  file_upload: 'upload file',
  data_entry: 'enter data',
  selection: 'select item',
  modal_interaction: 'interact with modal',
  menu_navigation: 'navigate menu',
  unknown: 'complete flow',
};

/**
 * Category-specific scenario prefixes.
 */
const CATEGORY_SCENARIOS: Record<VariationCategory, string[]> = {
  happy_path: [
    'all fields are valid',
    'all data is correct',
    'form is complete',
    'user provides valid input',
  ],
  validation: [
    'field is empty',
    'email format is invalid',
    'input exceeds limit',
    'required field is missing',
    'format is incorrect',
  ],
  error_handling: [
    'server returns error',
    'network times out',
    'request is rate limited',
    'service is unavailable',
  ],
  edge_case: [
    'form is submitted twice',
    'user presses back button',
    'page is refreshed',
    'input is very long',
    'input contains unicode',
  ],
  security: [
    'input contains SQL injection',
    'input contains XSS attempt',
    'input has special characters',
  ],
  accessibility: [
    'using keyboard navigation',
    'using screen reader',
  ],
  performance: [
    'under load',
    'with slow network',
  ],
};

/**
 * TestNamer generates semantic test names following the pattern:
 * "should [action] when [scenario]"
 *
 * @example
 * ```typescript
 * const namer = new TestNamer();
 * const variation = namer.applyNaming(testVariation, flow);
 * console.log(variation.name); // "should submit form when all fields are valid"
 * ```
 */
export class TestNamer {
  /**
   * Applies semantic naming to a test variation.
   *
   * @param variation - Test variation to name
   * @param flow - Source analyzed flow
   * @returns Updated variation with semantic name
   */
  applyNaming(variation: TestVariation, flow: AnalyzedFlow): TestVariation {
    const name = this.generateName(variation, flow);
    return { ...variation, name };
  }

  /**
   * Generates a semantic test name.
   */
  private generateName(variation: TestVariation, flow: AnalyzedFlow): string {
    const action = this.getAction(variation, flow);
    const scenario = this.getScenario(variation, flow);

    // Pattern: should [action] when [scenario]
    return `should ${action} when ${scenario}`;
  }

  /**
   * Gets the action verb based on flow intent and variation.
   */
  private getAction(variation: TestVariation, flow: AnalyzedFlow): string {
    // For validation/error tests, use negative action
    if (variation.category === 'validation') {
      return 'show validation error';
    }

    if (variation.category === 'error_handling') {
      return 'handle error gracefully';
    }

    if (variation.category === 'security') {
      return 'prevent malicious input';
    }

    // For happy path and edge cases, use intent-based action
    const baseAction = INTENT_ACTIONS[flow.intent.type] || 'complete flow';

    // Modify for success scenarios
    if (variation.category === 'happy_path') {
      return `successfully ${baseAction}`;
    }

    return baseAction;
  }

  /**
   * Gets the scenario description based on variation details.
   */
  private getScenario(variation: TestVariation, _flow: AnalyzedFlow): string {
    // Use validation rule details if available
    if (variation.validationRule) {
      return this.getValidationScenario(variation);
    }

    // Use error scenario details if available
    if (variation.errorScenario) {
      return this.getErrorScenario(variation);
    }

    // Use variation description or category-based scenario
    if (variation.description && variation.description.length < 50) {
      return this.extractScenarioFromDescription(variation.description);
    }

    // Fall back to category-based scenarios
    return this.getCategoryScenario(variation);
  }

  /**
   * Gets scenario text from a validation rule.
   */
  private getValidationScenario(variation: TestVariation): string {
    const rule = variation.validationRule!;
    const fieldName = rule.fieldName || 'field';

    switch (rule.constraint) {
      case 'required':
        return `${fieldName} is empty`;
      case 'email':
        return `${fieldName} has invalid email format`;
      case 'phone':
        return `${fieldName} has invalid phone format`;
      case 'min_length':
        return `${fieldName} is too short`;
      case 'max_length':
        return `${fieldName} is too long`;
      case 'min_value':
        return `${fieldName} is below minimum`;
      case 'max_value':
        return `${fieldName} exceeds maximum`;
      case 'pattern':
        return `${fieldName} does not match required pattern`;
      case 'url':
        return `${fieldName} has invalid URL format`;
      case 'number':
        return `${fieldName} is not a valid number`;
      case 'date':
        return `${fieldName} has invalid date format`;
      default:
        return `${fieldName} validation fails`;
    }
  }

  /**
   * Gets scenario text from an error scenario.
   */
  private getErrorScenario(variation: TestVariation): string {
    const scenario = variation.errorScenario!;

    switch (scenario.type) {
      case 'server_error':
        return `server returns ${scenario.statusCode || 500} error`;
      case 'network_timeout':
        return 'request times out';
      case 'rate_limit':
        return 'request is rate limited';
      case 'authentication_error':
        return 'credentials are invalid';
      case 'validation_error':
        return 'input validation fails';
      case 'conflict':
        return 'resource conflict occurs';
      case 'client_error':
        return `server returns ${scenario.statusCode || 400} error`;
      default:
        return 'an error occurs';
    }
  }

  /**
   * Extracts a scenario from the variation description.
   */
  private extractScenarioFromDescription(description: string): string {
    // Remove common prefixes
    let scenario = description
      .replace(/^Verifies\s+/i, '')
      .replace(/^Tests?\s+/i, '')
      .replace(/^that\s+/i, '')
      .replace(/^the\s+/i, '');

    // Convert to lowercase and clean up
    scenario = scenario.charAt(0).toLowerCase() + scenario.slice(1);

    // Remove trailing punctuation
    scenario = scenario.replace(/[.!]$/, '');

    return scenario;
  }

  /**
   * Gets a generic scenario based on category.
   */
  private getCategoryScenario(variation: TestVariation): string {
    const scenarios = CATEGORY_SCENARIOS[variation.category];
    if (scenarios && scenarios.length > 0) {
      // Try to pick based on variation ID or use first
      const index = Math.abs(this.hashString(variation.id)) % scenarios.length;
      return scenarios[index]!;
    }

    return 'conditions are met';
  }

  /**
   * Simple string hash for deterministic selection.
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Generates a test suite name from a flow.
   */
  generateSuiteName(flow: AnalyzedFlow): string {
    const intentName = flow.intent.type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    if (flow.name && flow.name !== intentName) {
      return `${flow.name} - ${intentName}`;
    }

    return `${intentName} Tests`;
  }

  /**
   * Generates a test file name from a flow.
   */
  generateFileName(flow: AnalyzedFlow): string {
    const baseName = flow.intent.type.replace(/_/g, '-');
    const suffix = flow.id.split('_').pop() || Date.now().toString(36);
    return `${baseName}-${suffix}.spec.ts`;
  }
}
