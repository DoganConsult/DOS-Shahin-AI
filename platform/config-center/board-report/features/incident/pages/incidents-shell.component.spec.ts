import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IncidentsShellComponent } from './incidents-shell.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('IncidentsShellComponent', () => {
  let component: IncidentsShellComponent;
  let fixture: ComponentFixture<IncidentsShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentsShellComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(IncidentsShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
