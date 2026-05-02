import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DecisionDetailComponent } from './decision-detail.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DecisionDetailComponent', () => {
  let component: DecisionDetailComponent;
  let fixture: ComponentFixture<DecisionDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecisionDetailComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DecisionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
