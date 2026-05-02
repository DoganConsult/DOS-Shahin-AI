import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportsHubShellComponent } from './reports-hub-shell.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ReportsHubShellComponent', () => {
  let component: ReportsHubShellComponent;
  let fixture: ComponentFixture<ReportsHubShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsHubShellComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(ReportsHubShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
