import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RichEditorComponent } from './rich-editor.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RichEditorComponent', () => {
  let component: RichEditorComponent;
  let fixture: ComponentFixture<RichEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichEditorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RichEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
