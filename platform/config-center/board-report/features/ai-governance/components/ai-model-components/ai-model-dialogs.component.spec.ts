import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiModelDialogsComponent } from './ai-model-dialogs.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiModelDialogsComponent', () => {
  let component: AiModelDialogsComponent;
  let fixture: ComponentFixture<AiModelDialogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelDialogsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiModelDialogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
