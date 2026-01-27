// BAML Functions for Playwright Test Generation
// Converts exploration graphs and test cases into runnable Playwright code

// =============================================================================
// TEST CASE GENERATION FROM GRAPH
// =============================================================================

// Generate test cases from exploration graph analysis
// Takes pre-computed graph metrics and generates high-value test cases
function GenerateTestCasesFromGraph(
  graphSummary: GraphSummary,
  identifiedPaths: GraphPathInfo[],
  baseUrl: string
) -> TestCase[] {
  client ClaudeSonnet
  prompt #"
    You are a QA expert generating test cases from site exploration graph analysis.

    Site: {{ baseUrl }}

    GRAPH ANALYSIS RESULTS (computed by algorithms):
    ================================================
    Total Pages Discovered: {{ graphSummary.totalPages }}
    Maximum Depth Reached: {{ graphSummary.maxDepth }}

    Hub Pages (high-traffic central pages):
    {% for url in graphSummary.hubPageUrls %}
    - {{ url }}
    {% endfor %}

    Page Clusters Found:
    {% for cluster in graphSummary.clusterSummaries %}
    - {{ cluster }}
    {% endfor %}

    IDENTIFIED USER FLOWS (ranked by test value):
    =============================================
    {% for path in identifiedPaths %}

    Flow: {{ path.name }}
    Score: {{ path.score }}/100
    Category: {{ path.category }}
    Pages: {{ path.urls }}
    Has Authentication: {{ path.hasAuthentication }}
    Has Critical Actions: {{ path.hasCriticalActions }}
    Key Elements: {{ path.keyElements }}
    {% endfor %}

    Categories NOT YET COVERED: {{ graphSummary.unexploredCategories }}

    INSTRUCTIONS:
    =============
    Generate comprehensive test cases that:

    1. FLOW COVERAGE: Create end-to-end tests for each identified user flow
       - Each flow should have at least 1 happy path test
       - High-score flows (80+) should also have error/edge case tests

    2. HUB PAGE TESTING: Test navigation through hub pages
       - Verify hub pages are accessible
       - Test common navigation patterns through hubs

    3. CRITICAL PATH PRIORITY: Prioritize paths with:
       - hasAuthentication = true (login/register flows)
       - hasCriticalActions = true (payment/delete flows)

    4. GAP COVERAGE: Note any unexplored categories that need manual testing

    For each test case, define:
    - Clear name describing the user journey
    - Steps that follow the ACTUAL page sequence from the flow
    - Appropriate priority based on flow score and criticality
    - Relevant tags for categorization

    Actions: NAVIGATE, CLICK, TYPE, SELECT, WAIT, ASSERT_TEXT, ASSERT_VISIBLE, ASSERT_URL, ASSERT_ATTRIBUTE, SCREENSHOT

    {{ ctx.output_format }}
  "#
}

// =============================================================================
// PLAYWRIGHT CODE GENERATION
// =============================================================================

