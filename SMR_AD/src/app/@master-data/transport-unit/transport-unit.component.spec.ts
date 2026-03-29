import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransportUnitComponent } from './transport-unit.component';

describe('TransportUnitComponent', () => {
  let component: TransportUnitComponent;
  let fixture: ComponentFixture<TransportUnitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransportUnitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransportUnitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
