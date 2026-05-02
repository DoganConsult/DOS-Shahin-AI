import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiTechnicalDocsComponent } from './ai-technical-docs.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiTechnicalDocsComponent', () => {
  let component: AiTechnicalDocsComponent;
  let fixture: ComponentFixture<AiTechnicalDocsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiTechnicalDocsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiTechnicalDocsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
