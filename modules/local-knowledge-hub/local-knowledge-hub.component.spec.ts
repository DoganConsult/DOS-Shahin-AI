import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LocalKnowledgeHubComponent } from './local-knowledge-hub.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LocalKnowledgeHubComponent', () => {
  let component: LocalKnowledgeHubComponent;
  let fixture: ComponentFixture<LocalKnowledgeHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalKnowledgeHubComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(LocalKnowledgeHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
