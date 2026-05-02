import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComplianceExceptionsPageComponent } from './compliance-exceptions-page.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ComplianceExceptionsPageComponent', () => {
  let component: ComplianceExceptionsPageComponent;
  let fixture: ComponentFixture<ComplianceExceptionsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplianceExceptionsPageComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ComplianceExceptionsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
