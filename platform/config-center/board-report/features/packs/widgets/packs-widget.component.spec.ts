import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PacksWidgetComponent } from './packs-widget.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PacksWidgetComponent', () => {
  let component: PacksWidgetComponent;
  let fixture: ComponentFixture<PacksWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PacksWidgetComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(PacksWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
