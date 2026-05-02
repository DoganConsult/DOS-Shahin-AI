import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiBindingToolsTabComponent } from './ai-binding-tools-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiBindingToolsTabComponent', () => {
  let component: AiBindingToolsTabComponent;
  let fixture: ComponentFixture<AiBindingToolsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiBindingToolsTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiBindingToolsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
