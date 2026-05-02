import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAssetsComponent } from './ai-assets.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAssetsComponent', () => {
  let component: AiAssetsComponent;
  let fixture: ComponentFixture<AiAssetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAssetsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAssetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
