import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FitchProofEditorComponent } from './fitch-proof-editor.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FitchProofEditorComponent', () => {
  let component: FitchProofEditorComponent;
  let fixture: ComponentFixture<FitchProofEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FitchProofEditorComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FitchProofEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
