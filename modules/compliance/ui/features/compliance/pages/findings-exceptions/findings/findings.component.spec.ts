import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FindingsComponent } from './findings.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FindingsComponent', () => {
  let component: FindingsComponent;
  let fixture: ComponentFixture<FindingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FindingsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FindingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
