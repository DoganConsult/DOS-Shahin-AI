import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Apply persisted locale BEFORE Angular bootstraps so first paint matches
// the user's saved preference. Default is 'en' (matches product.manifest.json
// i18n.defaultLocale). LocaleService re-applies on construction; this block
// only avoids the LTR→RTL flash on reload for ar users.
try {
  const stored = window.localStorage?.getItem('shahin.locale');
  if (stored === 'ar' || stored === 'en') {
    document.documentElement.setAttribute('lang', stored);
    document.documentElement.setAttribute('dir', stored === 'ar' ? 'rtl' : 'ltr');
  }
} catch {
  // best-effort; index.html default (lang="en" dir="ltr") wins.
}

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
