import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LocalKnowledgeDashboardComponent } from './local-knowledge-dashboard.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LocalKnowledgeDashboardComponent', () => {
  let component: LocalKnowledgeDashboardComponent;
  let fixture: ComponentFixture<LocalKnowledgeDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalKnowledgeDashboardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(LocalKnowledgeDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
