/**
 * VibeTesting CLI - Validation Extractor
 *
 * Extracts validation rules from form interactions.
 * Identifies required fields, format constraints, and input rules.
 *
 * @license MIT
 */

import type { RecordedEvent } from '../recording/types.js';
import type { ValidationRule } from './types.js';

/**
 * Creates a validation rule, only including optional properties that are defined.
 */
function createValidationRule(
  fieldSelector: string,
  constraint: ValidationRule['constraint'],
  confidence: number,
  fieldName: string | undefined,
  value?: string | number,
  errorMessage?: string
): ValidationRule {
  const rule: ValidationRule = {
    fieldSelector,
    constraint,
    confidence,
  };
  if (fieldName) rule.fieldName = fieldName;
  if (value !== undefined) rule.value = value;
  if (errorMessage) rule.errorMessage = errorMessage;
  return rule;
}

/**
 * Extracts validation rules from recorded form interactions.
 */
export class ValidationExtractor {
  /**
   * Extracts validation rules from a sequence of events.
   *
   * @param events - Recorded events to analyze
   * @returns Array of validation rules
   */
  extractValidations(events: RecordedEvent[]): ValidationRule[] {
    const validations: ValidationRule[] = [];
    const seenFields = new Set<string>();

    for (const event of events) {
      if (!['input', 'change', 'blur', 'focus'].includes(event.type)) {
        continue;
      }

      const fieldKey = event.selector;
      if (seenFields.has(fieldKey)) continue;
      seenFields.add(fieldKey);

      const fieldValidations = this.extractFieldValidations(event);
      validations.push(...fieldValidations);
    }

    return this.deduplicateValidations(validations);
  }

  /**
   * Extracts validations for a single field from its attributes.
   */
  private extractFieldValidations(event: RecordedEvent): ValidationRule[] {
    const validations: ValidationRule[] = [];
    const attrs = event.attributes || {};
    const fieldName = attrs['name'] as string | undefined;

    // Required field
    if (attrs['required'] === 'true' || attrs['required'] === '') {
      validations.push(createValidationRule(event.selector, 'required', 0.95, fieldName));
    }

    // Email validation
    if (attrs['type'] === 'email' || this.looksLikeEmailField(event)) {
      validations.push(createValidationRule(
        event.selector,
        'email',
        attrs['type'] === 'email' ? 0.95 : 0.7,
        fieldName
      ));
    }

    // URL validation
    if (attrs['type'] === 'url') {
      validations.push(createValidationRule(event.selector, 'url', 0.95, fieldName));
    }

    // Phone validation
    if (attrs['type'] === 'tel' || this.looksLikePhoneField(event)) {
      validations.push(createValidationRule(
        event.selector,
        'phone',
        attrs['type'] === 'tel' ? 0.9 : 0.7,
        fieldName
      ));
    }

    // Number validation
    if (attrs['type'] === 'number') {
      validations.push(createValidationRule(event.selector, 'number', 0.95, fieldName));
    }

    // Min length
    const minLength = attrs['minlength'] || attrs['minLength'];
    if (minLength) {
      const parsedMinLength = parseInt(minLength as string, 10);
      if (!isNaN(parsedMinLength)) {
        validations.push(createValidationRule(
          event.selector,
          'min_length',
          0.95,
          fieldName,
          parsedMinLength
        ));
      }
    }

    // Max length
    const maxLength = attrs['maxlength'] || attrs['maxLength'];
    if (maxLength) {
      const parsedMaxLength = parseInt(maxLength as string, 10);
      if (!isNaN(parsedMaxLength)) {
        validations.push(createValidationRule(
          event.selector,
          'max_length',
          0.95,
          fieldName,
          parsedMaxLength
        ));
      }
    }

    // Min value (for number inputs)
    if (attrs['min'] !== undefined) {
      const parsedMin = parseFloat(attrs['min'] as string);
      if (!isNaN(parsedMin)) {
        validations.push(createValidationRule(
          event.selector,
          'min_value',
          0.95,
          fieldName,
          parsedMin
        ));
      }
    }

    // Max value (for number inputs)
    if (attrs['max'] !== undefined) {
      const parsedMax = parseFloat(attrs['max'] as string);
      if (!isNaN(parsedMax)) {
        validations.push(createValidationRule(
          event.selector,
          'max_value',
          0.95,
          fieldName,
          parsedMax
        ));
      }
    }

    // Pattern validation
    if (attrs['pattern']) {
      validations.push(createValidationRule(
        event.selector,
        'pattern',
        0.95,
        fieldName,
        attrs['pattern'] as string
      ));
    }

    // Date validation
    if (attrs['type'] === 'date' || attrs['type'] === 'datetime-local') {
      validations.push(createValidationRule(event.selector, 'date', 0.95, fieldName));
    }

    // Time validation
    if (attrs['type'] === 'time') {
      validations.push(createValidationRule(event.selector, 'time', 0.95, fieldName));
    }

    // File type validation
    if (attrs['type'] === 'file' && attrs['accept']) {
      validations.push(createValidationRule(
        event.selector,
        'file_type',
        0.95,
        fieldName,
        attrs['accept'] as string
      ));
    }

    // Infer validations from field name/placeholder
    validations.push(...this.inferValidationsFromContext(event));

    return validations;
  }

