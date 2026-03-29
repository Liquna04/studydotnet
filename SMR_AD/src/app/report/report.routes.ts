import { Routes } from '@angular/router';
import { OrderReportComponent } from './order-report/order-report.component';
import { ReturnReportComponent } from './return-report/return-report.component';
import { RealtimeReportComponent } from './realtime-report/realtime-report.component';
export const reportRoutes: Routes = [
  { path: 'order-report', component: OrderReportComponent },
  { path: 'return-report', component: ReturnReportComponent },
  { path: 'realtime-report', component:  RealtimeReportComponent}
];
