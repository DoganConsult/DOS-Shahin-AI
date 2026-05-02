import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiStakeholdersComponent } from './ai-stakeholders.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiStakeholdersComponent', () => {
  let component: AiStakeholdersComponent;
  let fixture: ComponentFixture<AiStakeholdersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiStakeholdersComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiStakeholdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
