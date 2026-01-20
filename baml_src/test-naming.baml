// VibeTesting CLI - BAML Schema for Smart Test Naming
//
// Generates semantic, readable test names from flow context.
// Pattern: "should [action] when [scenario]"

// Input context for generating test names
class TestNamingContext {
  // Flow information
  flowName string
  flowDescription string
  intentType string  // form_submission, search, navigation, authentication, etc.

  // Variation details
  variationCategory string  // happy_path, validation, error_handling, edge_case, security
  variationDescription string

  // Additional context
  fieldName string?  // For validation tests
  constraintType string?  // required, email, min_length, etc.
  errorType string?  // For error handling tests (network_timeout, server_error, etc.)

  // Input/output context
  inputValue string?  // What value is being tested
  expectedBehavior string?  // What should happen
}

// Output from the LLM
class GeneratedTestName {
  // The semantic test name following "should [action] when [scenario]" pattern
  name string
  // Brief explanation of the test's purpose
  description string
}

// Batch input for generating multiple test names at once
class BatchTestNamingInput {
  contexts TestNamingContext[]
}

// Batch output with all generated names
class BatchTestNamingOutput {
  names GeneratedTestName[]
}

// Generate a single semantic test name
function GenerateTestName(context: TestNamingContext) -> GeneratedTestName {
  client CustomBedrock
  prompt #"
    Generate a semantic test name for an automated browser test.

    The test name MUST follow this pattern: "should [action] when [scenario]"

    Examples of good test names:
    - "should submit form successfully when all fields are valid"
    - "should show error message when email field is empty"
    - "should redirect to dashboard when login succeeds"
    - "should display timeout error when server does not respond"
    - "should prevent XSS when script tags are entered"

    Context for this test:
    - Flow: {{ context.flowName }} - {{ context.flowDescription }}
    - Intent: {{ context.intentType }}
    - Category: {{ context.variationCategory }}
    - Description: {{ context.variationDescription }}
    {% if context.fieldName %}- Field: {{ context.fieldName }}{% endif %}
    {% if context.constraintType %}- Constraint: {{ context.constraintType }}{% endif %}
    {% if context.errorType %}- Error Type: {{ context.errorType }}{% endif %}
    {% if context.inputValue %}- Input Value: {{ context.inputValue }}{% endif %}
    {% if context.expectedBehavior %}- Expected: {{ context.expectedBehavior }}{% endif %}

    Generate a concise, readable test name and brief description.

    {{ ctx.output_format }}
  "#
}

// Generate multiple test names in a single call (more efficient)
function GenerateTestNamesBatch(input: BatchTestNamingInput) -> BatchTestNamingOutput {
  client CustomBedrock
  prompt #"
    Generate semantic test names for multiple automated browser tests.

    Each test name MUST follow this pattern: "should [action] when [scenario]"

    Examples of good test names:
    - "should submit form successfully when all fields are valid"
    - "should show error message when email field is empty"
    - "should redirect to dashboard when login succeeds"
    - "should display timeout error when server does not respond"

    Generate names for these {{ input.contexts|length }} tests:

    {% for ctx in input.contexts %}
    Test {{ loop.index }}:
    - Flow: {{ ctx.flowName }} - {{ ctx.flowDescription }}
    - Intent: {{ ctx.intentType }}
    - Category: {{ ctx.variationCategory }}
    - Description: {{ ctx.variationDescription }}
    {% if ctx.fieldName %}- Field: {{ ctx.fieldName }}{% endif %}
    {% if ctx.constraintType %}- Constraint: {{ ctx.constraintType }}{% endif %}
    {% if ctx.errorType %}- Error Type: {{ ctx.errorType }}{% endif %}
    {% if ctx.inputValue %}- Input: {{ ctx.inputValue }}{% endif %}
    {% if ctx.expectedBehavior %}- Expected: {{ ctx.expectedBehavior }}{% endif %}

    {% endfor %}

    Return exactly {{ input.contexts|length }} names in order, one for each test above.

    {{ ctx.output_format }}
  "#
}

