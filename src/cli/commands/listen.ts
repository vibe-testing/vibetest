import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { chromium, type Browser, type Page } from 'playwright';
import { RecordingServer } from '../../recording/websocket-server.js';
import { SessionManager } from '../../recording/session-manager.js';
import { createRecordingScript } from '../../recording/event-listener.js';
import type { RecordedEvent } from '../../recording/types.js';

interface ListenCommandOptions {
  output: string;
  headless: boolean;
  timeout: string;
  screenshots: boolean;
  network: boolean;
}

/**
 * Validates a URL string.
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Creates a directory if it doesn't exist.
 */
function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * The listen command handler.
 * Opens a browser and records user interactions.
 *
 * @param url - The URL to open
 * @param options - Command options
 */
export async function listenCommand(
  url: string,
  options: ListenCommandOptions
): Promise<void> {
  // Validate URL
  if (!isValidUrl(url)) {
    console.error(chalk.red('Error: Invalid URL provided.'));
    console.error(chalk.yellow('URL must start with http:// or https://'));
    process.exit(1);
  }

  // Parse numeric options
  const timeout = parseInt(options.timeout, 10);

  if (isNaN(timeout) || timeout < 1000) {
    console.error(chalk.red('Error: --timeout must be at least 1000ms'));
    process.exit(1);
  }

  // Resolve output directory
  const outputDir = path.resolve(options.output);

  // Display configuration
  console.log(chalk.bold('\nVibeTest Listener'));
  console.log(chalk.gray('='.repeat(50)));
  console.log(chalk.cyan('Start URL:    ') + url);
  console.log(chalk.cyan('Output:       ') + outputDir);
  console.log(chalk.cyan('Headless:     ') + (options.headless ? 'Yes' : 'No'));
  console.log(chalk.cyan('Timeout:      ') + timeout + 'ms');
  console.log(chalk.gray('='.repeat(50)));

  // Instructions
  console.log(chalk.yellow('\nInstructions:'));
  console.log(chalk.gray('  1. A browser window will open'));
  console.log(chalk.gray('  2. Interact with the application'));
  console.log(chalk.gray('  3. Press Ctrl+C to stop recording'));
  console.log('');

  // Create output directory
  try {
    ensureDirectory(outputDir);
  } catch (error) {
    console.error(chalk.red('Error: Failed to create output directory'));
    console.error(chalk.yellow((error as Error).message));
    process.exit(1);
  }

  // Track recording state
  let browser: Browser | null = null;
  let page: Page | null = null;
  let server: RecordingServer | null = null;
  let sessionManager: SessionManager | null = null;
  let sessionId: string | null = null;
  let eventCount = 0;

  // Start spinner
  const spinner = ora({
    text: 'Starting recording server...',
    color: 'cyan',
  }).start();

  // Handle shutdown gracefully
  const shutdown = async () => {
    spinner.text = chalk.yellow('Stopping recording...');

    try {
      // End session
      if (sessionManager && sessionId) {
        sessionManager.endSession(sessionId);
        const session = sessionManager.getSession(sessionId);

        if (session) {
          spinner.succeed(chalk.green('Recording stopped!'));

          // Save recording
          const outputPath = path.join(outputDir, 'recording.json');
          fs.writeFileSync(outputPath, JSON.stringify(session, null, 2));

          // Print summary
          console.log(chalk.bold('\nRecording Summary'));
          console.log(chalk.gray('='.repeat(50)));
          console.log(chalk.green('Events recorded:  ') + session.events.length);
          if (session.endTime) {
            console.log(chalk.green('Duration:         ') + ((session.endTime - session.startTime) / 1000).toFixed(2) + 's');
          }
          console.log(chalk.green('Start URL:        ') + session.startUrl);
          console.log(chalk.gray('='.repeat(50)));
          console.log(chalk.cyan('\nRecording saved to: ') + chalk.underline(outputPath));
        }
      }

      // Cleanup
      if (server) {
        await server.stop();
      }
      if (browser) {
        await browser.close();
      }

      process.exit(0);
    } catch (error) {
      spinner.fail(chalk.red('Error stopping recording'));
      console.error(chalk.yellow((error as Error).message));
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    // Create session manager
    sessionManager = new SessionManager();

    // Create recording server
    server = new RecordingServer(
      { port: 9876 },
      {
        onEvents: (events: RecordedEvent[], _sid: string) => {
          if (sessionManager && sessionId) {
            sessionManager.addEvents(sessionId, events);
            eventCount += events.length;
          }
        },
      }
    );

    await server.start();
    spinner.text = chalk.cyan('Starting browser...');

    // Launch browser
    browser = await chromium.launch({
      headless: options.headless,
    });

    // Create page and navigate
    page = await browser.newPage();
    page.setDefaultTimeout(timeout);

    // Inject recording script on each navigation
    const recordingScript = createRecordingScript(
      server.getUrl() || 'ws://localhost:9876'
    );

    await page.addInitScript(recordingScript);

    // Create session
    sessionId = sessionManager.createSession({
      startUrl: url,
      browser: 'chromium',
      viewport: { width: 1280, height: 720 },
    });

    // Navigate to URL
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    spinner.succeed(chalk.green('Browser opened - recording started!'));

    // Update spinner with event count
    const updateSpinner = ora({
      text: chalk.cyan(`Recording... Events: ${eventCount} | Press Ctrl+C to stop`),
      color: 'cyan',
    }).start();

    // Poll for event count updates
    const pollInterval = setInterval(() => {
      updateSpinner.text = chalk.cyan(`Recording... Events: ${eventCount} | Press Ctrl+C to stop`);
    }, 500);

    // Keep the process running
    await new Promise<void>(() => {
      // This promise never resolves - we wait for SIGINT
    });

    clearInterval(pollInterval);
  } catch (error) {
    spinner.fail(chalk.red('Failed to start recording'));

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('net::ERR_NAME_NOT_RESOLVED')) {
      console.error(chalk.yellow('\nCould not resolve the hostname. Please check the URL.'));
    } else if (errorMessage.includes('net::ERR_CONNECTION_REFUSED')) {
      console.error(chalk.yellow('\nConnection refused. Is the server running?'));
    } else if (errorMessage.includes('Timeout')) {
      console.error(chalk.yellow('\nNavigation timed out. Try increasing --timeout.'));
    } else if (errorMessage.includes('browser') || errorMessage.includes('chromium')) {
      console.error(chalk.yellow('\nBrowser error. Make sure Playwright browsers are installed:'));
      console.error(chalk.gray('  npx playwright install chromium'));
    } else {
      console.error(chalk.yellow('\n' + errorMessage));
    }

    // Cleanup
    try {
      if (server) await server.stop();
      if (browser) await browser.close();
    } catch {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}
