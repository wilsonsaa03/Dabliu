import { Component, computed, input } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { LucideAngularModule, Check, Circle } from 'lucide-angular';

/** Mismas reglas que el backend (PasswordPolicy). El backend vuelve a validar siempre. */
export const PASSWORD_MIN = 10;

export function passwordChecks(value: string) {
  return [
    { label: `Al menos ${PASSWORD_MIN} caracteres`, ok: value.length >= PASSWORD_MIN },
    { label: 'Letras y números', ok: /\p{L}/u.test(value) && /\d/.test(value) },
  ];
}

export const strongPassword: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  passwordChecks(control.value ?? '').every((c) => c.ok) ? null : { weakPassword: true };

/** Valida que dos campos del grupo coincidan (contraseña y confirmación). */
export function matching(field: string, confirm: string): ValidatorFn {
  return (group) => (group.get(field)?.value === group.get(confirm)?.value ? null : { mismatch: true });
}

@Component({
  selector: 'app-password-rules',
  imports: [LucideAngularModule],
  template: `
    <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]" aria-label="Requisitos de la contraseña">
      @for (c of checks(); track c.label) {
        <li class="flex items-center gap-1.5 transition-colors" [class.text-ok]="c.ok" [class.text-fg-3]="!c.ok">
          <lucide-icon [img]="c.ok ? check : circle" [size]="13" />{{ c.label }}
        </li>
      }
    </ul>
  `,
})
export class PasswordRules {
  readonly value = input<string>('');
  readonly checks = computed(() => passwordChecks(this.value() ?? ''));
  readonly check = Check;
  readonly circle = Circle;
}
