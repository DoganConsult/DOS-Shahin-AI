import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SetupProgressPanelComponent } from './setup-progress-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('SetupProgressPanelComponent', () => {
  let component: SetupProgressPanelComponent;
  let fixture: ComponentFixture<SetupProgressPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupProgressPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(SetupProgressPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
