import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SodFilterBarComponent } from './sod-filter-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SodFilterBarComponent', () => {
  let component: SodFilterBarComponent;
  let fixture: ComponentFixture<SodFilterBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SodFilterBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SodFilterBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
