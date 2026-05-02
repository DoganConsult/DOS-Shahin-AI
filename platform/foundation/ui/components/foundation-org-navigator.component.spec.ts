import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationOrgNavigatorComponent } from './foundation-org-navigator.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationOrgNavigatorComponent', () => {
  let component: FoundationOrgNavigatorComponent;
  let fixture: ComponentFixture<FoundationOrgNavigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationOrgNavigatorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationOrgNavigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
