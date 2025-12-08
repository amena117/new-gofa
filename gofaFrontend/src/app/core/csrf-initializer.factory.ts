// src/app/core/csrf-initializer.factory.ts

import { HttpClient } from '@angular/common/http';
import { APP_INITIALIZER } from '@angular/core';

export const csrfInitializerFactory = (http: HttpClient) => () =>
  http.get('/csrf/token').toPromise();

export const CsrfInitializerProvider = {
  provide: APP_INITIALIZER,
  useFactory: csrfInitializerFactory,
  deps: [HttpClient],
  multi: true
};