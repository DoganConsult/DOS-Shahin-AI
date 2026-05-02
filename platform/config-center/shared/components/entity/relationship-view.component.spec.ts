import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RelationshipViewComponent } from './relationship-view.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('RelationshipViewComponent', () => {
  let component: RelationshipViewComponent;
  let fixture: ComponentFixture<RelationshipViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationshipViewComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(RelationshipViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
