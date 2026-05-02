import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RegulatorPortalComponent } from './regulator-portal.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RegulatorPortalComponent', () => {
  let component: RegulatorPortalComponent;
  let fixture: ComponentFixture<RegulatorPortalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegulatorPortalComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RegulatorPortalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
