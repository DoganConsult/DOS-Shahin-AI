import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class MobileInitService {
  init(): Promise<void> { return Promise.resolve(); }
}
