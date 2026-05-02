import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EntityLinkPanelComponent } from './entity-link-panel.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('EntityLinkPanelComponent', () => {
  let component: EntityLinkPanelComponent;
  let fixture: ComponentFixture<EntityLinkPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityLinkPanelComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(EntityLinkPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
