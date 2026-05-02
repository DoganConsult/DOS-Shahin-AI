import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BcpWidgetComponent } from './bcp-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('BcpWidgetComponent', () => {
  let component: BcpWidgetComponent;
  let fixture: ComponentFixture<BcpWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BcpWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(BcpWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
