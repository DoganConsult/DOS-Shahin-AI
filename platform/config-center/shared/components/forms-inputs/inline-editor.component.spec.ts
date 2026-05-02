import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InlineEditorComponent } from './inline-editor.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('InlineEditorComponent', () => {
  let component: InlineEditorComponent;
  let fixture: ComponentFixture<InlineEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InlineEditorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(InlineEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
