import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EntityGraphComponent } from './entity-graph.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('EntityGraphComponent', () => {
  let component: EntityGraphComponent;
  let fixture: ComponentFixture<EntityGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityGraphComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(EntityGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
