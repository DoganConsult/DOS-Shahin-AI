import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AutonomousConfigComponent } from './autonomous-config.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('AutonomousConfigComponent', () => {
  let component: AutonomousConfigComponent;
  let fixture: ComponentFixture<AutonomousConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutonomousConfigComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(AutonomousConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
