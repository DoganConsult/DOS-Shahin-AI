import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiEthicsBoardComponent } from './ai-ethics-board.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiEthicsBoardComponent', () => {
  let component: AiEthicsBoardComponent;
  let fixture: ComponentFixture<AiEthicsBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiEthicsBoardComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiEthicsBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