// Generate Playwright test code from test cases
// Uses Sonnet for high-quality, idiomatic code generation
function GeneratePlaywrightCode(
  testCases: TestCase[],
  baseUrl: string,
  projectName: string
) -> PlaywrightTestCode[] {
  client ClaudeSonnet
  prompt #"
    You are an expert Playwright test engineer. Generate production-ready Playwright test code.

    Project: {{ projectName }}
    Base URL: {{ baseUrl }}

    TEST CASES TO IMPLEMENT:
    {% for tc in testCases %}
    ---
    Name: {{ tc.name }}
    Description: {{ tc.description }}
    Priority: {{ tc.priority }}
    Tags: {{ tc.tags }}
    Preconditions: {{ tc.preconditions }}
    Postconditions: {{ tc.postconditions }}

    Steps:
    {% for step in tc.steps %}
    {{ step.order }}. {{ step.action }} - Target: {{ step.target }} - Value: {{ step.value }}
       Description: {{ step.description }}
    {% endfor %}
    {% endfor %}

    REQUIREMENTS:
    1. Generate idiomatic TypeScript Playwright code
    2. Use modern Playwright best practices (locators, auto-waiting)
    3. Group related tests in describe blocks
    4. Use meaningful test names from the test case names
    5. Add appropriate assertions based on postconditions
    6. Handle setup/teardown in beforeEach/afterEach if needed
    7. Use Page Object Model patterns for complex pages (optional)

    ACTION MAPPINGS:
    - NAVIGATE: await page.goto(target)
    - CLICK: await page.locator(target).click()
    - TYPE: await page.locator(target).fill(value)
    - SELECT: await page.locator(target).selectOption(value)
    - WAIT: await page.waitForSelector(target) or await page.waitForTimeout(ms)
    - ASSERT_TEXT: await expect(page.locator(target)).toContainText(value)
    - ASSERT_VISIBLE: await expect(page.locator(target)).toBeVisible()
    - ASSERT_URL: await expect(page).toHaveURL(target)
    - ASSERT_ATTRIBUTE: await expect(page.locator(target)).toHaveAttribute(attr, value)
    - SCREENSHOT: await page.screenshot({ path: 'screenshots/...' })

    SELECTOR CONVERSION:
    - Convert XPath selectors to CSS when possible for readability
    - Use data-testid attributes when available
    - Prefer role-based locators: page.getByRole(), page.getByLabel(), page.getByText()

    OUTPUT FORMAT:
    - One PlaywrightTestCode per logical test file
    - Group tests by feature/flow (e.g., auth.spec.ts, checkout.spec.ts)
    - Include all necessary imports
    - Add helpful comments for complex logic

    EXAMPLE OUTPUT:
    {
      "filename": "auth.spec.ts",
      "code": "import { test, expect } from '@playwright/test';\n\ntest.describe('Authentication', () => {\n  test('successful login with valid credentials', async ({ page }) => {\n    await page.goto('/login');\n    await page.getByLabel('Email').fill('test@example.com');\n    await page.getByLabel('Password').fill('password123');\n    await page.getByRole('button', { name: 'Sign In' }).click();\n    await expect(page).toHaveURL('/dashboard');\n  });\n});",
      "imports": [],
      "fixtures": []
    }

    {{ ctx.output_format }}
  "#
}

// Generate a single Playwright test file from one test case
// Useful for incremental code generation
function GeneratePlaywrightCodeSingle(
  testCase: TestCase,
  baseUrl: string
) -> PlaywrightTestCode {
  client ClaudeSonnet
  prompt #"
    Generate a Playwright test file for this test case.

    Base URL: {{ baseUrl }}

    TEST CASE:
    Name: {{ testCase.name }}
    Description: {{ testCase.description }}
    Priority: {{ testCase.priority }}
    Tags: {{ testCase.tags }}
    Preconditions: {{ testCase.preconditions }}
    Postconditions: {{ testCase.postconditions }}

    Steps:
    {% for step in testCase.steps %}
    {{ step.order }}. {{ step.action }} - Target: {{ step.target }} - Value: {{ step.value }}
       Description: {{ step.description }}
    {% endfor %}

    Generate production-ready TypeScript Playwright code:
    - Use modern locator strategies (getByRole, getByLabel, getByText)
    - Include proper assertions based on postconditions
    - Add helpful comments
    - Use test.describe for grouping
    - Suggest a meaningful filename based on the test purpose

    ACTION MAPPINGS:
    - NAVIGATE: await page.goto(target)
    - CLICK: await page.locator(target).click() or page.getByRole/getByText
    - TYPE: await page.locator(target).fill(value)
    - SELECT: await page.locator(target).selectOption(value)
    - WAIT: await page.waitForSelector(target) or await page.waitForTimeout(ms)
    - ASSERT_TEXT: await expect(page.locator(target)).toContainText(value)
    - ASSERT_VISIBLE: await expect(page.locator(target)).toBeVisible()
    - ASSERT_URL: await expect(page).toHaveURL(target)
    - ASSERT_ATTRIBUTE: await expect(page.locator(target)).toHaveAttribute(attr, value)
    - SCREENSHOT: await page.screenshot({ path: 'screenshots/...' })

    {{ ctx.output_format }}
  "#
}
