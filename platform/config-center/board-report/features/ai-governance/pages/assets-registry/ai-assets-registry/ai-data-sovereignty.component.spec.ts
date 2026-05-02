import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiDataSovereigntyComponent } from './ai-data-sovereignty.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiDataSovereigntyComponent', () => {
  let component: AiDataSovereigntyComponent;
  let fixture: ComponentFixture<AiDataSovereigntyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiDataSovereigntyComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiDataSovereigntyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
