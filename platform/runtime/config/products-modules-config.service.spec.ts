/**
 * Phase 4 hardening: ProductsModulesConfigService — isModuleVisible and nav filtering safety.
 */
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductsModulesConfigService } from './products-modules-config.service';
import { environment } from '@env/environment';

describe('ProductsModulesConfigService (Phase 4 hardening)', () => {
  let service: ProductsModulesConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductsModulesConfigService],
    });
    service = TestBed.inject(ProductsModulesConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('isModuleVisible', () => {
    it('returns true when config not loaded (backward compat)', () => {
      expect(service.isModuleVisible('foundation')).toBe(true);
      expect(service.isModuleVisible('qiyas')).toBe(true);
    });

    it('returns true for null/empty moduleCode (do not hide)', () => {
      expect(service.isModuleVisible(null)).toBe(true);
      expect(service.isModuleVisible(undefined)).toBe(true);
      expect(service.isModuleVisible('')).toBe(true);
    });

    it('after load with empty visibleModules, returns false for any module (no overexpose)', async () => {
      service.load();
      const req = httpMock.expectOne(`${environment.apiUrl}/config/products-modules`);
      req.flush({
        platform: { key: 'agrc-os', labelEn: 'AGRC-OS', labelAr: 'AGRC-OS' },
        products: [],
        modulesByProduct: {},
        visibleModules: [],
        sharedServices: [],
        internalKeyToBusinessLabel: {},
      });
      await Promise.resolve();
      expect(service.isModuleVisible('foundation')).toBe(false);
      expect(service.isModuleVisible('qiyas')).toBe(false);
    });

    it('after load with visibleModules, returns true only for included modules', async () => {
      service.load();
      const req = httpMock.expectOne(`${environment.apiUrl}/config/products-modules`);
      req.flush({
        platform: { key: 'agrc-os', labelEn: 'AGRC-OS', labelAr: 'AGRC-OS' },
        products: [{ internalKey: 'agrc', businessLabel: 'Shahin-AI' }],
        modulesByProduct: { agrc: ['foundation', 'qiyas'] },
        visibleModules: ['foundation', 'qiyas'],
        sharedServices: [],
        internalKeyToBusinessLabel: { agrc: 'Shahin-AI' },
      });
      await Promise.resolve();
      expect(service.isModuleVisible('foundation')).toBe(true);
      expect(service.isModuleVisible('qiyas')).toBe(true);
      expect(service.isModuleVisible('governance')).toBe(false);
    });

    it('on API failure, config stays null so isModuleVisible remains permissive', async () => {
      service.load();
      const req = httpMock.expectOne(`${environment.apiUrl}/config/products-modules`);
      req.error(new ProgressEvent('error'));
      await Promise.resolve();
      expect(service.isModuleVisible('foundation')).toBe(true);
    });
  });
});
