import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RichTextViewerComponent } from './rich-text-viewer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RichTextViewerComponent', () => {
  let component: RichTextViewerComponent;
  let fixture: ComponentFixture<RichTextViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextViewerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RichTextViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
