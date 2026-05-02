import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationBusinessUnitsComponent } from './foundation-business-units.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationBusinessUnitsComponent', () => {
  let component: FoundationBusinessUnitsComponent;
  let fixture: ComponentFixture<FoundationBusinessUnitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationBusinessUnitsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationBusinessUnitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
