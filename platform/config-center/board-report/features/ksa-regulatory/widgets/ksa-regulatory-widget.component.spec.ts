import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KsaRegulatoryWidgetComponent } from './ksa-regulatory-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('KsaRegulatoryWidgetComponent', () => {
  let component: KsaRegulatoryWidgetComponent;
  let fixture: ComponentFixture<KsaRegulatoryWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KsaRegulatoryWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(KsaRegulatoryWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
