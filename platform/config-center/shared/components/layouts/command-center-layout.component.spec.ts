import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CommandCenterLayoutComponent } from './command-center-layout.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CommandCenterLayoutComponent', () => {
  let component: CommandCenterLayoutComponent;
  let fixture: ComponentFixture<CommandCenterLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandCenterLayoutComponent], // Assuming standalone component
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

    fixture = TestBed.createComponent(CommandCenterLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
