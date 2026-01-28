#!/usr/bin/env node

/**
 * Terminal Quest - Main Entry Point
 * A terminal-based RPG adventure game
 */

import chalk from 'chalk';
import { clearScreen, showTitle, showMessage, showBox } from './ui/display.js';
import { showMainMenu } from './ui/menu.js';
import { startNewGame, loadGame, gameLoop } from './game.js';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    // Show welcome screen
    clearScreen();
    await showTitle();

    showBox(
      'Welcome to Terminal Quest!\n\n' +
      'Embark on an epic adventure through mysterious lands,\n' +
      'battle fearsome monsters, complete challenging quests,\n' +
      'and become the hero of legend!\n\n' +
      'May your journey be filled with glory and treasure!',
      'WELCOME'
    );

    console.log();

    // Main menu loop
    let running = true;

    while (running) {
      clearScreen();
      await showTitle();

      const choice = await showMainMenu();

      switch (choice) {
        case 'new-game':
          const gameState = await startNewGame();
          await gameLoop(gameState);
          break;

        case 'load-game':
          const loadedState = await loadGame();
          if (loadedState) {
            await gameLoop(loadedState);
          }
          break;

        case 'exit':
          clearScreen();
          await showTitle();
          showMessage('Thanks for playing Terminal Quest!', 'success');
          showMessage('Your adventure awaits...', 'info');
          console.log();
          running = false;
          break;
      }
    }
  } catch (error) {
    console.error(chalk.red('Fatal error occurred:'), error);
    process.exit(1);
  }
}

/**
 * Handle process termination
 */
process.on('SIGINT', () => {
  console.log();
  console.log(chalk.yellow('\n👋 Game interrupted. Goodbye!'));
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Uncaught exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 Unhandled rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Start the game
main().catch((error) => {
  console.error(chalk.red('Failed to start game:'), error);
  process.exit(1);
});
