import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FoundationCommitteesComponent } from './foundation-committees.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('FoundationCommitteesComponent', () => {
  let component: FoundationCommitteesComponent;
  let fixture: ComponentFixture<FoundationCommitteesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoundationCommitteesComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(FoundationCommitteesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
