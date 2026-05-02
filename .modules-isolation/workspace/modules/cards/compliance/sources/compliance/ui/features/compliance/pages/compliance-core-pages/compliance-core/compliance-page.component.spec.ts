import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CompliancePageComponent } from './compliance-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CompliancePageComponent', () => {
  let component: CompliancePageComponent;
  let fixture: ComponentFixture<CompliancePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompliancePageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CompliancePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