// Test cases for the BAML playground with assertions
test happy_path_form {
  functions [GenerateTestName]
  args {
    context {
      flowName "User Registration"
      flowDescription "User fills and submits registration form"
      intentType "form_submission"
      variationCategory "happy_path"
      variationDescription "Complete valid registration"
      expectedBehavior "User is registered and redirected to dashboard"
    }
  }
  @@check(starts_with_should, {{ this.name|lower|regex_match("should.*") }})
  @@check(descriptive_name, {{ this.name|length > 20 }})
  @@check(has_description, {{ this.description|length > 0 }})
  @@assert({{ _.checks.starts_with_should and _.checks.descriptive_name and _.checks.has_description }})
}

test validation_empty_email {
  functions [GenerateTestName]
  args {
    context {
      flowName "Contact Form"
      flowDescription "User submits contact form"
      intentType "form_submission"
      variationCategory "validation"
      variationDescription "Empty email validation"
      fieldName "email"
      constraintType "required"
      inputValue ""
      expectedBehavior "Error message displayed"
    }
  }
  @@check(starts_with_should, {{ this.name|lower|regex_match("should.*") }})
  @@check(mentions_email_or_error, {{ "email" in this.name|lower or "error" in this.name|lower }})
  @@check(has_description, {{ this.description|length > 0 }})
  @@assert({{ _.checks.starts_with_should and _.checks.has_description }})
}

test error_server_timeout {
  functions [GenerateTestName]
  args {
    context {
      flowName "Login Flow"
      flowDescription "User authenticates with credentials"
      intentType "authentication"
      variationCategory "error_handling"
      variationDescription "Server timeout during login"
      errorType "network_timeout"
      expectedBehavior "Timeout error displayed, retry option shown"
    }
  }
  @@check(starts_with_should, {{ this.name|lower|regex_match("should.*") }})
  @@check(mentions_timeout_or_error, {{ "timeout" in this.name|lower or "error" in this.name|lower }})
  @@check(has_description, {{ this.description|length > 0 }})
  @@assert({{ _.checks.starts_with_should and _.checks.has_description }})
}

test security_xss {
  functions [GenerateTestName]
  args {
    context {
      flowName "Search"
      flowDescription "User searches for products"
      intentType "search"
      variationCategory "security"
      variationDescription "XSS injection attempt"
      inputValue "<script>alert('xss')</script>"
      expectedBehavior "Script is escaped, no execution"
    }
  }
  @@check(starts_with_should, {{ this.name|lower|regex_match("should.*") }})
  @@check(mentions_security, {{ "xss" in this.name|lower or "script" in this.name|lower or "security" in this.name|lower or "escape" in this.name|lower or "prevent" in this.name|lower }})
  @@check(has_description, {{ this.description|length > 0 }})
  @@assert({{ _.checks.starts_with_should and _.checks.has_description }})
}

test batch_naming {
  functions [GenerateTestNamesBatch]
  args {
    input {
      contexts [
        {
          flowName "Login"
          flowDescription "User login flow"
          intentType "authentication"
          variationCategory "happy_path"
          variationDescription "Successful login"
          expectedBehavior "Redirect to dashboard"
        },
        {
          flowName "Login"
          flowDescription "User login flow"
          intentType "authentication"
          variationCategory "validation"
          variationDescription "Empty password"
          fieldName "password"
          constraintType "required"
          expectedBehavior "Error message shown"
        }
      ]
    }
  }
  @@check(returns_two_names, {{ this.names|length == 2 }})
  @@check(first_starts_with_should, {{ this.names[0].name|lower|regex_match("should.*") }})
  @@check(second_starts_with_should, {{ this.names[1].name|lower|regex_match("should.*") }})
  @@assert({{ _.checks.returns_two_names and _.checks.first_starts_with_should and _.checks.second_starts_with_should }})
}
