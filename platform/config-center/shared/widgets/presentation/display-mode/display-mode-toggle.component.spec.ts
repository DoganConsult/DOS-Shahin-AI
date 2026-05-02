import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DisplayModeToggleComponent } from './display-mode-toggle.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DisplayModeToggleComponent', () => {
  let component: DisplayModeToggleComponent;
  let fixture: ComponentFixture<DisplayModeToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayModeToggleComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DisplayModeToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
