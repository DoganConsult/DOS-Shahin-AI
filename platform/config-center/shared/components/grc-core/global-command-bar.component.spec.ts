import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GlobalCommandBarComponent } from './global-command-bar.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GlobalCommandBarComponent', () => {
  let component: GlobalCommandBarComponent;
  let fixture: ComponentFixture<GlobalCommandBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalCommandBarComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GlobalCommandBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
