import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantConfigComponent } from './tenant-config.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TenantConfigComponent', () => {
  let component: TenantConfigComponent;
  let fixture: ComponentFixture<TenantConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantConfigComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TenantConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
