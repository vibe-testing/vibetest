// Semantic classification of an element's purpose in the UI
enum SemanticElementKind {
  PRIMARY_CALL_TO_ACTION @description("Main action buttons: Submit, Buy, Login, Sign Up")
  SECONDARY_ACTION @description("Supporting actions: Cancel, Back, Skip, Close")
  NAVIGATION @description("Links and navigation elements")
  FORM_FIELD @description("Input fields, textareas, selects")
  SEARCH @description("Search inputs and search buttons")
  FILTER_OR_SORT @description("Filtering and sorting controls")
  PAGINATION @description("Page navigation: Next, Previous, page numbers")
  DANGEROUS_ACTION @description("Destructive actions: Delete, Remove, Cancel subscription")
  DISMISS_OR_CLOSE @description("Modal close, notification dismiss, tooltips")
  DECORATIVE_OR_LOW_VALUE @description("Icons, decorative elements, low-value interactions")
  OTHER @description("Uncategorized elements")
}

// Priority level for exploration/testing
enum ExplorationPriority {
  HIGH @description("Critical elements that should be explored first")
  MEDIUM @description("Important elements worth exploring")
  LOW @description("Less important elements, explore if time permits")
  IGNORE @description("Skip exploration, decorative or low-value")
}

// Semantic analysis result for a single element
class SemanticElementAnalysis {
  elementId string @description("Must match the element ID from input")
  semanticKind SemanticElementKind @description("High-level semantic classification")
  domainIntent string @description("Domain-specific intent like 'login_button', 'add_to_cart', 'search_input'")
  importanceScore float @description("0.0-1.0 importance score for testing/exploration")
  explorationPriority ExplorationPriority @description("Recommended exploration priority level")
  reasoning string? @description("Brief explanation of the assessment")
}

// Batch result wrapper
class SemanticElementBatchResult {
  elements SemanticElementAnalysis[] @description("Analysis results for each element")
}

// Analyze semantic meaning and testing importance of elements
function AnalyzeElements(
  url: string,
  screenshotBase64: image,
  elementsJson: string,
  legendDescription: string
) -> SemanticElementBatchResult {
  client Anthropic
  prompt #"
    You are analyzing interactive web elements to determine their semantic meaning and testing importance.

    PAGE CONTEXT:
    URL: {{ url }}

    VISUAL CONTEXT:
    A screenshot is attached with numbered, colored boxes highlighting each element.
    {{ legendDescription }}

    ELEMENT DATA (JSON array with element details):
    {{ elementsJson }}

    For each element, analyze:
    1. **semanticKind**: What type of UI element is this? (PRIMARY_CALL_TO_ACTION, NAVIGATION, FORM_FIELD, etc.)
    2. **domainIntent**: What specific action does this element perform? (e.g., "login_button", "add_to_cart", "search_input")
    3. **importanceScore**: How important is this element for testing? (0.0-1.0)
    4. **explorationPriority**: Should we explore this element? (HIGH, MEDIUM, LOW, IGNORE)

    USE BOTH visual cues (position, size, prominence) AND DOM metadata (text, role, type).

    {{ ctx.output_format }}
  "#
}
