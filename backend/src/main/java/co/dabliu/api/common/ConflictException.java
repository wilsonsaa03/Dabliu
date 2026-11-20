package co.dabliu.api.common;

/** El recurso ya existe o choca con otro (HTTP 409). */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
