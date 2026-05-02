import { Injectable, ErrorHandler } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('Global Error:', error);
  }
}
