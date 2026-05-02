import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FindingsBarComponent } from './findings-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FindingsBarComponent', () => {
  let component: FindingsBarComponent;
  let fixture: ComponentFixture<FindingsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FindingsBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FindingsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
