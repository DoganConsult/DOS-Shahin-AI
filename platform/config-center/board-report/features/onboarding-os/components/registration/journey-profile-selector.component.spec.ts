import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { JourneyProfileSelectorComponent } from './journey-profile-selector.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('JourneyProfileSelectorComponent', () => {
  let component: JourneyProfileSelectorComponent;
  let fixture: ComponentFixture<JourneyProfileSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JourneyProfileSelectorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(JourneyProfileSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
