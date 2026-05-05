import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';

try {
  const stored = window.localStorage?.getItem('shahin.locale');
  if (stored === 'ar' || stored === 'en') {
    document.documentElement.setAttribute('lang', stored);
    document.documentElement.setAttribute('dir', stored === 'ar' ? 'rtl' : 'ltr');
  }
} catch {
  /* index.html defaults win */
}

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
