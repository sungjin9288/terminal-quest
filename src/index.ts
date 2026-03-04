#!/usr/bin/env node

/**
 * Terminal Quest - Main Entry Point
 */

import { runMainMenuRuntime } from './systems/mainMenuRuntime.js';
import { bootstrapApplication } from './runtime/bootstrap.js';

bootstrapApplication(runMainMenuRuntime);
