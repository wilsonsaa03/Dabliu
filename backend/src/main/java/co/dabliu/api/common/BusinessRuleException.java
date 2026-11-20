package co.dabliu.api.common;

/** La operación es válida en forma pero viola una regla de negocio (HTTP 422). */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
