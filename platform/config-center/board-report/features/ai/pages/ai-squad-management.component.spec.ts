import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiSquadManagementComponent } from './ai-squad-management.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiSquadManagementComponent', () => {
  let component: AiSquadManagementComponent;
  let fixture: ComponentFixture<AiSquadManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSquadManagementComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiSquadManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
