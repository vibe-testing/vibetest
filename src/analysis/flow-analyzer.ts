/**
 * VibeTesting CLI - Flow Analyzer
 *
 * Main analyzer that coordinates intent detection, validation extraction,
 * and error scenario generation to produce analyzed flows.
 *
 * @license MIT
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RecordedEvent, RecordingSession } from '../recording/types.js';
import type {
  AnalyzedFlow,
  AnalysisResult,
  AnalysisConfig,
  GeneratedAssertion,
  FlowInsight,
  CoverageMetrics,
  DetectedIntent,
  IntentType,
} from './types.js';
import { IntentDetector } from './intent-detector.js';
import { ValidationExtractor } from './validation-extractor.js';
import { ErrorScenarioDetector } from './error-scenario-detector.js';

const DEFAULT_CONFIG: Required<AnalysisConfig> = {
  minIntentConfidence: 0.5,
  minAssertionConfidence: 0.6,
  maxFlowEvents: 50,
  flowSplitGap: 30000, // 30 seconds
  includeLowConfidenceValidations: false,
  generateErrorScenarios: true,
};

/**
 * FlowAnalyzer processes recorded events to produce analyzed flows
 * with intents, assertions, validations, and error scenarios.
 *
 * @example
 * ```typescript
 * const analyzer = new FlowAnalyzer();
 * const result = analyzer.analyzeSession(recordingSession);
 *
 * console.log(result.flows.length); // Number of distinct flows
 * console.log(result.flows[0].intent.type); // e.g., 'form_submission'
 * ```
 */
export class FlowAnalyzer {
  private config: Required<AnalysisConfig>;
  private intentDetector: IntentDetector;
  private validationExtractor: ValidationExtractor;
  private errorScenarioDetector: ErrorScenarioDetector;

  constructor(config: AnalysisConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.intentDetector = new IntentDetector();
    this.validationExtractor = new ValidationExtractor();
    this.errorScenarioDetector = new ErrorScenarioDetector();
  }

  /**
   * Analyzes a recording session and produces complete analysis.
   *
   * @param session - Recording session to analyze
   * @returns Complete analysis result
   */
  analyzeSession(session: RecordingSession): AnalysisResult {
    const events = session.events;

    // Split events into logical flows
    const flowGroups = this.splitIntoFlows(events);

    // Analyze each flow
    const flows: AnalyzedFlow[] = [];
    const allValidations = this.validationExtractor.extractValidations(events);
    const allErrorScenarios: AnalysisResult['errorScenarios'] = [];

    for (let i = 0; i < flowGroups.length; i++) {
      const flowEvents = flowGroups[i]!;
      const intents = this.intentDetector.detectIntents(flowEvents);

      if (intents.length === 0) {
        // No clear intent detected, create generic flow
        const flow = this.createGenericFlow(flowEvents, i);
        flows.push(flow);
        continue;
      }

      // Process each detected intent as a separate flow
      for (const intent of intents) {
        if (intent.confidence < this.config.minIntentConfidence) {
          continue;
        }

        const intentEvents = flowEvents.slice(
          intent.startEventIndex,
          intent.endEventIndex + 1
        );

        const validations = this.validationExtractor.extractValidations(intentEvents);
        const filteredValidations = this.config.includeLowConfidenceValidations
          ? validations
          : validations.filter((v) => v.confidence >= 0.5);

        const errorScenarios = this.config.generateErrorScenarios
          ? this.errorScenarioDetector.generateScenarios(
              intentEvents,
              intent,
              filteredValidations
            )
          : [];

        allErrorScenarios.push(...errorScenarios);

        const assertions = this.generateAssertions(intentEvents, intent);
        const filteredAssertions = assertions.filter(
          (a) => a.confidence >= this.config.minAssertionConfidence
        );

        const flow = this.createAnalyzedFlow(
          intentEvents,
          intent,
          filteredAssertions,
          filteredValidations,
          errorScenarios,
          flows.length
        );

        flows.push(flow);
      }
    }

    // Generate insights
    const insights = this.generateInsights(flows, events);

    // Calculate coverage metrics
    const coverage = this.calculateCoverage(flows, events);

    return {
      sessionId: session.id,
      flows,
      insights,
      validationRules: allValidations,
      errorScenarios: allErrorScenarios,
      coverage,
      analyzedAt: Date.now(),
    };
  }

  /**
   * Splits events into logical flow groups based on time gaps and page changes.
   */
  private splitIntoFlows(events: RecordedEvent[]): RecordedEvent[][] {
    if (events.length === 0) return [];

    const flows: RecordedEvent[][] = [];
    let currentFlow: RecordedEvent[] = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i]!;
      const prevEvent = events[i - 1];

      // Check if we should start a new flow
      const shouldSplit =
        prevEvent &&
        (event.timestamp - prevEvent.timestamp > this.config.flowSplitGap ||
          currentFlow.length >= this.config.maxFlowEvents ||
          (event.type === 'navigation' && event.pageUrl !== prevEvent.pageUrl));

      if (shouldSplit && currentFlow.length > 0) {
        flows.push(currentFlow);
        currentFlow = [];
      }

