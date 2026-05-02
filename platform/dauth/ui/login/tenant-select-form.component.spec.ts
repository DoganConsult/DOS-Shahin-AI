import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantSelectFormComponent } from './tenant-select-form.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TenantSelectFormComponent', () => {
  let component: TenantSelectFormComponent;
  let fixture: ComponentFixture<TenantSelectFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantSelectFormComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(TenantSelectFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
