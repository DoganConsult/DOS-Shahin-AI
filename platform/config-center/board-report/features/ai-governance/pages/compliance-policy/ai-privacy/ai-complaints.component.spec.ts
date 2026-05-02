import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiComplaintsComponent } from './ai-complaints.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiComplaintsComponent', () => {
  let component: AiComplaintsComponent;
  let fixture: ComponentFixture<AiComplaintsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiComplaintsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiComplaintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
