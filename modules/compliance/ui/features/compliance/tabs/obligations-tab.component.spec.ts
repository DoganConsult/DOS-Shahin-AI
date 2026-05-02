import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ObligationsTabComponent } from './obligations-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ObligationsTabComponent', () => {
  let component: ObligationsTabComponent;
  let fixture: ComponentFixture<ObligationsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObligationsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ObligationsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
