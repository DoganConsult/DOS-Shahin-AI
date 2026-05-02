import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiBindingAllowlistTabComponent } from './ai-binding-allowlist-tab.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiBindingAllowlistTabComponent', () => {
  let component: AiBindingAllowlistTabComponent;
  let fixture: ComponentFixture<AiBindingAllowlistTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiBindingAllowlistTabComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiBindingAllowlistTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