  /**
   * Infers validation rules from field naming and context.
   */
  private inferValidationsFromContext(event: RecordedEvent): ValidationRule[] {
    const validations: ValidationRule[] = [];
    const name = ((event.attributes?.['name'] || '') as string).toLowerCase();
    const placeholder = ((event.attributes?.['placeholder'] || '') as string).toLowerCase();
    const fieldName = event.attributes?.['name'] as string | undefined;

    // Infer required from naming
    if (
      name.endsWith('*') ||
      placeholder.includes('required') ||
      placeholder.endsWith('*')
    ) {
      validations.push(createValidationRule(event.selector, 'required', 0.6, fieldName));
    }

    // Infer password constraints
    if (event.attributes?.['type'] === 'password') {
      // Common password requirements
      validations.push(createValidationRule(
        event.selector,
        'min_length',
        0.5,
        fieldName,
        8,
        'Password must be at least 8 characters'
      ));
    }

    // Infer zip/postal code
    if (name.includes('zip') || name.includes('postal')) {
      validations.push(createValidationRule(
        event.selector,
        'pattern',
        0.5,
        fieldName,
        '^\\d{5}(-\\d{4})?$' // US ZIP format
      ));
    }

    return validations;
  }

  /**
   * Checks if a field looks like an email field based on naming.
   */
  private looksLikeEmailField(event: RecordedEvent): boolean {
    const name = ((event.attributes?.['name'] || '') as string).toLowerCase();
    const placeholder = ((event.attributes?.['placeholder'] || '') as string).toLowerCase();
    return (
      name.includes('email') ||
      placeholder.includes('email') ||
      placeholder.includes('@')
    );
  }

  /**
   * Checks if a field looks like a phone field based on naming.
   */
  private looksLikePhoneField(event: RecordedEvent): boolean {
    const name = ((event.attributes?.['name'] || '') as string).toLowerCase();
    const placeholder = ((event.attributes?.['placeholder'] || '') as string).toLowerCase();
    return (
      name.includes('phone') ||
      name.includes('tel') ||
      name.includes('mobile') ||
      placeholder.includes('phone')
    );
  }

  /**
   * Removes duplicate validation rules.
   */
  private deduplicateValidations(validations: ValidationRule[]): ValidationRule[] {
    const seen = new Map<string, ValidationRule>();

    for (const validation of validations) {
      const key = `${validation.fieldSelector}:${validation.constraint}`;
      const existing = seen.get(key);

      if (!existing || validation.confidence > existing.confidence) {
        seen.set(key, validation);
      }
    }

    return Array.from(seen.values());
  }
}
