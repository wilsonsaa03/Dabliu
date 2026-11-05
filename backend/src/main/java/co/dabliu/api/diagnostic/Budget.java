package co.dabliu.api.diagnostic;

/** Debe coincidir con BUDGETS en dabliu-web/src/app/core/diagnostic.service.ts. Valores en COP. */
public enum Budget {
    UNKNOWN,
    UNDER_5M,
    FROM_5M_TO_15M,
    FROM_15M_TO_40M,
    OVER_40M
}
