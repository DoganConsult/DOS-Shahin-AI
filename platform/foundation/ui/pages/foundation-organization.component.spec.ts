import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationOrganizationComponent } from './foundation-organization.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationOrganizationComponent', () => {
  let component: FoundationOrganizationComponent;
  let fixture: ComponentFixture<FoundationOrganizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationOrganizationComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationOrganizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
