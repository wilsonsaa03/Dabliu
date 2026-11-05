import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { API_BASE_URL } from './api';

/** Los códigos coinciden con los enums que tendrá el backend en Java. */
export const SECTORS = [
  { value: 'TRANSPORT_LOGISTICS', label: 'Transporte y logística' },
  { value: 'COMMERCE_SERVICES', label: 'Comercio y servicios' },
  { value: 'AUTOMOTIVE_WORKSHOPS', label: 'Automotriz y talleres' },
  { value: 'OTHER', label: 'Otro sector' },
] as const;

export const BUDGETS = [
  { value: 'UNKNOWN', label: 'Aún no lo sé' },
  { value: 'UNDER_5M', label: 'Menos de $5 millones' },
  { value: 'FROM_5M_TO_15M', label: '$5 a $15 millones' },
  { value: 'FROM_15M_TO_40M', label: '$15 a $40 millones' },
  { value: 'OVER_40M', label: 'Más de $40 millones' },
] as const;

export type Sector = (typeof SECTORS)[number]['value'];
export type Budget = (typeof BUDGETS)[number]['value'];

/**
 * Contrato con la API: POST {API_BASE_URL}/api/v1/diagnostic-requests
 * Respuesta esperada: 201 Created. Cualquier error se trata como "no enviado".
 */
export interface DiagnosticRequest {
  fullName: string;
  company: string | null;
  phone: string;
  email: string | null;
  sector: Sector;
  budget: Budget;
  need: string;
  /** Autorización de tratamiento de datos (Ley 1581 de 2012). Siempre true. */
  dataConsent: true;
}

@Injectable({ providedIn: 'root' })
export class DiagnosticService {
  private http = inject(HttpClient);

  create(request: DiagnosticRequest): Observable<unknown> {
    return this.http.post(`${API_BASE_URL}/api/v1/diagnostic-requests`, request).pipe(timeout(15000));
  }
}
