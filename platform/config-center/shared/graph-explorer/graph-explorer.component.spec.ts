import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GraphExplorerComponent } from './graph-explorer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GraphExplorerComponent', () => {
  let component: GraphExplorerComponent;
  let fixture: ComponentFixture<GraphExplorerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphExplorerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(GraphExplorerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
