import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DiffViewerComponent } from './diff-viewer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('DiffViewerComponent', () => {
  let component: DiffViewerComponent;
  let fixture: ComponentFixture<DiffViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiffViewerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(DiffViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
