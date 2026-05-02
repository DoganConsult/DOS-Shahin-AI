import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BpmnModelerComponent } from './bpmn-modeler.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BpmnModelerComponent', () => {
  let component: BpmnModelerComponent;
  let fixture: ComponentFixture<BpmnModelerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpmnModelerComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BpmnModelerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
