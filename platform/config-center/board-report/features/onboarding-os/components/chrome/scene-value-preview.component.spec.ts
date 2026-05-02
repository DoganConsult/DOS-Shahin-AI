import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SceneValuePreviewComponent } from './scene-value-preview.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SceneValuePreviewComponent', () => {
  let component: SceneValuePreviewComponent;
  let fixture: ComponentFixture<SceneValuePreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SceneValuePreviewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SceneValuePreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
