import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiAibomComponent } from './ai-aibom.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiAibomComponent', () => {
  let component: AiAibomComponent;
  let fixture: ComponentFixture<AiAibomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiAibomComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiAibomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
