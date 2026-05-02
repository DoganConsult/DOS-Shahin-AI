import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantConfigHistoryComponent } from './tenant-config-history.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TenantConfigHistoryComponent', () => {
  let component: TenantConfigHistoryComponent;
  let fixture: ComponentFixture<TenantConfigHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantConfigHistoryComponent], // Assuming standalone component
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } },
            params: of({ id: '1' }),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TenantConfigHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
