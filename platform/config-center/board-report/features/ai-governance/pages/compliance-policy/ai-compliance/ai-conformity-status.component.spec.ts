import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiConformityStatusComponent } from './ai-conformity-status.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiConformityStatusComponent', () => {
  let component: AiConformityStatusComponent;
  let fixture: ComponentFixture<AiConformityStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiConformityStatusComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiConformityStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
