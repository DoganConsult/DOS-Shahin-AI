import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ModuleFirstVisitOverlayComponent } from './module-first-visit-overlay.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ModuleFirstVisitOverlayComponent', () => {
  let component: ModuleFirstVisitOverlayComponent;
  let fixture: ComponentFixture<ModuleFirstVisitOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleFirstVisitOverlayComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ModuleFirstVisitOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
