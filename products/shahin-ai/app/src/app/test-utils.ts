/**
 * Shared test utilities for Angular + Vitest
 */
import 'zone.js';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

let platformInitialized = false;

export function ensurePlatform() {
  if (!platformInitialized) {
    try {
      TestBed.initTestEnvironment(
        BrowserDynamicTestingModule,
        platformBrowserDynamicTesting(),
      );
      platformInitialized = true;
    } catch {
      // Already initialized
    }
  }
}

export function createTestBed(providers: unknown[] = []) {
  ensurePlatform();
  return TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      ...providers,
    ],
  });
}

export function getHttpMock() {
  return TestBed.inject(HttpTestingController);
}
