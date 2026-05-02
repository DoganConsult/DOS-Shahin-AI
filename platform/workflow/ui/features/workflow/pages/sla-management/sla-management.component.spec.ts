import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SlaManagementComponent } from './sla-management.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SlaManagementComponent', () => {
  let component: SlaManagementComponent;
  let fixture: ComponentFixture<SlaManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlaManagementComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SlaManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
