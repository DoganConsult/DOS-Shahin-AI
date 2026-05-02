import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationOrgCanvasComponent } from './foundation-org-canvas.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationOrgCanvasComponent', () => {
  let component: FoundationOrgCanvasComponent;
  let fixture: ComponentFixture<FoundationOrgCanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationOrgCanvasComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationOrgCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
