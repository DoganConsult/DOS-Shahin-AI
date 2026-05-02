import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SeverityChipComponent } from './severity-chip.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SeverityChipComponent', () => {
  let component: SeverityChipComponent;
  let fixture: ComponentFixture<SeverityChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeverityChipComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SeverityChipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
