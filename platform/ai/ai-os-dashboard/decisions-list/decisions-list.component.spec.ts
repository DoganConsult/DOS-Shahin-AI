import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DecisionsListComponent } from './decisions-list.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DecisionsListComponent', () => {
  let component: DecisionsListComponent;
  let fixture: ComponentFixture<DecisionsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecisionsListComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DecisionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
