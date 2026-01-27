// BAML Type Definitions for VibeTesting
// Domain models for test generation from exploration graphs

// =============================================================================
// TEST CASE TYPES
// =============================================================================

// Test action types available in generated tests
enum ActionType {
  NAVIGATE @description("Navigate to a URL")
  CLICK @description("Click an element")
  TYPE @description("Type text into an input")
  SELECT @description("Select an option from dropdown")
  WAIT @description("Wait for condition or time")
  ASSERT_TEXT @description("Assert element contains text")
  ASSERT_VISIBLE @description("Assert element is visible")
  ASSERT_URL @description("Assert current URL matches")
  ASSERT_ATTRIBUTE @description("Assert element attribute value")
  SCREENSHOT @description("Take screenshot")
}

// Individual test step
class TestStep {
  action ActionType
  target string? @description("XPath selector, CSS selector, or URL")
  value string? @description("Input value for TYPE/SELECT actions")
  description string @description("Human-readable description of this step")
  order int @description("Execution order (0-indexed)")
}

// Test case priority levels
enum TestPriority {
  CRITICAL @description("Must pass - core functionality")
  HIGH @description("Important features")
  MEDIUM @description("Standard functionality")
  LOW @description("Nice-to-have features")
}

// Generated test case
class TestCase {
  name string @description("Concise test name (e.g., 'User login with valid credentials')")
  description string @description("Detailed test description explaining what is being tested")
  priority TestPriority
  tags string[] @description("Categorization tags (e.g., ['authentication', 'smoke'])")
  steps TestStep[] @description("Ordered list of test steps")
  preconditions string[] @description("Required initial state (e.g., 'User is logged out')")
  postconditions string[] @description("Expected final state (e.g., 'User is on dashboard')")
}

// =============================================================================
// CODE GENERATION TYPES
// =============================================================================

// Generated Playwright test code
class PlaywrightTestCode {
  filename string @description("Suggested filename (e.g., 'login.spec.ts')")
  code string @description("Complete Playwright test file content")
  imports string[] @description("Required imports beyond @playwright/test")
  fixtures string[] @description("Custom fixtures used (if any)")
}

// =============================================================================
// GRAPH ANALYSIS TYPES (for test generation)
// =============================================================================

// Path information for test generation
class GraphPathInfo {
  name string @description("Human-readable path name")
  urls string[] @description("Ordered list of page URLs in the path")
  score int @description("0-100 test value score")
  category string @description("Path category (authentication, transaction, etc.)")
  hasAuthentication bool @description("Path includes auth pages")
  hasCriticalActions bool @description("Path includes destructive/payment actions")
  keyElements string[] @description("Important elements along the path")
}

// Graph summary for LLM context
class GraphSummary {
  totalPages int @description("Total number of pages discovered")
  maxDepth int @description("Maximum depth reached during exploration")
  hubPageUrls string[] @description("URLs of high-traffic hub pages")
  clusterSummaries string[] @description("Descriptions of page clusters found")
  topPaths GraphPathInfo[] @description("Highest-value user flow paths")
  unexploredCategories string[] @description("Page categories not yet covered")
}
