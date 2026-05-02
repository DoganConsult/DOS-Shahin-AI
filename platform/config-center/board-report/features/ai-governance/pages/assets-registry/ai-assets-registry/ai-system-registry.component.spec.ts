import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiSystemRegistryComponent } from './ai-system-registry.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiSystemRegistryComponent', () => {
  let component: AiSystemRegistryComponent;
  let fixture: ComponentFixture<AiSystemRegistryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSystemRegistryComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiSystemRegistryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
