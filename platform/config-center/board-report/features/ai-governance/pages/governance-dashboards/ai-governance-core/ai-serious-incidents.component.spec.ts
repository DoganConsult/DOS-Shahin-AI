import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiSeriousIncidentsComponent } from './ai-serious-incidents.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiSeriousIncidentsComponent', () => {
  let component: AiSeriousIncidentsComponent;
  let fixture: ComponentFixture<AiSeriousIncidentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSeriousIncidentsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiSeriousIncidentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