      currentFlow.push(event);
    }

    if (currentFlow.length > 0) {
      flows.push(currentFlow);
    }

    return flows;
  }

  /**
   * Generates assertions based on events and detected intent.
   */
  private generateAssertions(
    events: RecordedEvent[],
    intent: DetectedIntent
  ): GeneratedAssertion[] {
    const assertions: GeneratedAssertion[] = [];

    // URL change assertion
    const startUrl = events[0]?.pageUrl;
    const endUrl = events[events.length - 1]?.pageUrl;
    if (startUrl && endUrl && startUrl !== endUrl) {
      assertions.push({
        type: 'url_change',
        expected: endUrl,
        operator: 'contains',
        description: `Page should navigate from ${startUrl} to ${endUrl}`,
        confidence: 0.9,
      });
    }

    // Element visibility assertions for submit buttons
    const submitEvent = events.find(
      (e) => e.type === 'submit' || (e.type === 'click' && e.tagName === 'button')
    );
    if (submitEvent) {
      assertions.push({
        type: 'element_visible',
        selector: submitEvent.selector,
        description: `Submit button should be visible`,
        confidence: 0.85,
      });
    }

    // Form field assertions
    const inputEvents = events.filter((e) =>
      ['input', 'change', 'select'].includes(e.type)
    );
    for (const inputEvent of inputEvents) {
      assertions.push({
        type: 'element_visible',
        selector: inputEvent.selector,
        description: `Form field ${inputEvent.attributes?.['name'] || inputEvent.selector} should be visible`,
        confidence: 0.75,
      });
    }

    // Intent-specific assertions
    switch (intent.type) {
      case 'authentication':
        assertions.push({
          type: 'url_change',
          description: 'Should redirect after successful login',
          confidence: 0.8,
        });
        break;

      case 'search':
        assertions.push({
          type: 'element_visible',
          description: 'Search results should be displayed',
          confidence: 0.7,
        });
        break;

      case 'form_submission':
        assertions.push({
          type: 'text_content',
          description: 'Should show success message or confirmation',
          confidence: 0.6,
        });
        break;

      case 'checkout':
        assertions.push({
          type: 'text_content',
          description: 'Should show order confirmation',
          confidence: 0.7,
        });
        break;

      default:
        break;
    }

    return assertions;
  }

  /**
   * Creates an analyzed flow from events and detected intent.
   */
  private createAnalyzedFlow(
    events: RecordedEvent[],
    intent: DetectedIntent,
    assertions: GeneratedAssertion[],
    validations: ReturnType<ValidationExtractor['extractValidations']>,
    errorScenarios: ReturnType<ErrorScenarioDetector['generateScenarios']>,
    index: number
  ): AnalyzedFlow {
    const startUrl = events[0]?.pageUrl || '';
    const endUrl = events[events.length - 1]?.pageUrl;
    const startTime = events[0]?.timestamp || 0;
    const endTime = events[events.length - 1]?.timestamp || 0;

    const flow: AnalyzedFlow = {
      id: `flow_${Date.now()}_${index}`,
      name: this.generateFlowName(intent, events),
      description: this.generateFlowDescription(intent, events),
      intent,
      events,
      assertions,
      validations,
      errorScenarios,
      startUrl,
      duration: endTime - startTime,
      confidence: intent.confidence,
    };

    if (endUrl && endUrl !== startUrl) {
      flow.endUrl = endUrl;
    }

    return flow;
  }

  /**
   * Creates a generic flow when no clear intent is detected.
   */
  private createGenericFlow(events: RecordedEvent[], index: number): AnalyzedFlow {
    const startUrl = events[0]?.pageUrl || '';
    const endUrl = events[events.length - 1]?.pageUrl;
    const startTime = events[0]?.timestamp || 0;
    const endTime = events[events.length - 1]?.timestamp || 0;

    const genericIntent: DetectedIntent = {
      type: 'unknown',
      confidence: 0.3,
      startEventIndex: 0,
      endEventIndex: events.length - 1,
      triggerEvents: events.map((e) => e.id),
      metadata: {},
    };

    const flow: AnalyzedFlow = {
      id: `flow_${Date.now()}_${index}`,
      name: `Generic Flow ${index + 1}`,
      description: `User interaction flow with ${events.length} events`,
      intent: genericIntent,
      events,
      assertions: [],
      validations: [],
      errorScenarios: [],
      startUrl,
      duration: endTime - startTime,
      confidence: 0.3,
    };

    if (endUrl && endUrl !== startUrl) {
      flow.endUrl = endUrl;
    }

    return flow;
  }

  /**
   * Generates a human-readable name for a flow.
   */
  private generateFlowName(intent: DetectedIntent, events: RecordedEvent[]): string {
    const intentNames: Record<IntentType, string> = {
      form_submission: 'Form Submission',
      search: 'Search',
      navigation: 'Navigation',
      authentication: 'Login',
      checkout: 'Checkout',
      filter: 'Filter',
      sort: 'Sort',
      pagination: 'Pagination',
      file_upload: 'File Upload',
      data_entry: 'Data Entry',
      selection: 'Selection',
      modal_interaction: 'Modal Interaction',
      menu_navigation: 'Menu Navigation',
      unknown: 'User Flow',
    };

    const baseName = intentNames[intent.type] || 'User Flow';
    const pageTitle = events[0]?.pageTitle;

    if (pageTitle) {
      return `${baseName} on ${pageTitle}`;
    }

    return baseName;
  }

  /**
   * Generates a description for a flow.
   */
  private generateFlowDescription(
    intent: DetectedIntent,
    events: RecordedEvent[]
  ): string {
    const eventCount = events.length;
    const pageUrl = events[0]?.pageUrl || 'unknown page';

    switch (intent.type) {
      case 'form_submission':
        return `User submits a form with ${intent.metadata.fieldCount || 'multiple'} fields on ${pageUrl}`;
      case 'authentication':
        return `User logs in ${intent.metadata.hasUsername ? 'with username' : ''} on ${pageUrl}`;
      case 'search':
        return `User searches for "${intent.metadata.searchQuery || 'content'}"`;
      case 'checkout':
        return `User completes checkout process`;
      case 'navigation':
        return `User navigates to ${intent.metadata.targetUrl || 'new page'}`;
      case 'file_upload':
        return `User uploads a file`;
      default:
        return `User interaction with ${eventCount} events on ${pageUrl}`;
    }
  }

  /**
   * Generates insights about the analyzed flows.
   */
  private generateInsights(
    flows: AnalyzedFlow[],
    allEvents: RecordedEvent[]
  ): FlowInsight[] {
    const insights: FlowInsight[] = [];

    // Check for common patterns
    const intentCounts = new Map<IntentType, number>();
    for (const flow of flows) {
      const count = intentCounts.get(flow.intent.type) || 0;
      intentCounts.set(flow.intent.type, count + 1);
    }

    // Highlight dominant patterns
    for (const [intentType, count] of intentCounts) {
      if (count >= 2) {
        insights.push({
          type: 'pattern',
          message: `${count} ${intentType} flows detected - consider parameterized tests`,
          confidence: 0.8,
        });
      }
    }

    // Check for low confidence flows
    const lowConfidenceFlows = flows.filter((f) => f.confidence < 0.5);
    if (lowConfidenceFlows.length > 0) {
      insights.push({
        type: 'warning',
        message: `${lowConfidenceFlows.length} flows have low confidence - manual review recommended`,
        confidence: 0.9,
        suggestion: 'Consider re-recording these flows with clearer actions',
      });
    }

    // Check for validation opportunities
    const totalValidations = flows.reduce(
      (sum, f) => sum + f.validations.length,
      0
    );
    if (totalValidations === 0 && flows.some((f) => f.intent.type === 'form_submission')) {
      insights.push({
        type: 'coverage',
        message: 'No form validations detected - consider adding validation tests',
        confidence: 0.7,
        suggestion: 'Record flows that test field validation (empty fields, invalid formats)',
      });
    }

    // Check for coverage gaps
    const uniquePages = new Set(allEvents.map((e) => e.pageUrl));
    if (uniquePages.size === 1 && allEvents.length > 20) {
      insights.push({
        type: 'coverage',
        message: 'All events on single page - consider testing navigation',
        confidence: 0.6,
      });
    }

    return insights;
  }

  /**
   * Calculates coverage metrics for the analysis.
   */
  private calculateCoverage(
    flows: AnalyzedFlow[],
    allEvents: RecordedEvent[]
  ): CoverageMetrics {
    const analyzedEventIds = new Set(
      flows.flatMap((f) => f.events.map((e) => e.id))
    );

    const intentTypes: Record<IntentType, number> = {
      form_submission: 0,
      search: 0,
      navigation: 0,
      authentication: 0,
      checkout: 0,
      filter: 0,
      sort: 0,
      pagination: 0,
      file_upload: 0,
      data_entry: 0,
      selection: 0,
      modal_interaction: 0,
      menu_navigation: 0,
      unknown: 0,
    };

    for (const flow of flows) {
      intentTypes[flow.intent.type]++;
    }

    return {
      totalEvents: allEvents.length,
      analyzedEvents: analyzedEventIds.size,
      uniquePages: new Set(allEvents.map((e) => e.pageUrl)).size,
      uniqueSelectors: new Set(allEvents.map((e) => e.selector)).size,
      intentTypes,
      assertionCount: flows.reduce((sum, f) => sum + f.assertions.length, 0),
      validationCount: flows.reduce((sum, f) => sum + f.validations.length, 0),
      errorScenarioCount: flows.reduce(
        (sum, f) => sum + f.errorScenarios.length,
        0
      ),
    };
  }

  /**
   * Exports analysis result to a JSON file.
   *
   * @param result - Analysis result to export
   * @param outputPath - Path to write the file
   * @returns Resolved output path
   */
  exportAnalysis(result: AnalysisResult, outputPath: string): string {
    const resolved = path.resolve(outputPath);
    const dir = path.dirname(resolved);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolved, JSON.stringify(result, null, 2), 'utf-8');
    return resolved;
  }
}
