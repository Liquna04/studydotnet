import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RealtimeReportComponent } from './realtime-report.component';

describe('RealtimeReportComponent', () => {
  let component: RealtimeReportComponent;
  let fixture: ComponentFixture<RealtimeReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RealtimeReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RealtimeReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
