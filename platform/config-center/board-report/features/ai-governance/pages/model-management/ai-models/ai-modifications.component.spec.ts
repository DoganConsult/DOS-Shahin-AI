import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AiModificationsComponent } from './ai-modifications.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AiModificationsComponent', () => {
  let component: AiModificationsComponent;
  let fixture: ComponentFixture<AiModificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModificationsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AiModificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
