import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PackInstallerApi } from './pack-installer.api.service';

describe('PackInstallerApi', () => {
  let service: PackInstallerApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PackInstallerApi
      ]
    });
    service = TestBed.inject(PackInstallerApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
