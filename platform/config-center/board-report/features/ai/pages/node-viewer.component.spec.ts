import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NodeViewerComponent } from './node-viewer.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NodeViewerComponent', () => {
  let component: NodeViewerComponent;
  let fixture: ComponentFixture<NodeViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeViewerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(NodeViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
