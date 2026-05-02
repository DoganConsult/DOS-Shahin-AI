import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationTeamsComponent } from './foundation-teams.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationTeamsComponent', () => {
  let component: FoundationTeamsComponent;
  let fixture: ComponentFixture<FoundationTeamsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationTeamsComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationTeamsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
