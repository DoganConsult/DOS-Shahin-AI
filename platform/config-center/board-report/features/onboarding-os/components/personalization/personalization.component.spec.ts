import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PersonalizationComponent } from './personalization.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PersonalizationComponent', () => {
  let component: PersonalizationComponent;
  let fixture: ComponentFixture<PersonalizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonalizationComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PersonalizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
