import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { BlankLayoutComponent } from './layouts/blank-layout/blank-layout.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { NotFoundComponent } from './layouts/not-found/not-found.component';
import { systemManagerRoutes } from './@system-manager/system-manager.routes';
import { masterDataRoutes } from './@master-data/master-data.routes';

import { orderRoutes } from './order/order.routes';
import { reportRoutes } from './report/report.routes';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent, canActivate: [] },
      { path: 'report', children: reportRoutes, canActivate: [] },
      // {path: 'meeting', component: MeetingComponent, canActivate: [AuthGuard]},
      { path: 'order', children: orderRoutes, canActivate: [] },
      {
        path: 'system-manager',
        children: systemManagerRoutes,
        canActivate: [],
      },
      {
        path: 'master-data',
        children: masterDataRoutes,
        canActivate: [],
      },
    ],
  },
  {
    path: '',
    component: BlankLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent, canActivate: [] },
    ],
  },

  // { path: 'meeting', component:  },

  { path: '**', component: NotFoundComponent },
];
